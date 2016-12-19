'use strict';
var MACROUTILS = require( 'osg/Utils' );
var Manipulator = require( 'osgGA/Manipulator' );
var OrbitManipulator = require( 'osgGA/OrbitManipulator' );
var IntersectionVisitor = require( 'osgUtil/IntersectionVisitor' );
var LineSegmentIntersector = require( 'osgUtil/LineSegmentIntersector' );
var PolytopeIntersector = require( 'osgUtil/PolytopeIntersector' );
var ComputeMatrixFromNodePath = require( 'osg/computeMatrixFromNodePath' );
var mat4 = require( 'osg/glMatrix' ).mat4;
var vec2 = require( 'osg/glMatrix' ).vec2;
var vec3 = require( 'osg/glMatrix' ).vec3;
var quat = require( 'osg/glMatrix' ).quat;
var CADManipulatorStandardMouseKeyboardController = require( 'osgGA/CADManipulatorStandardMouseKeyboardController' );
var CADManipulatorHammerController = require( 'osgGA/CADManipulatorHammerController' );

/**
 *  CADManipulator
 *  @class Provides a manipulator with rotation and zoom capacities around a pivot point.
 *  The pivot point is computed through intersections. If no intersection is computed
 *  the manipulator uses the last computed pivot point.
 *  - Mousewheel/Pinch zooms in and out on the pivot point.
 *  - Double click/tap zooms in on the pivot point.
 *  - Left click/pan rotates around the pivot point.
 *  - Center/Right click or two-finger drag moves the view.
 *  - Spacebar resets the view.
 */

var CADManipulator = function () {
    Manipulator.call( this );
    this._tmpHomePosition = vec3.create();
    this._intersectionVisitor = new IntersectionVisitor();
    this._lineSegmentIntersector = new LineSegmentIntersector();
    this._polytopeIntersector = undefined;
    this._usePolytopeIntersector = false;
    this._dimensionMask = ( 1 << 2 );
    this.init();
};

CADManipulator.Interpolator = function () {
    this._current = vec2.create();
    this._target = vec2.create();
    this._delta = vec2.create();
    this._reset = false;
    this.reset();
    this._width = undefined;
    this._height = undefined;
};

CADManipulator.Interpolator.prototype = {
    setWidth: function ( width ) {
        this._width = width;
    },
    setHeight: function ( height ) {
        this._height = height;
    },
    reset: function () {
        for ( var i = 0, l = this._current.length; i < l; i++ ) {
            this._current[ i ] = this._target[ i ] = 0;
        }
        this._reset = true;
    },
    update: function () {
        var d0;
        var d1;
        if ( this._width === undefined ) d0 = 0;
        else d0 = ( this._target[ 0 ] - this._current[ 0 ] ) / this._width;
        this._delta[ 0 ] = d0;
        this._current[ 0 ] = this._target[ 0 ];
        if ( this._height === undefined ) d1 = 0;
        else d1 = ( this._target[ 1 ] - this._current[ 1 ] ) / this._height;
        this._delta[ 1 ] = d1;
        this._current[ 1 ] = this._target[ 1 ];
        return this._delta;
    },
    set: function () {
        for ( var i = 0, l = this._current.length; i < l; i++ ) {
            this._current[ i ] = this._target[ i ] = arguments[ i ];
        }
        this._reset = false;
    },
    isReset: function () {
        return this._reset;
    },
    getCurrent: function () {
        return this._current;
    },
    setTarget: function () {
        for ( var i = 0, l = this._target.length; i < l; i++ ) {
            if ( this._reset ) {
                this._target[ i ] = this._current[ i ] = arguments[ i ];
            } else {
                this._target[ i ] = arguments[ i ];
            }
        }
        this._reset = false;
    },
    addTarget: function () {
        for ( var i = 0; i < arguments.length; i++ ) {
            this._target[ i ] += arguments[ i ];
        }
    },
    getTarget: function () {
        return this._target;
    },
    getDelta: function () {
        return this._delta;
    }
};

CADManipulator.AvailableControllerList = [ 'StandardMouseKeyboard', 'Hammer' ];
CADManipulator.ControllerList = [ 'StandardMouseKeyboard', 'Hammer' ];

/** @lends CADManipulator.prototype */
CADManipulator.prototype = MACROUTILS.objectInherit( Manipulator.prototype, {
    init: function () {
        this._distance = 25.0;
        this._target = vec3.create();
        this._upz = vec3.fromValues( 0.0, 0.0, 1.0 );
        this._right = vec3.fromValues( 1.0, 0.0, 0.0 );

        vec3.init( this._target );

        var rot1 = mat4.fromRotation( mat4.create(), -Math.PI, this._upz );
        var rot2 = mat4.fromRotation( mat4.create(), Math.PI / 10.0, this._right );
        this._rotation = mat4.create();
        mat4.mul( this._rotation, rot1, rot2 );
        this._time = 0.0;

        this._rotate = new CADManipulator.Interpolator();
        this._pan = new CADManipulator.Interpolator();
        this._zoom = new OrbitManipulator.Interpolator( 1 );

        this._panFactor = 1.5;
        this._rotateFactor = 1;
        this._zoomFactor = 1;

        this._inverseMatrix = mat4.create();

        this._homeEye = undefined;
        this._homeCenter = undefined;
        this._homeUp = vec3.fromValues( 0.0, 0.0, 1.0 );

        this._orientation = quat.create();
        this._pivotPoint = vec3.create();

        this._eye = undefined;


        this._zoomDir = vec3.create();

        // instance of controller
        var self = this;

        CADManipulator.ControllerList.forEach( function ( value ) {
            if ( CADManipulator[ value ] !== undefined ) {
                self._controllerList[ value ] = new CADManipulator[ value ]( self );
            }
        } );
    },

    setViewer: function ( viewer ) {
        this._viewer = viewer;
    },

    reset: function () {
        this.init();
    },

    setNode: function ( node ) {
        this._node = node;
    },

    setPivotPoint: function ( pivotPoint ) {
        // First calculate offset
        vec3.copy( this._pivotPoint, pivotPoint );
    },

    setTarget: ( function () {
        var eyePos = vec3.create();
        return function ( target ) {
            vec3.copy( this._target, target );
            this.getEyePosition( eyePos );
            this._distance = vec3.distance( target, eyePos );
        };
    } )(),

    setEyePosition: function ( eye ) {
        vec3.copy( this._eye, eye );
        this._distance = vec3.distance( this._target, eye );
    },

    setHomePosition: function ( eye, center, up ) {
        this._homeEye = eye;
        this._homeCenter = center;
        this._homeUp = up;
    },

    computeHomePosition: ( function () {
        var f = vec3.create();
        var s = vec3.create();
        var u = vec3.create();
        var result = mat4.create();
        return function ( boundStrategy ) {

            var bs = this.getHomeBound( boundStrategy );
            if ( !bs ) return;
            debugger;
            this.setDistance( this.getHomeDistance( bs ) );
            this.setTarget( bs.center() );
            this.setPivotPoint( bs.center() );

            if ( this._homeEye === undefined ) {
                this._homeEye = vec3.create();
                this.getEyePosition( this._homeEye );
            }

            if ( this._homeCenter === undefined ) {
                this._homeCenter = vec3.create();
                vec3.copy( this._homeCenter, bs.center() );
            }

            if ( this._eye === undefined ) {
                this._eye = vec3.create();
            }

            vec3.copy( this._eye, this._homeEye );
            vec3.copy( this._target, this._homeCenter );
            vec3.copy( this._upz, this._homeUp );

            mat4.copy( result, this._rotation );
            var center = this._target;
            var eye = this._eye;

            vec3.sub( f, center, eye );
            vec3.normalize( f, f );

            vec3.cross( s, f, this._upz );
            vec3.normalize( s, s );

            vec3.cross( u, s, f );
            vec3.normalize( u, u );

            // s[0], f[0], u[0], 0.0,
            // s[1], f[1], u[1], 0.0,
            // s[2], f[2], u[2], 0.0,
            // 0,    0,    0,     1.0
            result[ 0 ] = s[ 0 ];
            result[ 1 ] = u[ 0 ];
            result[ 2 ] = -f[ 0 ];
            result[ 3 ] = 0.0;
            result[ 4 ] = s[ 1 ];
            result[ 5 ] = u[ 1 ];
            result[ 6 ] = -f[ 1 ];
            result[ 7 ] = 0.0;
            result[ 8 ] = s[ 2 ];
            result[ 9 ] = u[ 2 ];
            result[ 10 ] = -f[ 2 ];
            result[ 11 ] = 0.0;
            result[ 12 ] = 0;
            result[ 13 ] = 0;
            result[ 14 ] = 0;
            result[ 15 ] = 1.0;

            mat4.getRotation( this._orientation, result );
            quat.invert( this._orientation, this._orientation );
        };
    } )(),

    setZoomFactor: function ( f ) {
        this._zoomFactor = f;
    },

    setRotateFactor: function ( f ) {
        this._rotateFactor = f;
    },

    setPanFactor: function ( f ) {
        this._panFactor = f;
    },

    setDistance: function ( d ) {
        this._distance = d;
    },

    // If set to true, intersections are computed against points and lines
    setUsePolytopeIntersector: function ( upi ) {
        this._usePolytopeIntersector = upi;
    },

    getUsePolytopeIntersector: function () {
        return this._usePolytopeIntersector;
    },

    getDistance: function () {
        return this._distance;
    },

    zoom: function ( ratio ) {
        this._distance = ratio;
    },

    getRotateInterpolator: function () {
        return this._rotate;
    },

    getPanInterpolator: function () {
        return this._pan;
    },

    getZoomInterpolator: function () {
        return this._zoom;
    },

    getIntersectionVisitor: function () {
        return this._intersectionVisitor;
    },

    getLineSegmentIntersector: function () {
        return this._lineSegmentIntersector;
    },

    getOrCreatePolytopeIntersector: function () {
        if ( this._polytopeIntersector === undefined ) {
            this._polytopeIntersector = new PolytopeIntersector();
            this._polytopeIntersector.setIntersectionLimit( PolytopeIntersector.LIMIT_ONE_PER_DRAWABLE );
            this._polytopeIntersector.setDimensionMask( PolytopeIntersector.DimZero | PolytopeIntersector.DimOne );
        }
        return this._polytopeIntersector;
    },

    getTarget: function ( target ) {
        vec3.copy( target, this._target );
        return target;
    },

    getEyePosition: function ( eye ) {
        if ( this._eye === undefined )
            this.computeEyePosition( this._target, this._distance, eye );
        else vec3.copy( eye, this._eye );
    },

    computeEyePosition: ( function () {
        var tmpDist = vec3.create();
        var tmpInverse = mat4.create();
        return function ( target, distance, eye ) {
            mat4.invert( tmpInverse, this._rotation );
            tmpDist[ 1 ] = distance;
            vec3.transformMat4( eye, tmpDist, tmpInverse );
            vec3.add( eye, target, eye );
        };
    } )(),

    computePan: ( function () {
        var trans = vec3.create();
        var rotPos = vec3.create();
        var speedTmp = vec3.create();
        return function ( dx, dy, rotMat ) {
            var speed = vec3.length( vec3.sub( speedTmp, this._eye, this._pivotPoint ) ) / this._panFactor;
            if ( speed < 10 ) speed = 10;
            trans[ 0 ] = dx * speed / 2;
            trans[ 1 ] = dy * speed / 2;
            trans[ 2 ] = 0;
            vec3.transformMat4( rotPos, trans, rotMat );
            vec3.add( this._eye, this._eye, rotPos );
        };
    } )(),

    computeZoom: ( function () {
        var vectorDistance = vec3.create();
        var speedDist = vec3.create();
        return function ( dz ) {
            var zoomSpeed = dz * this._zoomFactor;
            vec3.sub( vectorDistance, this._pivotPoint, this._eye );
            vec3.add( this._eye, this._eye, vec3.scale( speedDist, vectorDistance, zoomSpeed ) );
        };
    } )(),

    computeRotation: ( function () {

        var rightNormalized = vec3.create();
        var right = vec3.create();
        var dir = vec3.create();
        var offset = vec3.create();
        var pitchQuat = quat.create();
        var yawQuat = quat.create();
        var pitchyawQuat = quat.create();
        var tmp = vec3.create();
        var rightScalar = vec3.create();

        return function ( yawDelta, pitchDelta ) {

            vec3.transformQuat( right, this._right, this._orientation );
            vec3.normalize( rightNormalized, right );
            vec3.sub( dir, this._eye, this._pivotPoint );
            var scalar = vec3.dot( rightNormalized, dir );
            vec3.sub( offset, dir, vec3.scale( rightScalar, rightNormalized, scalar ) );
            var xy = vec3.fromValues( -offset[ 0 ], -offset[ 1 ], 0 );

            var positionPitch = Math.atan2( -offset[ 2 ], vec3.length( xy ) );
            pitchDelta = Math.max( -Math.PI / 2 + 0.01, Math.min( Math.PI / 2 - 0.01, ( positionPitch + pitchDelta ) ) ) - positionPitch;

            quat.setAxisAngle( pitchQuat, right, pitchDelta * this._rotateFactor );
            quat.setAxisAngle( yawQuat, this._upz, yawDelta * this._rotateFactor );

            quat.mul( pitchyawQuat, yawQuat, pitchQuat );
            vec3.transformQuat( tmp, dir, pitchyawQuat );
            vec3.add( this._eye, tmp, this._pivotPoint );

            // Find rotation offset and target
            quat.mul( this._orientation, yawQuat, this._orientation );

            vec3.transformQuat( right, this._right, this._orientation );
            quat.setAxisAngle( pitchQuat, right, pitchDelta * this._rotateFactor );
            quat.mul( this._orientation, pitchQuat, this._orientation );
        };
    } )(),


    update: ( function () {
        var rotMat = mat4.create();
        var transMat = mat4.create();
        return function ( nv ) {

            var dt = nv.getFrameStamp().getDeltaTime();

            var mouseFactor = 10;
            //Note inverted y
            var delta = this._rotate.update();
            this.computeRotation( -delta[ 0 ] * mouseFactor, delta[ 1 ] * mouseFactor );
            mat4.fromQuat( rotMat, this._orientation );

            var deltapan = this._pan.update();
            this.computePan( -deltapan[ 0 ] * mouseFactor, -deltapan[ 1 ] * mouseFactor, rotMat );

            delta = this._zoom.update( dt );
            this.computeZoom( -delta[ 0 ] / 10.0 );

            mat4.fromTranslation( transMat, this._eye );
            mat4.mul( this._inverseMatrix, transMat, rotMat );
            mat4.invert( this._inverseMatrix, this._inverseMatrix );
        };
    } )(),
    getInverseMatrix: function () {
        return this._inverseMatrix;
    },

    computeIntersections: ( function () {
        var hits = [];
        var pTrans = vec3.create();
        return function ( pos ) {
            var viewer = this._camera.getView();

            var cam = this._camera;
            var width = cam.getViewport().width();
            var height = cam.getViewport().height();
            this._rotate.setWidth( width );
            this._rotate.setHeight( height );
            this._pan.setWidth( width );
            this._pan.setHeight( height );

            var point, matrix;
            if ( ( this._dimensionMask & ( 1 << 2 ) ) !== 0 ) {
                hits = viewer.computeIntersections( pos[ 0 ], pos[ 1 ] );

                if ( hits.length > 0 ) {
                    point = hits[ 0 ].point;
                    hits[ 0 ].nodepath.shift();
                    matrix = ComputeMatrixFromNodePath.computeLocalToWorld( hits[ 0 ].nodepath );
                    vec3.transformMat4( pTrans, point, matrix );
                    this.setPivotPoint( pTrans );
                }
            }

            if ( hits.length === 0 && this._usePolytopeIntersector ) {
                var pi = this.getOrCreatePolytopeIntersector();
                pi.reset();
                pi.setPolytopeFromWindowCoordinates( pos[ 0 ] - 5, pos[ 1 ] - 5, pos[ 0 ] + 5, pos[ 1 ] + 5 );
                var iv = this._intersectionVisitor;
                iv.setIntersector( pi );
                viewer.getCamera().accept( iv );
                hits = pi.getIntersections();
                hits.sort( function ( a, b ) {
                    return a._distance - b._distance;
                } );
                if ( hits.length > 0 ) {
                    point = hits[ 0 ]._center;
                    hits[ 0 ].nodePath.shift();
                    matrix = ComputeMatrixFromNodePath.computeLocalToWorld( hits[ 0 ].nodePath );
                    vec3.transformMat4( pTrans, point, matrix );
                    this.setPivotPoint( pTrans );
                }
            }
        };
    } )(),

    getPositionRelativeToCanvas: ( function () {
        var offset = vec2.create();
        var pos = vec2.create();
        return function ( x, y ) {
            var canvas = this._camera._graphicContext.canvas;
            this.getOffsetRect( canvas, offset );
            var ratioX = canvas.width / canvas.clientWidth;
            var ratioY = canvas.height / canvas.clientHeight;
            pos[ 0 ] = ( x - offset[ 1 ] ) * ratioX;
            pos[ 1 ] = ( canvas.clientHeight - ( y - offset[ 0 ] ) ) * ratioY;
            return pos;
        };
    } )(),

    getCanvasCenter: ( function () {
        var offset = vec2.create();
        var pos = vec2.create();
        return function () {
            var canvas = this._camera.getGraphicContext().canvas;
            this.getOffsetRect( canvas, offset );
            var ratioX = canvas.width / canvas.clientWidth;
            var ratioY = canvas.height / canvas.clientHeight;
            pos[ 0 ] = ( canvas.clientWidth / 2 ) * ratioX;
            pos[ 1 ] = ( canvas.clientHeight / 2 ) * ratioY;
            return pos;
        };
    } )(),

    getOffsetRect: function ( elem, offset ) {
        var box = elem.getBoundingClientRect();
        var body = document.body;
        var docElem = document.documentElement;
        var scrollTop = window.pageYOffset || docElem.scrollTop || body.scrollTop;
        var scrollLeft = window.pageXOffset || docElem.scrollLeft || body.scrollLeft;
        var clientTop = docElem.clientTop || body.clientTop || 0;
        var clientLeft = docElem.clientLeft || body.clientLeft || 0;
        var top = box.top + scrollTop - clientTop;
        var left = box.left + scrollLeft - clientLeft;
        offset[ 0 ] = Math.round( top );
        offset[ 1 ] = Math.round( left );
        return offset;
    }

} );

CADManipulator.StandardMouseKeyboard = CADManipulatorStandardMouseKeyboardController;
CADManipulator.Hammer = CADManipulatorHammerController;

module.exports = CADManipulator;
