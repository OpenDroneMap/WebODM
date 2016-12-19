'use strict';
var Map = require( 'osg/Map' );
var mat4 = require( 'osg/glMatrix' ).mat4;
var Notify = require( 'osg/notify' );
var Object = require( 'osg/Object' );
var Program = require( 'osg/Program' );
var StateAttribute = require( 'osg/StateAttribute' );
var Stack = require( 'osg/Stack' );
var Uniform = require( 'osg/Uniform' );
var MACROUTILS = require( 'osg/Utils' );
var WebGLCaps = require( 'osg/WebGLCaps' );


var checkUniformCache = [
    undefined,
    function uniformCheck1( uniformArray, cacheArray ) {
        if ( uniformArray[ 0 ] === cacheArray[ 0 ] ) return true;
        cacheArray[ 0 ] = uniformArray[ 0 ];
        return false;
    },

    function uniformCheck2( uniformArray, cacheArray ) {
        if ( uniformArray[ 0 ] === cacheArray[ 0 ] && uniformArray[ 1 ] === cacheArray[ 1 ] ) return true;
        cacheArray[ 0 ] = uniformArray[ 0 ];
        cacheArray[ 1 ] = uniformArray[ 1 ];
        return false;
    },

    function uniformCheck3( uniformArray, cacheArray ) {
        if ( uniformArray[ 0 ] === cacheArray[ 0 ] && uniformArray[ 1 ] === cacheArray[ 1 ] && uniformArray[ 2 ] === cacheArray[ 2 ] ) return true;
        cacheArray[ 0 ] = uniformArray[ 0 ];
        cacheArray[ 1 ] = uniformArray[ 1 ];
        cacheArray[ 2 ] = uniformArray[ 2 ];
        return false;
    },

    function uniformCheck4( uniformArray, cacheArray ) {
        if ( uniformArray[ 0 ] === cacheArray[ 0 ] && uniformArray[ 1 ] === cacheArray[ 1 ] && uniformArray[ 2 ] === cacheArray[ 2 ] && uniformArray[ 3 ] === cacheArray[ 3 ] ) return true;
        cacheArray[ 0 ] = uniformArray[ 0 ];
        cacheArray[ 1 ] = uniformArray[ 1 ];
        cacheArray[ 2 ] = uniformArray[ 2 ];
        cacheArray[ 3 ] = uniformArray[ 3 ];
        return false;
    }
];


var State = function ( shaderGeneratorProxy ) {
    Object.call( this );

    this._graphicContext = undefined;
    this._shaderGeneratorProxy = shaderGeneratorProxy;

    if ( shaderGeneratorProxy === undefined )
        console.break();

    this._currentVAO = null;
    this._currentIndexVBO = null;

    this.vertexAttribList = [];
    this.stateSets = new Stack();
    this._shaderGeneratorNames = new Stack();
    this.uniforms = new Map();

    this.textureAttributeMapList = [];

    this.attributeMap = new Map();

    this.modelMatrix = Uniform.createMatrix4( mat4.create(), 'uModelMatrix' );
    this.viewMatrix = Uniform.createMatrix4( mat4.create(), 'uViewMatrix' );
    this.modelViewMatrix = Uniform.createMatrix4( mat4.create(), 'uModelViewMatrix' );
    this.projectionMatrix = Uniform.createMatrix4( mat4.create(), 'uProjectionMatrix' );
    this.modelViewNormalMatrix = Uniform.createMatrix4( mat4.create(), 'uModelViewNormalMatrix' );

    // track uniform for color array enabled
    var arrayColorEnable = new Stack();
    arrayColorEnable.globalDefault = Uniform.createFloat1( 0.0, 'uArrayColorEnabled' );

    this.uniforms.setMap( {
        ArrayColorEnabled: arrayColorEnable
    } );


    this._previousColorAttribPair = {};
    this.vertexAttribMap = {};
    this.vertexAttribMap._disable = [];
    this.vertexAttribMap._keys = [];

    this._frameStamp = undefined;

    // we dont use Map because in this use case with a few entries
    // {} is faster
    this._programCommonUniformsCache = {};

    // keep pointer on the last applied modelview matrix
    this._modelViewMatrix = undefined;
    // keep pointer on the last applied projection matrix
    this._projectionMatrix = undefined;


    // keep track of last applied program
    this._program = undefined;
    // inject a default program to initialize the stack Program
    this.applyAttribute( new Program() );

    this._numPushStateSet = 0;
    this._numApply = 0;

    this._programUniformCache = [];
    this._cacheUniformId = 0;
};

State.prototype = MACROUTILS.objectLibraryClass( MACROUTILS.objectInherit( Object.prototype, {

    getCacheUniformsApplyRenderLeaf: function () {
        return this._programCommonUniformsCache;
    },

    setGraphicContext: function ( graphicContext ) {
        this._graphicContext = graphicContext;
        this._extVAO = WebGLCaps.instance( graphicContext ).getWebGLExtension( 'OES_vertex_array_object' );
    },

    getGraphicContext: function () {
        return this._graphicContext;
    },

    getShaderGeneratorProxy: function () {
        return this._shaderGeneratorProxy;
    },

    pushCheckOverride: function ( stack, object, maskValue ) {
        // object can be a Uniform, an Attribute, or a shader generator name
        if ( stack.values().length === 0 ) {
            stack.push( this.getObjectPair( object, maskValue ) );
        } else if ( ( stack.back().value & StateAttribute.OVERRIDE ) && !( maskValue & StateAttribute.PROTECTED ) ) {
            stack.push( stack.back() );
        } else {
            stack.push( this.getObjectPair( object, maskValue ) );
        }
    },

    pushStateSet: function ( stateset ) {
        this._numPushStateSet++;
        this.stateSets.push( stateset );

        if ( stateset.attributeMap ) {
            this.pushAttributeMap( this.attributeMap, stateset.attributeMap );
        }

        if ( stateset.textureAttributeMapList ) {
            var list = stateset.textureAttributeMapList;
            for ( var textureUnit = 0, l = list.length; textureUnit < l; textureUnit++ ) {
                if ( !list[ textureUnit ] ) {
                    continue;
                }

                var textureUnitAttributeMap = this.getOrCreateTextureAttributeMap( textureUnit );
                this.pushAttributeMap( textureUnitAttributeMap, list[ textureUnit ] );
            }
        }

        if ( stateset.uniforms ) {
            this.pushUniformsList( this.uniforms, stateset.uniforms );
        }
        var generatorPair = stateset.getShaderGeneratorPair();
        if ( generatorPair )
            this.pushCheckOverride( this._shaderGeneratorNames, generatorPair.getShaderGeneratorName(), generatorPair.getValue() );
    },

    getStateSetStackSize: function () {
        return this.stateSets.values().length;
    },

    insertStateSet: ( function () {
        var tmpStack = [];

        return function ( pos, stateSet ) {

            tmpStack.length = 0;
            var length = this.getStateSetStackSize();
            while ( length > pos ) {
                tmpStack.push( this.stateSets.back() );
                this.popStateSet();
                length--;
            }

            this.pushStateSet( stateSet );

            for ( var i = tmpStack.length - 1; i >= 0; i-- ) {
                this.pushStateSet( tmpStack[ i ] );
            }

        };
    } )(),

    removeStateSet: ( function () {
        var tmpStack = [];

        return function ( pos ) {

            var length = this.getStateSetStackSize();
            if ( pos >= length ) {
                Notify.warn( 'Warning State:removeStateSet ' + pos + ' out of range' );
                return;
            }

            tmpStack.length = 0;

            // record the StateSet above the one we intend to remove
            while ( length - 1 > pos ) {
                tmpStack.push( this.stateSets.back() );
                this.popStateSet();
                length--;
            }

            // remove the intended StateSet as well
            this.popStateSet();

            // push back the original ones that were above the remove StateSet
            for ( var i = tmpStack.length - 1; i >= 0; i-- ) {
                this.pushStateSet( tmpStack[ i ] );
            }

        };
    } )(),


    // needed because we use a cache during the frame to avoid
    // applying uniform or operation. At each frame we need to
    // invalidate those informations
    resetCacheFrame: function () {
        this._modelViewMatrix = this._projectionMatrix = undefined;
    },

    resetStats: function () {
        this._numApply = 0;
        this._numPushStateSet = 0;
    },

    // apply program if needed
    applyProgram: function ( program ) {
        if ( this._program === program ) return;
        this._program = program;
        this.getGraphicContext().useProgram( program );
    },

    applyModelViewMatrix: ( function () {

        var normal = mat4.create();

        return function StateApplyModelViewMatrix( matrix ) {

            if ( this._modelViewMatrix === matrix ) return false;

            var program = this.getLastProgramApplied();
            var uniformCache = program.getUniformsCache();
            var mu = this.modelViewMatrix;
            var mul = uniformCache.uModelViewMatrix;
            var gc = this.getGraphicContext();
            if ( mul ) {

                mu.setMatrix4( matrix );
                mu.apply( gc, mul );
            }

            var sendNormal;
            if ( this._modelViewMatrix ) {

                // check if we need to push normal
                // test rotation component, if not diff
                // we dont need to send normal
                var m2 = this._modelViewMatrix;
                for ( var i = 0; i < 11; i++ ) {
                    if ( matrix[ i ] !== m2[ i ] ) {
                        sendNormal = true;
                        break;
                    }
                }
            } else {
                sendNormal = true;
            }

            if ( sendNormal ) {
                mu = this.modelViewNormalMatrix;
                mul = uniformCache.uModelViewNormalMatrix;
                if ( mul ) {

                    normal[ 0 ] = matrix[ 0 ];
                    normal[ 1 ] = matrix[ 1 ];
                    normal[ 2 ] = matrix[ 2 ];
                    normal[ 4 ] = matrix[ 4 ];
                    normal[ 5 ] = matrix[ 5 ];
                    normal[ 6 ] = matrix[ 6 ];
                    normal[ 8 ] = matrix[ 8 ];
                    normal[ 9 ] = matrix[ 9 ];
                    normal[ 10 ] = matrix[ 10 ];

                    mat4.invert( normal, normal );
                    mat4.transpose( normal, normal );

                    mu.setMatrix4( normal );
                    mu.apply( gc, mul );
                }
            }

            this._modelViewMatrix = matrix;
            return true;
        };
    } )(),


    applyModelViewMatrixEperiment: ( function () {

        var normal = mat4.create();

        var checkMatrix = function ( m0, m1 ) {
            if ( m0[ 0 ] !== m1[ 0 ] ) return true;
            if ( m0[ 1 ] !== m1[ 1 ] ) return true;
            if ( m0[ 2 ] !== m1[ 2 ] ) return true;
            if ( m0[ 4 ] !== m1[ 4 ] ) return true;
            if ( m0[ 5 ] !== m1[ 5 ] ) return true;
            if ( m0[ 6 ] !== m1[ 6 ] ) return true;
            if ( m0[ 8 ] !== m1[ 8 ] ) return true;
            if ( m0[ 9 ] !== m1[ 9 ] ) return true;
            if ( m0[ 10 ] !== m1[ 10 ] ) return true;
            return false;
        };

        var epsilon = 1e-6;
        var scaleEpsilonMax = 1.0 + epsilon;
        var scaleEpsilonMin = 1.0 - epsilon;

        return function StateApplyModelViewMatrix( matrix ) {
            if ( this._modelViewMatrix === matrix ) return false;

            var program = this.getLastProgramApplied();

            var mu = this.modelViewMatrix;
            var mul = program.getUniformsCache().uModelViewMatrix;
            if ( mul ) {

                mu.setMatrix4( matrix );
                mu.apply( this.getGraphicContext(), mul );
            }

            var sendNormal = true;
            if ( this._modelViewMatrix ) {
                sendNormal = checkMatrix( matrix, this._modelViewMatrix );
                // check if we need to push normal
                // test rotation component, if not diff
                // we dont need to send normal
                // for ( var i = 0; i < 11; i++ ) {
                //     if ( matrix[ i ] !== this._modelViewMatrix[ i ] ) {
                //         sendNormal = true;
                //         break;
                //     }
                // }
            }

            if ( sendNormal ) {
                mu = this.modelViewNormalMatrix;
                mul = program.getUniformsCache().uModelViewNormalMatrix;
                if ( mul ) {

                    // mat4.copy( normal , matrix );
                    normal[ 0 ] = matrix[ 0 ];
                    normal[ 1 ] = matrix[ 1 ];
                    normal[ 2 ] = matrix[ 2 ];
                    normal[ 4 ] = matrix[ 4 ];
                    normal[ 5 ] = matrix[ 5 ];
                    normal[ 6 ] = matrix[ 6 ];
                    normal[ 8 ] = matrix[ 8 ];
                    normal[ 9 ] = matrix[ 9 ];
                    normal[ 10 ] = matrix[ 10 ];

                    // check for scaling
                    var xlen = normal[ 0 ] * normal[ 0 ] + normal[ 4 ] * normal[ 4 ] + normal[ 8 ] * normal[ 8 ];
                    var ylen = normal[ 1 ] * normal[ 1 ] + normal[ 5 ] * normal[ 5 ] + normal[ 9 ] * normal[ 9 ];
                    var zlen = normal[ 2 ] * normal[ 2 ] + normal[ 6 ] * normal[ 6 ] + normal[ 10 ] * normal[ 10 ];

                    // http://www.gamedev.net/topic/637192-detect-non-uniform-scaling-in-matrix/
                    if ( xlen > scaleEpsilonMax || xlen < scaleEpsilonMin ||
                        ylen > scaleEpsilonMax || ylen < scaleEpsilonMin ||
                        zlen > scaleEpsilonMax || zlen < scaleEpsilonMin ) {

                        mat4.invert( normal, normal );
                        mat4.transpose( normal, normal );
                    }

                    mu.setMatrix4( normal );
                    mu.apply( this.getGraphicContext(), mul );
                }
            }

            this._modelViewMatrix = matrix;
            return true;
        };
    } )(),

    applyProjectionMatrix: function ( matrix ) {

        if ( this._projectionMatrix === matrix ) return;

        this._projectionMatrix = matrix;
        var program = this.getLastProgramApplied();
        var mu = this.projectionMatrix;

        var mul = program.getUniformsCache()[ mu.getName() ];
        if ( mul ) {

            mu.setMatrix4( matrix );
            mu.apply( this.getGraphicContext(), mul );

        }
    },

    applyStateSet: function ( stateset ) {
        this.pushStateSet( stateset );
        this.apply();
        this.popStateSet();
    },

    popAllStateSets: function () {
        while ( this.stateSets.values().length ) {
            this.popStateSet();
        }
    },

    popStateSet: function () {

        if ( this.stateSets.empty() ) return;

        var stateset = this.stateSets.pop();

        if ( stateset.attributeMap ) {
            this.popAttributeMap( this.attributeMap, stateset.attributeMap );
        }

        if ( stateset.textureAttributeMapList ) {
            var list = stateset.textureAttributeMapList;
            for ( var textureUnit = 0, l = list.length; textureUnit < l; textureUnit++ ) {
                if ( !list[ textureUnit ] ) {
                    continue;
                }
                this.popAttributeMap( this.textureAttributeMapList[ textureUnit ], list[ textureUnit ] );
            }
        }

        if ( stateset.uniforms ) {
            this.popUniformsList( this.uniforms, stateset.uniforms );
        }

        if ( stateset.getShaderGeneratorPair() ) {
            this._shaderGeneratorNames.pop();
        }
    },

    _createAttributeStack: function ( attributeMap, key, globalDefault ) {

        var attributeStack = new Stack();

        attributeMap[ key ] = attributeStack;
        attributeMap[ key ].globalDefault = globalDefault;
        attributeMap.dirty();

        return attributeStack;

    },

    haveAppliedAttribute: function ( attribute ) {

        var key = attribute.getTypeMember();
        var attributeStack = this.attributeMap[ key ];
        if ( !attributeStack ) {
            attributeStack = this._createAttributeStack( this.attributeMap, key, attribute.cloneType() );
        }
        attributeStack.lastApplied = attribute;
        attributeStack.asChanged = true;

    },

    applyAttribute: function ( attribute ) {

        var key = attribute.getTypeMember();

        var attributeMap = this.attributeMap;
        var attributeStack = attributeMap[ key ];
        if ( !attributeStack ) {
            attributeStack = this._createAttributeStack( this.attributeMap, key, attribute.cloneType() );
        }

        if ( attributeStack.lastApplied !== attribute ) {

            if ( attribute.apply ) {
                attribute.apply( this );
            }
            attributeStack.lastApplied = attribute;
            attributeStack.asChanged = true;
        }
    },

    applyTextureAttribute: function ( unit, attribute ) {


        var gl = this.getGraphicContext();
        gl.activeTexture( gl.TEXTURE0 + unit );
        var key = attribute.getTypeMember();

        if ( !this.textureAttributeMapList[ unit ] ) {
            this.textureAttributeMapList[ unit ] = new Map();
        }

        var textureUnitAttributeMap = this.getOrCreateTextureAttributeMap( unit );
        var attributeStack = textureUnitAttributeMap[ key ];
        if ( !attributeStack ) {
            attributeStack = this._createAttributeStack( textureUnitAttributeMap, key, attribute.cloneType() );
        }


        if ( attributeStack.lastApplied !== attribute ) {

            if ( attribute.apply ) {

                // there is a texture we bind it.
                attribute.apply( this, unit );

                // TODO: optimization:
                // if attribute.isTextureNull()
                // only bind if last Framebuffer Texture Binded
                // are the same as those we try to write from
                // need rewrite of the fbo attachments system to keep history
                // and state to keep last fbo textures binded.
                // (applyTextureAttributeStack concerned too)
            }
            attributeStack.lastApplied = attribute;
            attributeStack.asChanged = true;
        }
    },

    getLastProgramApplied: function () {
        return this.attributeMap.Program.lastApplied;
    },

    applyDefault: function () {
        // reset GL State To Default
        // we skip the textures/uniforms/shaders call since they are not necessary

        // noticed that we accumulate lot of stack, maybe because of the stateGraph
        // CP: ^^ really ? check it / report an issue
        this.popAllStateSets();

        this.applyAttributeMap( this.attributeMap );
        this.applyTextureAttributeMapList( this.textureAttributeMapList );
    },

    apply: function () {

        var lastProgram = this.getLastProgramApplied();

        this.applyAttributeMap( this.attributeMap );
        this.applyTextureAttributeMapList( this.textureAttributeMapList );

        var generatedProgram = this._generateAndApplyProgram();

        if ( generatedProgram ) {
            // will cache uniform and apply them with the program

            this._applyGeneratedProgramUniforms( this.attributeMap.Program.lastApplied );

        } else {

            // custom program so we will iterate on uniform from the program and apply them
            // but in order to be able to use Attribute in the state graph we will check if
            // our program want them. It must be defined by the user
            this._applyCustomProgramUniforms( this.attributeMap.Program.lastApplied );

        }

        // reset reference of last applied matrix
        if ( lastProgram !== this.getLastProgramApplied() ) {
            this._modelViewMatrix = undefined;
            this._projectionMatrix = undefined;
        }
    },


    applyAttributeMap: function ( attributeMap ) {

        var attributeStack;
        var attributeMapKeys = attributeMap.getKeys();

        for ( var i = 0, l = attributeMapKeys.length; i < l; i++ ) {
            var key = attributeMapKeys[ i ];

            attributeStack = attributeMap[ key ];
            if ( !attributeStack || !attributeStack.asChanged ) {
                continue;
            }

            var attribute;
            if ( attributeStack.values().length === 0 ) {
                attribute = attributeStack.globalDefault;
            } else {
                attribute = attributeStack.back().object;
            }

            /*develblock:start*/
            Notify.assert( key === attribute.getTypeMember(), 'State:applyAttributeMap attribute key ' + key + ' !== ' + attribute.getTypeMember() );
            /*develblock:end*/


            if ( attributeStack.lastApplied !== attribute ) {

                if ( attribute.apply )
                    attribute.apply( this );

                attributeStack.lastApplied = attribute;

            }
            attributeStack.asChanged = false;

        }
    },

    getObjectPair: function ( object, value ) {
        return {
            object: object,
            value: value
        };
    },

    pushUniformsList: function ( uniformMap, stateSetUniformMap ) {
        /*jshint bitwise: false */
        var name;
        var uniform;

        var stateSetUniformMapKeys = stateSetUniformMap.getKeys();

        for ( var i = 0, l = stateSetUniformMapKeys.length; i < l; i++ ) {
            var key = stateSetUniformMapKeys[ i ];
            var uniformPair = stateSetUniformMap[ key ];
            uniform = uniformPair.getUniform();
            name = uniform.getName();
            if ( !uniformMap[ name ] ) {
                this._createAttributeStack( uniformMap, name, uniform );
            }

            this.pushCheckOverride( uniformMap[ name ], uniform, uniformPair.getValue() );
        }
        /*jshint bitwise: true */
    },

    popUniformsList: function ( uniformMap, stateSetUniformMap ) {

        var stateSetUniformMapKeys = stateSetUniformMap.getKeys();

        for ( var i = 0, l = stateSetUniformMapKeys.length; i < l; i++ ) {
            var key = stateSetUniformMapKeys[ i ];
            uniformMap[ key ].pop();
        }
    },


    // this funtion must called only if stack has changed
    // check applyTextureAttributeMapList
    _applyTextureAttributeStack: function ( gl, textureUnit, attributeStack ) {

        var attribute;
        if ( attributeStack.values().length === 0 ) {
            attribute = attributeStack.globalDefault;
        } else {
            attribute = attributeStack.back().object;
        }

        // if the the stack has changed but the last applied attribute is the same
        // then we dont need to apply it again
        if ( attributeStack.lastApplied !== attribute ) {

            gl.activeTexture( gl.TEXTURE0 + textureUnit );
            attribute.apply( this, textureUnit );

            attributeStack.lastApplied = attribute;
        }

        attributeStack.asChanged = false;
    },

    applyTextureAttributeMapList: function ( textureAttributesMapList ) {
        var gl = this._graphicContext;
        var textureAttributeMap;

        for ( var textureUnit = 0, l = textureAttributesMapList.length; textureUnit < l; textureUnit++ ) {
            textureAttributeMap = textureAttributesMapList[ textureUnit ];
            if ( !textureAttributeMap ) {
                continue;
            }


            var textureAttributeMapKeys = textureAttributeMap.getKeys();

            for ( var i = 0, lt = textureAttributeMapKeys.length; i < lt; i++ ) {
                var key = textureAttributeMapKeys[ i ];

                var attributeStack = textureAttributeMap[ key ];

                // skip if not stack or not changed in stack
                if ( !attributeStack || !attributeStack.asChanged ) continue;

                this._applyTextureAttributeStack( gl, textureUnit, attributeStack );
                // var attribute;
                // if ( attributeStack.values().length === 0 ) {
                //     attribute = attributeStack.globalDefault;
                // } else {
                //     attribute = attributeStack.back().object;
                // }
                // if ( attributeStack.asChanged ) {

                //     gl.activeTexture( gl.TEXTURE0 + textureUnit );
                //     attribute.apply( this, textureUnit );
                //     attributeStack.lastApplied = attribute;
                //     attributeStack.asChanged = false;

                // }
            }
        }
    },

    setGlobalDefaultValue: function ( attribute ) {
        Notify.log( 'setGlobalDefaultValue is deprecated, use instead setGlobalDefaultAttribute' );
        this.setGlobalDefaultAttribute( attribute );
    },

    setGlobalDefaultAttribute: function ( attribute ) {
        var typeMember = attribute.getTypeMember();
        var attributeMap = this.attributeMap;

        if ( attributeMap[ typeMember ] === undefined ) {
            this._createAttributeStack( attributeMap, typeMember, attribute );
        } else {
            attributeMap[ typeMember ].globalDefault = attribute;
        }
    },

    getGlobalDefaultAttribute: function ( typeMember ) {
        var attributeMap = this.attributeMap;
        if ( attributeMap[ typeMember ] === undefined ) return undefined;

        return attributeMap[ typeMember ].globalDefault;
    },

    setGlobalDefaultTextureAttribute: function ( unit, attribute ) {
        var attributeMap = this.getOrCreateTextureAttributeMap( unit );

        var typeMember = attribute.getTypeMember();

        if ( attributeMap[ typeMember ] === undefined ) {
            this._createAttributeStack( attributeMap, typeMember, attribute );
        } else {
            attributeMap[ typeMember ].globalDefault = attribute;
        }

    },

    getGlobalDefaultTextureAttribute: function ( unit, typeMember ) {
        var attributeMap = this.getOrCreateTextureAttributeMap( unit );
        var as = attributeMap[ typeMember ];
        return as.globalDefault;
    },

    getOrCreateTextureAttributeMap: function ( unit ) {
        if ( !this.textureAttributeMapList[ unit ] ) this.textureAttributeMapList[ unit ] = new Map();
        return this.textureAttributeMapList[ unit ];
    },

    pushAttributeMap: function ( attributeMap, stateSetAttributeMap ) {
        /*jshint bitwise: false */
        var attributeStack;
        var stateSetAttributeMapKeys = stateSetAttributeMap.getKeys();

        for ( var i = 0, l = stateSetAttributeMapKeys.length; i < l; i++ ) {

            var type = stateSetAttributeMapKeys[ i ];
            var attributePair = stateSetAttributeMap[ type ];
            var attribute = attributePair.getAttribute();

            if ( attributeMap[ type ] === undefined ) {
                this._createAttributeStack( attributeMap, type, attribute.cloneType() );
            }

            attributeStack = attributeMap[ type ];
            this.pushCheckOverride( attributeStack, attribute, attributePair.getValue() );
            attributeStack.asChanged = true;
        }
        /*jshint bitwise: true */
    },

    popAttributeMap: function ( attributeMap, stateSetAttributeMap ) {

        var attributeStack;
        var stateSetAttributeMapKeys = stateSetAttributeMap.getKeys();

        for ( var i = 0, l = stateSetAttributeMapKeys.length; i < l; i++ ) {

            var type = stateSetAttributeMapKeys[ i ];
            attributeStack = attributeMap[ type ];
            attributeStack.pop();
            attributeStack.asChanged = true;

        }
    },

    setIndexArray: function ( array ) {

        var gl = this._graphicContext;

        if ( this._currentIndexVBO !== array ) {
            array.bind( gl );
            this._currentIndexVBO = array;
        }

        if ( array.isDirty() ) {
            array.compile( gl );
        }

    },

    lazyDisablingOfVertexAttributes: function () {
        var keys = this.vertexAttribMap._keys;
        for ( var i = 0, l = keys.length; i < l; i++ ) {
            var attr = keys[ i ];
            if ( this.vertexAttribMap[ attr ] ) {
                this.vertexAttribMap._disable[ attr ] = true;
            }
        }
    },

    enableVertexColor: function () {

        var program = this.attributeMap.Program.lastApplied;

        if ( !program.getUniformsCache().uArrayColorEnabled ||
            !program.getAttributesCache().Color ) return; // no color uniform or attribute used, exit

        // update uniform
        var uniform = this.uniforms.ArrayColorEnabled.globalDefault;

        var previousColorEnabled = this._previousColorAttribPair[ program.getInstanceID() ];

        if ( !previousColorEnabled ) {
            uniform.setFloat( 1.0 );
            uniform.apply( this.getGraphicContext(), program.getUniformsCache().uArrayColorEnabled );
            this._previousColorAttribPair[ program.getInstanceID() ] = true;
        }

    },


    disableVertexColor: function () {

        var program = this.attributeMap.Program.lastApplied;

        if ( !program.getUniformsCache().uArrayColorEnabled ||
            !program.getAttributesCache().Color ) return; // no color uniform or attribute used, exit

        // update uniform
        var uniform = this.uniforms.ArrayColorEnabled.globalDefault;

        var previousColorEnabled = this._previousColorAttribPair[ program.getInstanceID() ];

        if ( previousColorEnabled ) {
            uniform.setFloat( 0.0 );
            uniform.apply( this.getGraphicContext(), program.getUniformsCache().uArrayColorEnabled );
            this._previousColorAttribPair[ program.getInstanceID() ] = false;
        }

    },


    applyDisablingOfVertexAttributes: function () {

        var keys = this.vertexAttribMap._keys;
        for ( var i = 0, l = keys.length; i < l; i++ ) {
            if ( this.vertexAttribMap._disable[ keys[ i ] ] === true ) {
                var attr = keys[ i ];
                this._graphicContext.disableVertexAttribArray( attr );
                this.vertexAttribMap._disable[ attr ] = false;
                this.vertexAttribMap[ attr ] = false;
            }
        }
    },

    clearVertexAttribCache: function () {

        var vertexAttribMap = this.vertexAttribMap;
        var keys = vertexAttribMap._keys;
        for ( var i = 0, l = keys.length; i < l; i++ ) {
            var attr = keys[ i ];
            vertexAttribMap[ attr ] = undefined;
            vertexAttribMap._disable[ attr ] = false;
        }

        this.vertexAttribMap._disable.length = 0;
        this.vertexAttribMap._keys.length = 0;

    },

    /**
     *  set a vertex array object.
     *  return true if binded the vao and false
     *  if was already binded
     */
    setVertexArrayObject: function ( vao ) {

        if ( this._currentVAO !== vao ) {

            this._extVAO.bindVertexArrayOES( vao );
            this._currentVAO = vao;

            // disable cache to force a re enable of array
            if ( !vao ) this.clearVertexAttribCache();

            // disable currentIndexVBO to force to bind indexArray from Geometry
            // if there is a change of vao
            this._currentIndexVBO = undefined;

            return true;
        }
        return false;
    },

    setVertexAttribArray: function ( attrib, array, normalize ) {

        var vertexAttribMap = this.vertexAttribMap;
        vertexAttribMap._disable[ attrib ] = false;
        var gl = this._graphicContext;
        var binded = false;

        if ( array.isDirty() ) {
            array.bind( gl );
            array.compile( gl );
            binded = true;
        }

        var currentArray = vertexAttribMap[ attrib ];
        if ( currentArray !== array ) {

            if ( !binded ) {
                array.bind( gl );
            }

            if ( !currentArray ) {
                gl.enableVertexAttribArray( attrib );

                // can be === false (so undefined check is important)
                if ( currentArray === undefined )
                    vertexAttribMap._keys.push( attrib );

            }

            vertexAttribMap[ attrib ] = array;
            gl.vertexAttribPointer( attrib, array.getItemSize(), array.getType(), normalize, 0, 0 );
        }
    },


    _getActiveUniformsFromProgramAttributes: function ( program, activeUniformsList ) {

        var attributeMapStack = this.attributeMap;

        var attributeKeys = program.getTrackAttributes().attributeKeys;

        if ( attributeKeys.length > 0 ) {

            for ( var i = 0, l = attributeKeys.length; i < l; i++ ) {

                var key = attributeKeys[ i ];
                var attributeStack = attributeMapStack[ key ];
                if ( attributeStack === undefined ) {
                    continue;
                }

                // we just need the uniform list and not the attribute itself
                var attribute = attributeStack.globalDefault;
                if ( attribute.getOrCreateUniforms === undefined ) {
                    continue;
                }

                var uniformMap = attribute.getOrCreateUniforms();
                var uniformKeys = uniformMap.getKeys();

                for ( var a = 0, b = uniformKeys.length; a < b; a++ ) {
                    activeUniformsList.push( uniformMap[ uniformKeys[ a ] ] );
                }
            }

        }
    },

    _getActiveUniformsFromProgramTextureAttributes: function ( program, activeUniformsList ) {

        var textureAttributeKeysList = program.getTrackAttributes().textureAttributeKeys;
        if ( textureAttributeKeysList === undefined ) return;

        for ( var unit = 0, nbUnit = textureAttributeKeysList.length; unit < nbUnit; unit++ ) {

            var textureAttributeKeys = textureAttributeKeysList[ unit ];
            if ( textureAttributeKeys === undefined ) continue;

            var unitTextureAttributeList = this.textureAttributeMapList[ unit ];
            if ( unitTextureAttributeList === undefined ) continue;

            for ( var i = 0, l = textureAttributeKeys.length; i < l; i++ ) {
                var key = textureAttributeKeys[ i ];

                var attributeStack = unitTextureAttributeList[ key ];
                if ( attributeStack === undefined ) {
                    continue;
                }
                // we just need the uniform list and not the attribute itself
                var attribute = attributeStack.globalDefault;
                if ( attribute.getOrCreateUniforms === undefined ) {
                    continue;
                }
                var uniformMap = attribute.getOrCreateUniforms();
                var uniformMapKeys = uniformMap.getKeys();

                for ( var a = 0, b = uniformMapKeys.length; a < b; a++ ) {
                    activeUniformsList.push( uniformMap[ uniformMapKeys[ a ] ] );
                }
            }
        }
    },

    _cacheUniformsForCustomProgram: function ( program, activeUniformsList ) {

        this._getActiveUniformsFromProgramAttributes( program, activeUniformsList );

        this._getActiveUniformsFromProgramTextureAttributes( program, activeUniformsList );

        var gl = this._graphicContext;

        // now we have a list on uniforms we want to track but we will filter them to use only what is needed by our program
        // not that if you create a uniforms whith the same name of a tracked attribute, and it will override it
        var uniformsFinal = new Map();

        for ( var i = 0, l = activeUniformsList.length; i < l; i++ ) {
            var u = activeUniformsList[ i ];
            var uniformName = u.getName();
            var loc = gl.getUniformLocation( program._program, uniformName );
            if ( loc !== undefined && loc !== null ) {
                uniformsFinal[ uniformName ] = u;
            }
        }
        uniformsFinal.dirty();
        program.trackUniforms = uniformsFinal;

    },

    _applyCustomProgramUniforms: ( function () {

        var activeUniformsList = [];

        return function ( program ) {

            // custom program so we will iterate on uniform from the program and apply them
            // but in order to be able to use Attribute in the state graph we will check if
            // our program want them. It must be defined by the user

            // first time we see attributes key, so we will keep a list of uniforms from attributes
            activeUniformsList.length = 0;

            // fill the program with cached active uniforms map from attributes and texture attributes
            if ( program.getTrackAttributes() !== undefined && program.trackUniforms === undefined ) {
                this._cacheUniformsForCustomProgram( program, activeUniformsList );
            }

            var programUniformMap = program.getUniformsCache();
            var programUniformKeys = programUniformMap.getKeys();
            var uniformMapStackContent = this.uniforms;

            var programTrackUniformMap;
            if ( program.trackUniforms )
                programTrackUniformMap = program.trackUniforms;

            var uniform;
            for ( var i = 0, l = programUniformKeys.length; i < l; i++ ) {
                var uniformKey = programUniformKeys[ i ];
                var location = programUniformMap[ uniformKey ];
                var uniformStack = uniformMapStackContent[ uniformKey ];

                if ( uniformStack === undefined ) {

                    if ( programTrackUniformMap !== undefined ) {
                        uniform = programTrackUniformMap[ uniformKey ];
                        if ( uniform !== undefined ) {
                            uniform.apply( this._graphicContext, location );
                        }
                    }

                } else {

                    if ( uniformStack.values().length === 0 ) {
                        uniform = uniformStack.globalDefault;
                    } else {
                        uniform = uniformStack.back().object;
                    }
                    uniform.apply( this._graphicContext, location );

                }
            }
        };
    } )(),


    // apply a generated program if necessary
    // It build a Shader from the shader generator
    // it apply for the following condition
    // the user has not put a Pogram in the stack or if he has he added one with OFF
    _generateAndApplyProgram: function () {

        var attributeMap = this.attributeMap;
        if ( attributeMap.Program !== undefined && attributeMap.Program.values().length !== 0 && attributeMap.Program.back().value !== StateAttribute.OFF )
            return undefined;

        // no custom program look into the stack of ShaderGenerator name
        // what we should use to generate a program

        var last = this._shaderGeneratorNames.back();
        var shaderGenerator = this._shaderGeneratorProxy.getShaderGenerator( last ? last.object : undefined );

        var program = shaderGenerator.getOrCreateProgram( this );
        this.applyAttribute( program );
        return program;
    },

    _computeForeignUniforms: function ( programUniformMap, activeUniformMap ) {

        var uniformMapKeys = programUniformMap.getKeys();
        var uniformMap = programUniformMap;

        var foreignUniforms = [];
        for ( var i = 0, l = uniformMapKeys.length; i < l; i++ ) {

            var name = uniformMapKeys[ i ];
            var location = uniformMap[ name ];

            if ( location !== undefined && activeUniformMap[ name ] === undefined ) {

                // filter 'standard' uniform matrix that will be applied for all shader
                if ( name !== this.modelViewMatrix.getName() &&
                    name !== this.modelMatrix.getName() &&
                    name !== this.viewMatrix.getName() &&
                    name !== this.projectionMatrix.getName() &&
                    name !== this.modelViewNormalMatrix.getName() &&
                    name !== 'uArrayColorEnabled' ) {
                    foreignUniforms.push( name );
                }
            }

        }

        return foreignUniforms;
    },

    _removeUniformsNotRequiredByProgram: function ( activeUniformMap, programUniformMap ) {

        var activeUniformMapKeys = activeUniformMap.getKeys();

        for ( var i = 0, l = activeUniformMapKeys.length; i < l; i++ ) {
            var name = activeUniformMapKeys[ i ];
            var location = programUniformMap[ name ];
            if ( location === undefined || location === null ) {
                delete activeUniformMap[ name ];
                activeUniformMap.dirty();
            }
        }
    },


    _cacheUniformsForGeneratedProgram: function ( program ) {

        var foreignUniforms = this._computeForeignUniforms( program.getUniformsCache(), program.getActiveUniforms() );
        program.setForeignUniforms( foreignUniforms );


        // remove uniforms listed by attributes (getActiveUniforms) but not required by the program
        this._removeUniformsNotRequiredByProgram( program.getActiveUniforms(), program.getUniformsCache() );

    },

    _copyUniformEntry: function ( uniform ) {

        var internalArray = uniform.getInternalArray();
        var cacheData;
        if ( internalArray.length < 16 )
            cacheData = new internalArray.constructor( internalArray.length );

        return cacheData;
    },

    _initUniformCache: function ( program ) {

        var activeUniformMap = program.getActiveUniforms();
        var activeUniformKeys = activeUniformMap.getKeys();

        var foreignUniformKeys = program.getForeignUniforms();
        var uniformMapStack = this.uniforms;

        var cacheForeignUniforms = [];
        var cacheActiveUniforms = [];

        var i, l, cache, name, cacheData, uniform;

        program._cacheUniformId = this._cacheUniformId++;
        this._programUniformCache[ program._cacheUniformId ] = {};

        if ( foreignUniformKeys.length ) {
            cache = cacheForeignUniforms;
            for ( i = 0, l = foreignUniformKeys.length; i < l; i++ ) {
                name = foreignUniformKeys[ i ];
                var uniStack = uniformMapStack[ name ];
                if ( uniStack ) {
                    uniform = uniStack.globalDefault;
                    cacheData = this._copyUniformEntry( uniform );
                    cache.push( cacheData );
                }

            }
        }

        if ( activeUniformKeys.length ) {
            cache = cacheActiveUniforms;
            for ( i = 0, l = activeUniformKeys.length; i < l; i++ ) {
                name = activeUniformKeys[ i ];
                uniform = activeUniformMap[ name ];
                cacheData = this._copyUniformEntry( uniform );
                cache.push( cacheData );
            }
        }

        this._programUniformCache[ program._cacheUniformId ].foreign = cacheForeignUniforms;
        this._programUniformCache[ program._cacheUniformId ].active = cacheActiveUniforms;

    },

    _checkCacheAndApplyUniform: function ( uniform, cacheArray, i, programUniformMap, name ) {
        var isCached;
        var internalArray = uniform.getInternalArray();
        var uniformArrayLength = internalArray.length;
        if ( uniformArrayLength <= 4 ) {
            var uniformCache = cacheArray[ i ];
            isCached = checkUniformCache[ uniformArrayLength ]( internalArray, uniformCache );
        } else {
            isCached = false;
        }

        if ( !isCached ) {
            var location = programUniformMap[ name ];
            uniform.apply( this._graphicContext, location );
        }
    },

    // note that about TextureAttribute that need uniform on unit we would need to improve
    // the current uniformList ...

    // when we apply the shader for the first time, we want to compute the active uniforms for this shader and the list of uniforms not extracted from attributes called foreignUniforms
    _applyGeneratedProgramUniforms: function ( program ) {

        var foreignUniformKeys = program.getForeignUniforms();
        if ( !foreignUniformKeys ) {
            this._cacheUniformsForGeneratedProgram( program );
            foreignUniformKeys = program.getForeignUniforms();

            this._initUniformCache( program );
        }

        var programUniformMap = program.getUniformsCache();
        var activeUniformMap = program.getActiveUniforms();

        var cacheUniformsActive = this._programUniformCache[ program._cacheUniformId ].active;
        var cacheUniformsForeign = this._programUniformCache[ program._cacheUniformId ].foreign;

        // apply active uniforms
        // caching uniforms from attribtues make it impossible to overwrite uniform with a custom uniform instance not used in the attributes
        var i, l, name, uniform;
        var activeUniformKeys = activeUniformMap.getKeys();

        this.nbApplyUniform += activeUniformKeys.length;
        for ( i = 0, l = activeUniformKeys.length; i < l; i++ ) {

            name = activeUniformKeys[ i ];
            uniform = activeUniformMap[ name ];

            this._checkCacheAndApplyUniform( uniform, cacheUniformsActive, i, programUniformMap, name );
        }

        var uniformMapStack = this.uniforms;

        // apply now foreign uniforms, it's uniforms needed by the program but not contains in attributes used to generate this program
        for ( i = 0, l = foreignUniformKeys.length; i < l; i++ ) {
            name = foreignUniformKeys[ i ];
            var uniformStack = uniformMapStack[ name ];
            if ( uniformStack !== undefined ) {
                if ( uniformStack.values().length === 0 ) {
                    uniform = uniformStack.globalDefault;
                    Notify.warn( 'Uniform Default Not attached to a StateSet in Scene Hierarchy: ' + uniformStack.globalDefault.getName() );
                } else {
                    uniform = uniformStack.back().object;
                }
            }

            this._checkCacheAndApplyUniform( uniform, cacheUniformsForeign, i, programUniformMap, name );

        }
    },

    // Use to detect changes in RenderLeaf between call to avoid to applyStateSet
    _setStateSetsDrawID: function ( id ) {
        var values = this.stateSets.values();
        for ( var i = 0, nbStateSets = values.length; i < nbStateSets; i++ ) {
            values[ i ].setDrawID( id );
        }
    },

    _stateSetStackChanged: function ( id, nbLast ) {
        var values = this.stateSets.values();
        var nbStateSets = values.length;
        if ( nbLast !== nbStateSets )
            return true;

        for ( var i = 0; i < nbStateSets; i++ ) {
            if ( id !== values[ i ].getDrawID() )
                return true;
        }

        return false;
    }


} ), 'osg', 'State' );

module.exports = State;
