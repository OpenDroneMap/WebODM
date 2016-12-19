'use strict';
var Notify = require( 'osg/notify' );
var mat4 = require( 'osg/glMatrix' ).mat4;
var Options = require( 'osg/Options' );
var P = require( 'bluebird' );
var Timer = require( 'osg/Timer' );
var TimerGPU = require( 'osg/TimerGPU' );
var UpdateVisitor = require( 'osg/UpdateVisitor' );
var MACROUTILS = require( 'osg/Utils' );
var Texture = require( 'osg/Texture' );
var OrbitManipulator = require( 'osgGA/OrbitManipulator' );
var createStats = require( 'osgViewer/createStats' );
var EventProxy = require( 'osgViewer/eventProxy/eventProxy' );
var View = require( 'osgViewer/View' );
var WebGLUtils = require( 'osgViewer/webgl-utils' );
var WebGLDebugUtils = require( 'osgViewer/webgl-debug' );
var requestFile = require( 'osgDB/requestFile' );


var OptionsURL = ( function () {
    var options = {};
    ( function ( options ) {
        var vars = [],
            hash;
        if ( !window.location.search ) return;

        // slice(1) to remove leading '?'
        var hashes = window.location.search.slice( 1 ).split( '&' );
        for ( var i = 0; i < hashes.length; i++ ) {
            hash = hashes[ i ].split( '=' );
            var element = hash[ 0 ];
            vars.push( element );
            var result = hash[ 1 ];
            if ( result === undefined ) {
                result = '1';
            }
            options[ element ] = result;
        }
    } )( options );

    if ( options.log !== undefined ) {
        var level = options.log.toLowerCase();

        switch ( level ) {
        case 'debug':
            Notify.setNotifyLevel( Notify.DEBUG );
            break;
        case 'info':
            Notify.setNotifyLevel( Notify.INFO );
            break;
        case 'notice':
            Notify.setNotifyLevel( Notify.NOTICE );
            break;
        case 'warn':
            Notify.setNotifyLevel( Notify.WARN );
            break;
        case 'error':
            Notify.setNotifyLevel( Notify.ERROR );
            break;
        case 'html':
            ( function () {
                var logContent = [];
                var divLogger = document.createElement( 'div' );
                var codeElement = document.createElement( 'pre' );
                document.addEventListener( 'DOMContentLoaded', function () {
                    document.body.appendChild( divLogger );
                    divLogger.appendChild( codeElement );
                } );
                var logFunc = function ( str ) {
                    logContent.unshift( str );
                    codeElement.innerHTML = logContent.join( '\n' );
                };
                divLogger.style.overflow = 'hidden';
                divLogger.style.position = 'absolute';
                divLogger.style.zIndex = '10000';
                divLogger.style.height = '100%';
                divLogger.style.maxWidth = '600px';
                codeElement.style.overflow = 'scroll';
                codeElement.style.width = '105%';
                codeElement.style.height = '100%';
                codeElement.style.fontSize = '10px';

                [ 'log', 'error', 'warn', 'info', 'debug' ].forEach( function ( value ) {
                    window.console[ value ] = logFunc;
                } );
            } )();
            break;
        }
    }

    return options;
} )();


var getGLSLOptimizer = function () {

    var deferOptimizeGLSL = P.defer();
    window.deferOptimizeGLSL = deferOptimizeGLSL;

    var mod = [
        '        var Module = {',
        '            preRun: [],',
        '            postRun: [ function () {',
        '                var func = Module.cwrap( "optimize_glsl", "string", [ "string", "number", "number" ] );',
        '                window.deferOptimizeGLSL.resolve( func );',
        '            } ],',
        '            print: function ( text ) {',
        '                Notify.debug( text );',
        '            },',
        '            printErr: function ( text ) {',
        '                Notify.debug( text );',
        '            },',
        '            setStatus: function ( text ) {',
        '                Notify.debug( text );',
        '            },',
        '            totalDependencies: 0,',
        '            monitorRunDependencies: function ( left ) {',
        '                this.totalDependencies = Math.max( this.totalDependencies, left );',
        '                Module.setStatus( left ? "GLSL optimizer preparing... (" + ( this.totalDependencies - left ) + "/" + this.totalDependencies + ")" : "All downloads complete." );',
        '            },',
        '            memoryInitializerPrefixURL: "https://raw.githubusercontent.com/zz85/glsl-optimizer/gh-pages/"',
        '        };'
    ].join( '\n' );

    Notify.log( 'try to load glsl optimizer' );
    var url = 'https://raw.githubusercontent.com/zz85/glsl-optimizer/gh-pages/glsl-optimizer.js';
    var promise = requestFile( url );
    promise.then( function ( script ) {
        /*jshint evil: true */
        eval( mod + script );
        /*jshint evil: false */
    } ).catch( function () {
        deferOptimizeGLSL.reject();
    } );

    return deferOptimizeGLSL.promise;
};

var Viewer = function ( canvas, userOptions, error ) {
    View.call( this );

    this._startTick = Timer.instance().tick();
    this._stats = undefined;
    this._done = false;
    this._runPromise = P.resolve();

    var options = this.initOptions( userOptions );
    var gl = this.initWebGLContext( canvas, options, error );

    if ( !gl )
        throw 'No WebGL implementation found';

    // this MACROUTILS.init(); should be removed and replace by something
    // more natural
    MACROUTILS.init();

    this.initDeviceEvents( options, canvas );
    this.initStats( options, canvas );
    this.initRun( options );
    this._updateVisitor = new UpdateVisitor();

    this.setUpView( gl.canvas, options );

    this._hmd = null;
    this._requestAnimationFrame = window.requestAnimationFrame.bind( window );

    this._contextLost = false;
};


Viewer.prototype = MACROUTILS.objectInherit( View.prototype, {

    initDeviceEvents: function ( options, canvas ) {

        // default argument for mouse binding
        var defaultMouseEventNode = options.mouseEventNode || canvas;

        var eventsBackend = options.EventBackend || {};
        if ( !options.EventBackend ) options.EventBackend = eventsBackend;
        eventsBackend.StandardMouseKeyboard = options.EventBackend.StandardMouseKeyboard || {};
        var mouseEventNode = eventsBackend.StandardMouseKeyboard.mouseEventNode || defaultMouseEventNode;
        eventsBackend.StandardMouseKeyboard.mouseEventNode = mouseEventNode;
        eventsBackend.StandardMouseKeyboard.keyboardEventNode = eventsBackend.StandardMouseKeyboard.keyboardEventNode || document;

        // hammer, Only activate it if we have a touch device in order to fix problems with IE11
        if ( 'ontouchstart' in window ) {
            eventsBackend.Hammer = eventsBackend.Hammer || {};
            eventsBackend.Hammer.eventNode = eventsBackend.Hammer.eventNode || defaultMouseEventNode;
        }
        // gamepad
        eventsBackend.GamePad = eventsBackend.GamePad || {};

        this._eventProxy = this.initEventProxy( options );
    },

    initOptions: function ( userOptions ) {
        // use default options
        var options = new Options();

        if ( userOptions ) {
            // user options override by user options
            options.extend( userOptions );
        }

        // if url options override url options
        options.extend( OptionsURL );

        // Activate global trace on log call
        if ( options.getBoolean( 'traceLogCall' ) === true ) Notify.traceLogCall = true;

        // Check if Frustum culling is enabled to calculate the clip planes
        if ( options.getBoolean( 'enableFrustumCulling' ) === true )
            this.getCamera().getRenderer().getCullVisitor().setEnableFrustumCulling( true );


        return options;
    },

    initWebGLContext: function ( canvas, options, error ) {

        // #FIXME see tojiro's blog for webgl lost context stuffs
        if ( options.get( 'SimulateWebGLLostContext' ) ) {
            canvas = WebGLDebugUtils.makeLostContextSimulatingCanvas( canvas );
            canvas.loseContextInNCalls( options.get( 'SimulateWebGLLostContext' ) );
        }

        var gl = WebGLUtils.setupWebGL( canvas, options, error );

        canvas.addEventListener( 'webglcontextlost', function ( event ) {
            this.contextLost();
            event.preventDefault();
        }.bind( this ), false );

        canvas.addEventListener( 'webglcontextrestored', function () {
            this.contextRestored();
        }.bind( this ), false );

        if ( Notify.reportWebGLError || options.get( 'reportWebGLError' ) ) {
            gl = WebGLDebugUtils.makeDebugContext( gl );
        }

        this.initWebGLCaps( gl );
        this.setGraphicContext( gl );

        return gl;
    },

    initRun: function ( options ) {

        if ( options.getBoolean( 'GLSLOptimizer' ) === true ) {

            var Shader = require( 'osg/Shader' );
            Shader.enableGLSLOptimizer = true;

            this._runPromise = getGLSLOptimizer();
            this._runPromise.then( function ( glslOptimizer ) {
                Shader.glslOptimizer = glslOptimizer;
                if ( Shader.glslOptimizer )
                    Notify.log( 'uses glsl optimizer, use ?log=info to see shader output' );
                else
                    Notify.error( 'failed to load glsl optimizer' );
            } ).catch( function ( error ) {
                Notify.error( error );
            } );
        }

    },

    setContextLostCallback: function ( cb ) {
        this._contextLostCallback = cb;
        // just in case callback registration
        // happens after the context lost
        if ( this._contextLost ) {
            cb();
        }
    },

    contextLost: function () {
        Notify.log( 'webgl context lost' );
        if ( this._contextLostCallback ) {
            this._contextLostCallback();
        }
        this._contextLost = true;
        window.cancelAnimationFrame( this._requestID );
    },

    contextRestored: function () {
        Notify.log( 'webgl context restored, but not supported - reload the page' );
        // Supporting it implies to have
        // reloaded all your resources:
        // textures, vertex/index buffers, shaders, frame buffers
        // so only set it back if you happen to have restored the context
        // this._contextLost = false;
    },

    init: function () {
        //this._done = false;
    },

    getUpdateVisitor: function () {
        return this._updateVisitor;
    },

    getState: function () {
        return this.getCamera().getRenderer().getState();
    },

    initStats: function ( options ) {

        var timerGPU = TimerGPU.instance( this.getGraphicContext() );

        if ( !options.getBoolean( 'stats' ) ) {
            timerGPU.disable();
            return;
        }

        this._stats = createStats( options );

        timerGPU.setCallback( this.callbackTimerGPU.bind( this ) );
    },

    callbackTimerGPU: function ( average, queryID ) {
        if ( this._stats ) this._stats.rStats( queryID ).set( average / 1e6 );
    },

    getViewerStats: function () {
        return this._stats;
    },

    renderingTraversal: function () {

        if ( this.getScene().getSceneData() )
            this.getScene().getSceneData().getBound();


        if ( this.getCamera() ) {

            var stats = this._stats;
            var timerGPU = TimerGPU.instance( this.getGraphicContext() );

            var renderer = this.getCamera().getRenderer();

            if ( stats ) stats.rStats( 'cull' ).start();

            renderer.cull();

            if ( stats ) stats.rStats( 'cull' ).end();

            timerGPU.pollQueries();
            timerGPU.start( 'glframe' );

            if ( stats ) {
                stats.rStats( 'render' ).start();
            }

            renderer.draw();

            if ( stats ) {
                stats.rStats( 'render' ).end();
            }

            timerGPU.end( 'glframe' );

            if ( stats ) {
                var cullVisitor = renderer.getCullVisitor();
                stats.rStats( 'cullcamera' ).set( cullVisitor._numCamera );
                stats.rStats( 'cullmatrixtransform' ).set( cullVisitor._numMatrixTransform );
                stats.rStats( 'cullprojection' ).set( cullVisitor._numProjection );
                stats.rStats( 'cullnode' ).set( cullVisitor._numNode );
                stats.rStats( 'cullightsource' ).set( cullVisitor._numLightSource );
                stats.rStats( 'cullgeometry' ).set( cullVisitor._numGeometry );
                stats.rStats( 'pushstateset' ).set( renderer.getState()._numPushStateSet );
            }

        }

    },


    updateTraversal: function () {

        var stats = this._stats;

        if ( stats ) stats.rStats( 'update' ).start();

        // update the scene
        this._updateVisitor.resetStats();
        this.getScene().updateSceneGraph( this._updateVisitor );

        if ( stats ) stats.rStats( 'updatecallback' ).set( this._updateVisitor._numUpdateCallback );

        // Remove ExpiredSubgraphs from DatabasePager
        this.getDatabasePager().releaseGLExpiredSubgraphs( 0.005 );
        // In OSG this.is deferred until the draw traversal, to handle multiple contexts
        this.flushDeletedGLObjects( 0.005 );

        if ( stats ) stats.rStats( 'update' ).end();

    },

    advance: function ( simulationTime ) {

        var sTime = simulationTime;

        if ( sTime === undefined )
            sTime = Number.MAX_VALUE;

        var frameStamp = this._frameStamp;
        var previousFrameNumber = frameStamp.getFrameNumber();

        frameStamp.setFrameNumber( previousFrameNumber + 1 );

        var deltaS = Timer.instance().deltaS( this._startTick, Timer.instance().tick() );
        frameStamp.setReferenceTime( deltaS );

        var lastSimulationTime = frameStamp.getSimulationTime();
        frameStamp.setSimulationTime( sTime === Number.MAX_VALUE ? deltaS : sTime ); // set simul time
        frameStamp.setDeltaTime( frameStamp.getSimulationTime() - lastSimulationTime ); // compute delta since last tick

    },

    beginFrame: function () {

        var stats = this._stats;

        if ( stats ) {
            stats.rStats( 'frame' ).start();
            stats.glS.start();

            stats.rStats( 'rAF' ).tick();
            stats.rStats( 'FPS' ).frame();
        }

    },

    endFrame: function () {

        var frameNumber = this.getFrameStamp().getFrameNumber();

        var stats = this._stats;
        var rStats = stats ? stats.rStats : undefined;

        // update texture stats
        if ( rStats ) {
            Texture.getTextureManager( this.getGraphicContext() ).updateStats( frameNumber, rStats );
            rStats( 'frame' ).end();

            rStats( 'rStats' ).start();
            rStats().update();
            rStats( 'rStats' ).end();
        }

    },

    checkNeedToDoFrame: function () {
        return this._requestContinousUpdate || this._requestRedraw;
    },

    frame: function () {

        // _contextLost check for code calling viewer::frame directly
        // (likely force preload gl resource or direct render control )
        if ( this._contextLost ) return;

        this.beginFrame();

        this.advance();

        // update viewport if a resize occured
        var canvasSizeChanged = this.updateViewport();

        // update inputs devices
        this.updateEventProxy( this._eventProxy, this.getFrameStamp() );

        // setup framestamp
        this._updateVisitor.setFrameStamp( this.getFrameStamp() );
        // Update Manipulator/Event
        if ( this.getManipulator() ) {
            this.getManipulator().update( this._updateVisitor );
            mat4.copy( this.getCamera().getViewMatrix(), this.getManipulator().getInverseMatrix() );
        }

        if ( this.checkNeedToDoFrame() || canvasSizeChanged ) {
            this._requestRedraw = false;
            this.updateTraversal();
            this.renderingTraversal();
        }

        this.endFrame();

        // submit frame to vr headset
        if ( this._hmd && this._hmd.isPresenting )
            this._hmd.submitFrame();
    },

    setDone: function ( bool ) {
        this._done = bool;
    },

    done: function () {
        return this._done;
    },

    _runImplementation: function () {
        var self = this;
        var render = function () {
            if ( !self.done() ) {
                self._requestID = self._requestAnimationFrame( render, self.getGraphicContext().canvas );
                self.frame();
            }
        };
        render();
    },

    run: function () {

        var self = this;
        this._runPromise.then( function () {
            self._runImplementation();
        } ).catch( function () {
            self._runImplementation();
        } );

    },

    setVRDisplay: function ( hmd ) {
        this._hmd = hmd;
        this._requestAnimationFrame = hmd.requestAnimationFrame.bind( hmd );
    },

    getVRDisplay: function () {
        return this._hmd;
    },

    setPresentVR: function ( bool ) {
        if ( !this._hmd ) {
            Notify.warn( 'no hmd device provided to the viewer!' );
            return P.reject();
        }

        // reset position/orientation of hmd device
        if ( !this._hmd.capabilities.hasPosition )
            this._hmd.resetPose();

        if ( !this._hmd.capabilities.canPresent )
            return P.reject();

        if ( bool ) {
            var layers = [ {
                source: this.getGraphicContext().canvas
            } ];
            return this._hmd.requestPresent( layers );

        } else {
            return this._hmd.exitPresent();
        }
    },

    setupManipulator: function ( manipulator /*, dontBindDefaultEvent */ ) {
        if ( manipulator === undefined ) {
            manipulator = new OrbitManipulator();
        }

        if ( manipulator.setNode !== undefined ) {
            manipulator.setNode( this.getSceneData() );
        } else {
            // for backward compatibility
            manipulator.view = this;
        }

        manipulator.setCamera( this.getCamera() );
        this.setManipulator( manipulator );
    },


    // updateViewport
    updateViewport: function () {

        var gl = this.getGraphicContext();
        var canvas = gl.canvas;

        var hasChanged = this.computeCanvasSize( canvas );
        if ( !hasChanged )
            return false;

        var camera = this.getCamera();
        var vp = camera.getViewport();

        var prevWidth = vp.width();
        var prevHeight = vp.height();

        var widthChangeRatio = canvas.width / prevWidth;
        var heightChangeRatio = canvas.height / prevHeight;
        var aspectRatioChange = widthChangeRatio / heightChangeRatio;
        vp.setViewport( Math.round( vp.x() * widthChangeRatio ), Math.round( vp.y() * heightChangeRatio ), Math.round( vp.width() * widthChangeRatio ), Math.round( vp.height() * heightChangeRatio ) );

        if ( aspectRatioChange !== 1.0 ) {
            mat4.mul( camera.getProjectionMatrix(), camera.getProjectionMatrix(), mat4.fromScaling( mat4.create(), [ 1.0 / aspectRatioChange, 1.0, 1.0 ] ) );
        }

        return true;
    },

    // intialize all input devices
    initEventProxy: function ( argsObject ) {
        var args = argsObject || {};
        var deviceEnabled = {};

        var lists = EventProxy;
        var argumentEventBackend = args.EventBackend;


        // loop on each devices and try to initialize it
        var keys = window.Object.keys( lists );
        for ( var i = 0, l = keys.length; i < l; i++ ) {
            var device = keys[ i ];

            // check if the config has a require
            var initialize = true;
            var argDevice = {};
            if ( argumentEventBackend && ( argumentEventBackend[ device ] !== undefined ) ) {
                var bool = argumentEventBackend[ device ].enable;
                initialize = bool !== undefined ? bool : true;
                argDevice = argumentEventBackend[ device ];
            }

            // extend argDevice with regular options eg:
            // var options = {
            //     EventBackend: {
            //         Hammer: {
            //             drag_max_touches: 4,
            //             transform_min_scale: 0.08,
            //             transform_min_rotation: 180,
            //             transform_always_block: true
            //         }
            //     },
            //     zoomscroll: false
            // };

            // to options merged:
            // var options = {
            //     drag_max_touches: 4,
            //     transform_min_scale: 0.08,
            //     transform_min_rotation: 180,
            //     transform_always_block: true,
            //     zoomscroll: false
            // };
            //
            var options = new Options();
            options.extend( argDevice ).extend( argsObject );
            delete options.EventBackend;

            if ( initialize ) {
                var inputDevice = new lists[ device ]( this );
                inputDevice.init( options );
                deviceEnabled[ device ] = inputDevice;
            }
        }
        return deviceEnabled;
    },
    updateEventProxy: function ( list, frameStamp ) {
        var keys = window.Object.keys( list );
        keys.forEach( function ( key ) {
            var device = list[ key ];
            if ( device.update )
                device.update( frameStamp );
        } );
    },

    setManipulator: function ( manipulator ) {

        if ( this._manipulator )
            this.removeEventProxy();

        if ( !manipulator.getCamera() )
            manipulator.setCamera( this.getCamera() );

        View.prototype.setManipulator.call( this, manipulator );
    },

    removeEventProxy: function () {
        var list = this._eventProxy;
        var keys = window.Object.keys( list );
        keys.forEach( function ( key ) {
            var device = list[ key ];
            if ( device.remove )
                device.remove();
        } );
    },

    getEventProxy: function () {
        return this._eventProxy;
    }

} );

module.exports = Viewer;
