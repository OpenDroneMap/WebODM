'use strict';
var Camera = require( 'osg/Camera' );
var CullVisitor = require( 'osg/CullVisitor' );
var BlendFunc = require( 'osg/BlendFunc' );
var ComputeBoundsVisitor = require( 'osg/ComputeBoundsVisitor' );
var Depth = require( 'osg/Depth' );
var FrameBufferObject = require( 'osg/FrameBufferObject' );
var mat4 = require( 'osg/glMatrix' ).mat4;
var MatrixTransform = require( 'osg/MatrixTransform' );
var Notify = require( 'osg/notify' );
var Shape = require( 'osg/shape' );
var StateAttribute = require( 'osg/StateAttribute' );
var StateSet = require( 'osg/StateSet' );
var Debug = require( 'osgUtil/debug' );
var Texture = require( 'osg/Texture' );
var Transform = require( 'osg/Transform' );
var Uniform = require( 'osg/Uniform' );
var MACROUTILS = require( 'osg/Utils' );
var PrimitiveSet = require( 'osg/primitiveSet' );
var vec3 = require( 'osg/glMatrix' ).vec3;
var vec4 = require( 'osg/glMatrix' ).vec4;
var Viewport = require( 'osg/Viewport' );
var WebGLCaps = require( 'osg/WebGLCaps' );
var ShadowReceiveAttribute = require( 'osgShadow/ShadowReceiveAttribute' );
var ShadowCasterVisitor = require( 'osgShadow/ShadowCasterVisitor' );
var ShadowFrustumIntersection = require( 'osgShadow/ShadowFrustumIntersection' );
var ShadowCastAttribute = require( 'osgShadow/ShadowCastAttribute' );
var ShadowTechnique = require( 'osgShadow/ShadowTechnique' );
var ShadowTexture = require( 'osgShadow/ShadowTexture' );


// Custom camera cull callback
// we customize it just to avoid to add extra 'virtual' function
// on the shadowTecnique class
var CameraCullCallback = function ( shadowTechnique ) {
    this._shadowTechnique = shadowTechnique;
};

CameraCullCallback.prototype = {
    cull: function ( node, nv ) {

        this._shadowTechnique.getShadowedScene().nodeTraverse( nv );

        var cs = nv.getCurrentCullingSet();
        var m = nv.getCurrentProjectionMatrix();
        var near = nv.getComputedNear(),
            far = nv.getComputedFar();

        mat4.getFrustumPlanes( cs.getFrustum().getPlanes(), m, nv.getCurrentModelViewMatrix(), false );
        cs.getFrustum().setupMask( 6 );

        this._shadowTechnique.setLightFrustum( cs.getFrustum(), near, far );


        return false;
    }
};

/**
 *  ShadowMap provides an implementation of shadow textures.
 *  @class ShadowMap
 */
var ShadowMap = function ( settings ) {
    ShadowTechnique.call( this );

    this._projectionMatrix = mat4.create();
    this._viewMatrix = mat4.create();

    this._lightUp = vec3.fromValues( 0.0, 0.0, 1.0 );

    this._light = settings.light;

    // data
    this._cameraShadow = new Camera();
    this._cameraShadow.setCullCallback( new CameraCullCallback( this ) );
    this._cameraShadow.setRenderOrder( Camera.PRE_RENDER, 0 );
    this._cameraShadow.setReferenceFrame( Transform.ABSOLUTE_RF );
    this._cameraShadow.setClearColor( vec4.fromValues( 1.0, 1.0, 1.0, 1.0 ) );

    this._texture = new ShadowTexture();
    this._textureUnitBase = 4;
    this._textureUnit = this._textureUnitBase;

    // see shadowSettings.js header for param explanations
    this._textureMagFilter = undefined;
    this._textureMinFilter = undefined;
    this._textureSize = 256;

    this._receivingStateset = undefined;

    this._casterStateSet = new StateSet();
    this._casterStateSet.addUniform( Uniform.createFloat1( 0, 'exponent0' ) );
    this._casterStateSet.addUniform( Uniform.createFloat1( 0, 'exponent1' ) );
    this._casterStateSet.addUniform( Uniform.createFloat1( 0.005, 'bias' ) );

    this._texelSizeUniform = Uniform.createFloat1( 1.0 / this._textureSize, 'texelSize' );
    this._casterStateSet.addUniform( this._texelSizeUniform );

    var unifRenderSize = Uniform.createFloat2( 'RenderSize' );
    this._casterStateSet.addUniform( unifRenderSize );
    this._renderSize = unifRenderSize.getInternalArray();
    this._renderSize[ 0 ] = this._renderSize[ 1 ] = this._textureSize;

    // make sure no unintended blend happens
    // if casting semi-transparent (alphablend material with full opaque pixels) shadow
    this._casterStateSet.setAttributeAndModes( new Depth( Depth.LESS ), StateAttribute.ON | StateAttribute.OVERRIDE );
    this._casterStateSet.setAttributeAndModes( new BlendFunc(), StateAttribute.ON | StateAttribute.OVERRIDE );

    this._shadowReceiveAttribute = new ShadowReceiveAttribute( this._light.getLightNumber() );
    this._casterStateSet.setAttributeAndModes( this._shadowReceiveAttribute, StateAttribute.ON | StateAttribute.OVERRIDE );

    // default name, overridable with shadow settings
    this._shadowCastShaderGeneratorName = 'ShadowCast';


    var near = 0.001;
    var far = 1000;
    var unifRange = Uniform.createFloat4( 'uShadowDepthRange' );
    this._casterStateSet.addUniform( unifRange );
    this._depthRange = unifRange.getInternalArray();
    this._depthRange[ 0 ] = near;
    this._depthRange[ 1 ] = far;
    this._depthRange[ 2 ] = far - near;
    this._depthRange[ 3 ] = 1.0 / ( far - near );

    this._worldLightPos = vec4.create();
    this._worldLightPos[ 3 ] = 0;
    this._worldLightDir = vec4.create();
    this._worldLightDir[ 3 ] = 1;

    this._castsShadowDrawTraversalMask = 0xffffffff;
    this._castsShadowBoundsTraversalMask = 0xffffffff;


    this._shaderProcessor = undefined;

    // tmp variables
    this._tmpVec = vec3.create();
    this._tmpVecBis = vec3.create();
    this._tmpVecTercio = vec3.create();
    this._tmpMatrix = mat4.create();

    if ( settings )
        this.setShadowSettings( settings );

    this._computeFrustumBounds = new ShadowFrustumIntersection();
    this._computeBoundsVisitor = new ComputeBoundsVisitor();

    // Overridable Visitor so that user can override the visitor to enable disable
    // in its own shadowmap implementation
    // settings.userShadowCasterVisitor:
    // - undefined means using default
    // - false means no removal visitor needed
    // - otherwise must be an instance of a class inherited from shadowCaster
    if ( settings.userShadowCasterVisitor !== false ) {

        this._removeNodesNeverCastingVisitor = settings.userShadowCasterVisitor || new ShadowCasterVisitor( this._castsShadowTraversalMask );

    }

    this._infiniteFrustum = true;
    var shadowStateAttribute = new ShadowCastAttribute( false, this._shadowReceiveAttribute );

    this._casterStateSet.setAttributeAndModes( shadowStateAttribute, StateAttribute.ON | StateAttribute.OVERRIDE );
    this._casterStateSet.setShaderGeneratorName( this._shadowCastShaderGeneratorName, StateAttribute.OVERRIDE | StateAttribute.ON );

    this._debug = false;
};


/** @lends ShadowMap.prototype */
ShadowMap.prototype = MACROUTILS.objectLibraryClass( MACROUTILS.objectInherit( ShadowTechnique.prototype, {

    getDepthRange: function () {
        return this._depthRange;
    },
    setLightFrustum: function ( lf, near, far ) {

        this._lightFrustum = lf;

        this._depthRange[ 0 ] = near;
        this._depthRange[ 1 ] = far;
        this.nearFarBounding();

        if ( this._debug ) {

            this._debugGeomFrustum.updateGeometry( this._projectionMatrix, this._depthRange );
            mat4.invert( this._debugNodeFrustum.getMatrix(), this._viewMatrix );

        }

    },
    getCamera: function () {
        return this._cameraShadow;
    },

    getTexture: function () {
        return this._texture;
    },

    isDirty: function () {
        return this._dirty;
    },
    /**
     * at which Texture unit number we start adding texture shadow
     */
    setTextureUnitBase: function ( unitBase ) {
        this._textureUnitBase = unitBase;
        this._textureUnit = unitBase;
    },

    /* Sets  shadowSettings
     */
    setShadowSettings: function ( shadowSettings ) {

        if ( !shadowSettings )
            return;

        this._light = shadowSettings.light;
        this._shadowCastShaderGeneratorName = shadowSettings.getShadowCastShaderGeneratorName();

        this.setCastsShadowDrawTraversalMask( shadowSettings.castsShadowDrawTraversalMask );
        this.setCastsShadowBoundsTraversalMask( shadowSettings.castsShadowBoundsTraversalMask );

        this.setLight( this._light );
        this.setTextureSize( shadowSettings.textureSize );
        this.setTexturePrecision( shadowSettings.textureType );

        this.setFakePCF( shadowSettings.fakePCF );
        this.setRotateOffset( shadowSettings.rotateOffset );
        this.setKernelSizePCF( shadowSettings.kernelSizePCF );
        this.setAlgorithm( shadowSettings.algorithm );
        this.setBias( shadowSettings.bias );
        this.setExponent0( shadowSettings.exponent );
        this.setExponent1( shadowSettings.exponent1 );
        this.setEpsilonVSM( shadowSettings.epsilonVSM );


    },

    setCastsShadowDrawTraversalMask: function ( mask ) {
        this._castsShadowDrawTraversalMask = mask;
    },

    getCastsShadowDrawTraversalMask: function () {
        return this._castsDrawShadowTraversalMask;
    },

    setCastsShadowBoundsTraversalMask: function ( mask ) {
        this._castsShadowBoundsTraversalMask = mask;
    },

    getCastsShadowBoundsTraversalMask: function () {
        return this._castsShadowBoundsTraversalMask;
    },


    getBias: function () {
        return this._shadowReceiveAttribute.getBias();
    },

    setBias: function ( value ) {
        this._shadowReceiveAttribute.setBias( value );
        this._casterStateSet.getUniformList()[ 'bias' ].getUniform().setFloat( value );
    },

    getExponent0: function () {
        return this._shadowReceiveAttribute.getExponent0();
    },

    setExponent0: function ( value ) {
        this._shadowReceiveAttribute.setExponent0( value );
        this._casterStateSet.getUniformList()[ 'exponent0' ].getUniform().setFloat( value );
    },

    getExponent1: function () {
        return this._shadowReceiveAttribute.getExponent1();
    },

    setExponent1: function ( value ) {
        this._shadowReceiveAttribute.setExponent1( value );
        this._casterStateSet.getUniformList()[ 'exponent1' ].getUniform().setFloat( value );
    },

    getEpsilonVSM: function () {
        return this._shadowReceiveAttribute.getEpsilonVSM();
    },

    setEpsilonVSM: function ( value ) {
        this._shadowReceiveAttribute.setEpsilonVSM( value );
    },

    getKernelSizePCF: function () {
        return this._shadowReceiveAttribute.getKernelSizePCF();
    },

    setKernelSizePCF: function ( value ) {
        this._shadowReceiveAttribute.setKernelSizePCF( value );
    },

    getFakePCF: function () {
        return this._shadowReceiveAttribute.getFakePCF();
    },

    setFakePCF: function ( value ) {
        if ( this._shadowReceiveAttribute.getFakePCF() !== value ) {
            this._shadowReceiveAttribute.setFakePCF( value );
            this.setTextureFiltering();
        }
    },

    getRotateOffset: function () {
        return this._shadowReceiveAttribute.getRotateOffset();
    },

    setRotateOffset: function ( value ) {
        if ( this._shadowReceiveAttribute.getRotateOffset() !== value ) {
            this._shadowReceiveAttribute.setRotateOffset( value );
        }
    },

    setShadowedScene: function ( shadowedScene ) {
        ShadowTechnique.prototype.setShadowedScene.call( this, shadowedScene );
        this._receivingStateset = this._shadowedScene.getReceivingStateSet();
        this.dirty();
    },

    checkLightNumber: function () {
        var lightNumber = this._light.getLightNumber();

        // if light number changed we need to remove cleanly
        // attributes from receiveStateSet
        // it's because it use a typemember like light attribute
        // so the number if very important to keep State clean
        if ( this._shadowReceiveAttribute.getLightNumber() !== lightNumber ) {
            if ( this._receivingStateset.getAttribute( this._shadowReceiveAttribute.getTypeMember() ) === this._shadowReceiveAttribute )
                this._receivingStateset.removeAttribute( this._shadowReceiveAttribute.getTypeMember() );
        }

        /*develblock:start*/
        Notify.assert( this._shadowReceiveAttribute.getTypeMember() === this._shadowReceiveAttribute.attributeType + lightNumber, 'TypeMember isnt reflecting light number' + this._shadowReceiveAttribute.getTypeMember() + ' !== ' + this._shadowReceiveAttribute.attributeType + lightNumber );
        /*develblock:end*/


        if ( this._texture && this._texture.getLightUnit() !== lightNumber ) {
            // remove this._texture, but not if it's not this._texture
            if ( this._receivingStateset.getTextureAttribute( this._textureUnit, this._texture.getTypeMember() ) === this._texture )
                this._receivingStateset.removeTextureAttribute( this._textureUnit, this._texture.getTypeMember() );
        }

    },

    /** initialize the ShadowedScene and local cached data structures.*/
    init: function () {

        if ( !this._shadowedScene ) return;

        this._filledOnce = false;

        this.checkLightNumber();

        if ( !this._cameraShadow ) {
            this._cameraShadow = new Camera();
            this._cameraShadow.setCullCallback( new CameraCullCallback( this ) );
            this._cameraShadow.setRenderOrder( Camera.PRE_RENDER, 0 );
            this._cameraShadow.setReferenceFrame( Transform.ABSOLUTE_RF );
            this._cameraShadow.setClearColor( vec4.fromValues( 1.0, 1.0, 1.0, 1.0 ) );
        }

        this.initTexture();

        var lightNumber = this._light.getLightNumber();
        this._textureUnit = this._textureUnitBase + lightNumber;
        this._cameraShadow.setName( 'light_shadow_camera' + this._light.getName() );

        this._texture.setLightUnit( lightNumber );
        this._texture.setName( 'ShadowTexture' + this._textureUnit );

        this._shadowReceiveAttribute.setLightNumber( lightNumber );


        // Idea is to make sure the null texture is "binded" to all shadow casting scene
        // so we override all existing texture bind in the scene, preventing any texture bind.
        // When user implements alpha mask casting, they use PROTECTED to prevent OVERRIDE to remove their alpha mask texture needed.
        var fullOverride = StateAttribute.OVERRIDE | StateAttribute.ON;


        this._receivingStateset.setAttributeAndModes( this._shadowReceiveAttribute, fullOverride );

        // prevent unnecessary texture bindings
        this._preventTextureBindingDuringShadowCasting();

        // Mandatory: prevent binding shadow textures themselves
        // ( ShadowedScene StateSet is applied  just above in StateSet hierarchy)
        // that would mean undefined values as it would be read/write access...
        // So we force it against Texture.null binding done just above (PROTECTED)
        // and Prevent any under hierarchy bind with OVERRIDE
        // must be done AFTER the prevent binding.
        this._casterStateSet.setTextureAttributeAndModes( this._textureUnit, Texture.textureNull, StateAttribute.PROTECTED );


        // add shadow texture to the receivers
        // should make sure somehow that
        // alpha blender transparent receiver doesn't use it
        // compiler wise at least
        this._receivingStateset.setTextureAttributeAndModes( this._textureUnit, this._texture, fullOverride );

        this._dirty = false;
    },
    // Make sure we don't bind texture and thus make GPU work for nothing
    // as shadow casting just output Depth ( no color )
    // os we set a null texture and OVERRIDE StateAttribute flag
    // only case you want to use a texture is
    // alpha masked material, then you have StateAttribute to 'PROTECTED'
    _preventTextureBindingDuringShadowCasting: function () {

        // prevent unnecessary texture bindings on all texture unit
        var shouldGetMaxTextureUnits = WebGLCaps.instance().getWebGLParameter( 'MAX_TEXTURE_IMAGE_UNITS' );
        for ( var k = 0; k < shouldGetMaxTextureUnits; k++ ) {
            // bind  null texture which OSGJS will not bind,
            // effectively preventing any other texture bind
            // just not touching texture unit state.
            this._casterStateSet.setTextureAttributeAndModes( k, Texture.textureNull, StateAttribute.OVERRIDE | StateAttribute.ON );
        }

    },
    valid: function () {
        // checks
        return true;
    },

    updateShadowTechnique: function ( /*nv*/) {

        var camera = this._cameraShadow;
        var texture = this._texture;

        if ( camera && texture ) {

            var vp = camera.getViewport();
            if ( !vp ) {
                vp = new Viewport();
                camera.setViewport( vp );
            }

            // if texture size changed update the camera rtt params
            if ( vp.width() !== texture.getWidth() ||
                vp.height() !== texture.getHeight() ) {

                camera.detachAll();

                camera.attachTexture( FrameBufferObject.COLOR_ATTACHMENT0, texture );
                camera.attachRenderBuffer( FrameBufferObject.DEPTH_ATTACHMENT, FrameBufferObject.DEPTH_COMPONENT16 );

                camera.getViewport().setViewport( 0, 0, texture.getWidth(), texture.getHeight() );
            }
        }
    },

    updateShadowTechnic: function ( /*nv*/) {
        Notify.log( 'ShadowMap.updateShadowTechnic() is deprecated, use updateShadowTechnique instead' );
        this.updateShadowTechnique();
    },

    setTextureFiltering: function () {

        var textureType, texFilterMin, texFilterMag;
        var texType = this.getTexturePrecision();
        if ( this._texture ) {
            // see shadowSettings.js header
            switch ( this.getAlgorithm() ) {
            case 'ESM':
            case 'VSM':
            case 'EVSM':
                texFilterMin = Texture.LINEAR;
                texFilterMag = Texture.LINEAR;
                break;

            default:
            case 'PCF':
            case 'NONE':
                if ( this.getFakePCF() ) {
                    texFilterMin = Texture.LINEAR;
                    texFilterMag = Texture.LINEAR;

                    // // TODO try anisotropy with better biaspcf
                    // texFilterMin = Texture.LINEAR_MIPMAP_LINEAR;
                    // texFilterMag = Texture.LINEAR_MIPMAP_LINEAR;
                    // this._texture.setMaxAnisotropy( 16 );


                } else {
                    texFilterMin = Texture.NEAREST;
                    texFilterMag = Texture.NEAREST;
                }
                break;
            }

            switch ( texType ) {
            case 'HALF_FLOAT':
                textureType = Texture.HALF_FLOAT;
                texFilterMin = Texture.NEAREST;
                texFilterMag = Texture.NEAREST;
                break;
            case 'HALF_FLOAT_LINEAR':
                textureType = Texture.HALF_FLOAT;
                texFilterMin = Texture.LINEAR;
                texFilterMag = Texture.LINEAR;
                break;
            case 'FLOAT':
                textureType = Texture.FLOAT;
                texFilterMin = Texture.NEAREST;
                texFilterMag = Texture.NEAREST;
                break;
            case 'FLOAT_LINEAR':
                textureType = Texture.FLOAT;
                texFilterMin = Texture.LINEAR;
                texFilterMag = Texture.LINEAR;
                break;
            default:
            case 'UNSIGNED_BYTE':
                textureType = Texture.UNSIGNED_BYTE;
                break;
            }
        }

        this._texture.setInternalFormatType( textureType );
        this._texture.setMinFilter( texFilterMin );
        this._texture.setMagFilter( texFilterMag );
        this._textureMagFilter = texFilterMag;
        this._textureMinFilter = texFilterMin;

    },

    // internal texture allocation
    // handle any change like resize, filter param, etc.
    initTexture: function () {

        if ( !this._dirty ) return;

        if ( !this._texture ) {
            this._texture = new ShadowTexture();
            this._textureUnit = this._textureUnitBase;
        }


        this._texture.setTextureSize( this._textureSize, this._textureSize );
        this._texelSizeUniform.setFloat( 1.0 / this._textureSize );
        this._renderSize[ 0 ] = this._textureSize;
        this._renderSize[ 1 ] = this._textureSize;

        var textureFormat;
        // luminance Float format ?
        textureFormat = Texture.RGBA;

        this.setTextureFiltering();
        this._texture.setInternalFormat( textureFormat );

        this._texture.setWrapS( Texture.CLAMP_TO_EDGE );
        this._texture.setWrapT( Texture.CLAMP_TO_EDGE );

        this._texture.dirty();

    },
    setTexturePrecision: function ( format ) {
        if ( format === this._shadowReceiveAttribute.getPrecision() ) return;

        this._shadowReceiveAttribute.setPrecision( format );
        this.dirty();
    },

    getTexturePrecision: function () {
        return this._shadowReceiveAttribute.getPrecision();
    },

    setTextureSize: function ( mapSize ) {

        if ( mapSize === this._textureSize ) return;

        this._textureSize = mapSize;

        this.dirty();
    },

    setAlgorithm: function ( algo ) {

        if ( algo === this.getAlgorithm() ) return;
        this._shadowReceiveAttribute.setAlgorithm( algo );
        this.dirty();
    },

    getAlgorithm: function () {
        return this._shadowReceiveAttribute.getAlgorithm();
    },

    setLight: function ( light ) {

        if ( !light || light === this._light )
            return;

        this._light = light;
        this.dirty();
    },

    getUp: function ( dir ) {
        //avoid dir/up wrong angle breaking computation

        // compute a up vector ensuring avoiding parallel vectors
        // also might reverting to it once got the change here done once
        // vec3.fromValues( 0.0, 0.0, 1.0 );

        if ( Math.abs( vec3.dot( this._lightUp, dir ) ) >= 1.0 ) {
            // another camera up
            // vec3.fromValues( 1.0, 0.0, 0.0 );
            if ( this._lightUp[ 0 ] === 1.0 ) {
                this._lightUp[ 0 ] = 0.0;
                this._lightUp[ 1 ] = 1.0;
                this._lightUp[ 2 ] = 0.0;
            } else {
                this._lightUp[ 0 ] = 1.0;
                this._lightUp[ 1 ] = 0.0;
                this._lightUp[ 2 ] = 0.0;
            }
        }
        return this._lightUp;
    },

    // makes sure we don't have incorrect near/far
    // or we actually have to render something.
    // Empty or Bad Frustums
    // No objects, handle it gracefully
    nearFarBounding: function () {

        var zNear = this._depthRange[ 0 ];
        var zFar = this._depthRange[ 1 ];

        var epsilon = ShadowMap.EPSILON;
        if ( zFar < zNear - epsilon ) {
            // early out
            this._emptyCasterScene = true;
            zFar = 1;
            zNear = epsilon;
        } else if ( zNear < epsilon ) {
            zNear = epsilon;
        }

        this._depthRange[ 0 ] = zNear;
        this._depthRange[ 1 ] = zFar;

    },

    makePerspectiveFromBoundingBox: function ( bbox, fov, eyePos, eyeDir, view, projection ) {

        var center = bbox.center( this._tmpVec );
        var radius = bbox.radius();
        var epsilon = ShadowMap.EPSILON;
        var zNear = epsilon;
        var zFar = 1.0;

        this._radius = radius;

        var distance = vec3.distance( center, eyePos );
        // inside or not have influence
        // on using radius for fov
        if ( distance < -radius ) {
            // won't render anything the object  is behind..
            this._emptyCasterScene = true;
        } else if ( distance <= 0.0 ) {
            // shhh.. we're inside !
            // sphere center is behind
            zNear = epsilon;
            zFar = distance + radius;
        } else if ( distance < radius ) {
            // shhh.. we're inside !
            // sphere center is in front
            zNear = epsilon;
            zFar = distance + radius;
        } else {
            //  Sphere totally in front
            // long distance runner
            // we must make a nicer zNear here!
            zNear = distance - radius;
            zFar = distance + radius;
        }

        this._depthRange[ 0 ] = zNear;
        this._depthRange[ 1 ] = zFar;
        this.nearFarBounding();

        // positional light: spot, point, area
        //  fov < 180.0
        // statically defined by spot, only needs zNear zFar estimates
        var fovRadius = this._depthRange[ 0 ] * Math.tan( fov * Math.PI / 180.0 );
        // if scene radius is smaller than fov on scene
        // Tighten and enhance precision
        fovRadius = fovRadius > radius ? radius : fovRadius;

        var ymax = fovRadius;
        var ymin = -ymax;

        var xmax = fovRadius;
        var xmin = -xmax;

        var up = this.getUp( eyeDir );

        if ( this._infiniteFrustum ) {
            mat4.infiniteFrustum( projection, xmin, xmax, ymin, ymax, this._depthRange[ 0 ] );
        } else {
            mat4.frustum( projection, xmin, xmax, ymin, ymax, this._depthRange[ 0 ], this._depthRange[ 1 ] );

        }

        mat4.lookAtDirection( view, eyePos, eyeDir, up );

    },

    makeOrthoFromBoundingBox: function ( bbox, eyeDir, view, projection ) {

        var center = bbox.center( this._tmpVecTercio );

        var radius = bbox.radius();
        var diameter = radius + radius;

        var zNear = 0.0001;
        var zFar = diameter + 0.0001;

        // compute eye Pos from a inverted lightDir Ray shot from center of bbox
        // firs make a RAY then move the eye to the that far pos following the ray
        var eyePos = this._tmpVec;
        vec3.scaleAndAdd( eyePos, center, eyeDir, -diameter );

        zNear = radius;
        zFar += radius;

        var zNearRatio = 0.001;
        if ( zNear < zFar * zNearRatio ) {
            zNear = zFar * zNearRatio;
        }

        var up = this.getUp( eyeDir );
        mat4.lookAtDirection( view, eyePos, eyeDir, up );


        var right, top;
        top = radius;
        right = top;
        mat4.ortho( projection, -right, right, -top, top, zNear, zFar );

        this._depthRange[ 0 ] = zNear;
        this._depthRange[ 1 ] = zFar;

    },
    /*
     * Sync camera and light vision so that
     * shadow map render using a camera whom
     * settings come from the light
     * and the scene being shadowed
     */
    aimShadowCastingCamera: function ( cullVisitor, frustumBound ) {

        var light = this._light;

        if ( !light ) {
            this._emptyCasterScene = true;
            return;
        }

        var camera = this._cameraShadow;

        var worldLightPos = this._worldLightPos;
        var worldLightDir = this._worldLightDir;

        // make sure it's not modified outside our computations
        // camera matrix can be modified by cullvisitor afterwards...
        mat4.copy( this._projectionMatrix, camera.getProjectionMatrix() );
        mat4.copy( this._viewMatrix, camera.getViewMatrix() );
        var projection = this._projectionMatrix;
        var view = this._viewMatrix;

        // inject camera world matrix.
        // from light current world/pos and camera eye pos.
        // inject camera world matrix.
        // from light current world/pos
        // NEED same camera eye pos
        var positionedAttribute = cullVisitor.getCurrentRenderBin().getPositionedAttribute();

        var lightMatrix;
        positionedAttribute = positionedAttribute.find( function ( element ) {
            if ( element.length > 0 && element[ 1 ] === light ) {
                lightMatrix = element[ 0 ];
                return true;
            }
            return false;
        } );
        if ( lightMatrix === undefined ) {
            Notify.warn( 'light isnt inside children of shadowedScene Node' );
            this._emptyCasterScene = true;
            return;
        }

        var eyeToWorld = this._tmpMatrix;
        mat4.invert( eyeToWorld, cullVisitor.getCurrentModelViewMatrix() );

        //  light pos & lightTarget in World Space
        if ( !this._light.isDirectionLight() ) {

            mat4.mul( this._tmpMatrix, eyeToWorld, lightMatrix );
            var worldMatrix = this._tmpMatrix;

            // same code as light spot shader
            vec3.transformMat4( worldLightPos, light.getPosition(), worldMatrix );
            worldMatrix[ 12 ] = 0;
            worldMatrix[ 13 ] = 0;
            worldMatrix[ 14 ] = 0;
            mat4.invert( worldMatrix, worldMatrix );
            mat4.transpose( worldMatrix, worldMatrix );

            // not a directional light, compute the world light dir
            vec3.copy( worldLightDir, light.getDirection() );
            vec4.transformMat4( worldLightDir, worldLightDir, worldMatrix );
            vec3.normalize( worldLightDir, worldLightDir );

            // and compute a perspective frustum
            this.makePerspectiveFromBoundingBox( frustumBound, light.getSpotCutoff(), worldLightPos, worldLightDir, view, projection );


        } else {

            vec4.transformMat4( worldLightPos, light.getPosition(), lightMatrix );
            vec4.transformMat4( worldLightPos, worldLightPos, eyeToWorld );
            // same code as light sun shader
            // lightpos is a light dir
            // so we now have to normalize
            // since the transform to world above
            vec3.scale( worldLightPos, worldLightPos, -1.0 );
            vec3.normalize( worldLightPos, worldLightPos );
            this.makeOrthoFromBoundingBox( frustumBound, worldLightPos, view, projection );

            if ( this._debug ) {
                // project box by view to get projection debug bbox
                mat4.invert( this._debugNodeFrustum.getMatrix(), view );
            }
        }

        mat4.copy( camera.getProjectionMatrix(), this._projectionMatrix );
        mat4.copy( camera.getViewMatrix(), this._viewMatrix );

        // set values now
        this.setShadowUniformsDepthValue();

    },

    // culling is done,
    // now try for a the tightest frustum
    // possible for shadowcasting
    frameShadowCastingFrustum: function ( cullVisitor ) {

        if ( !this._infiniteFrustum ) {

            CullVisitor.prototype.clampProjectionMatrix( this._projectionMatrix, this._depthRange[ 0 ], this._depthRange[ 1 ], cullVisitor.getNearFarRatio(), this._depthRange );
        }

        this.setShadowUniformsDepthValue();

        // overwrite any cullvisitor wrongness done by any clampProjectionMatrix
        var camera = this._cameraShadow;
        mat4.copy( camera.getProjectionMatrix(), this._projectionMatrix );
        mat4.copy( camera.getViewMatrix(), this._viewMatrix );

    },

    setShadowUniformsDepthValue: function () {

        // set values now
        this._depthRange[ 2 ] = this._depthRange[ 1 ] - this._depthRange[ 0 ];
        this._depthRange[ 3 ] = 1.0 / ( this._depthRange[ 2 ] );

        var castUniforms = this._casterStateSet.getUniformList();
        castUniforms.uShadowDepthRange.getUniform().setVec4( this._depthRange );

        this._texture.setViewMatrix( this._viewMatrix );
        this._texture.setProjectionMatrix( this._projectionMatrix );
        this._texture.setDepthRange( this._depthRange );

    },

    noDraw: function () {

        this._depthRange[ 0 ] = 0.0;
        this._depthRange[ 1 ] = 0.0;
        this._depthRange[ 2 ] = 0.0;
        this._depthRange[ 3 ] = 0.0;

        var castUniforms = this._casterStateSet.getUniformList();

        castUniforms.uShadowDepthRange.getUniform().setVec4( this._depthRange );
        this._texture.setDepthRange( this._depthRange );

        var camera = this._cameraShadow;

        // make sure it's not modified outside our computations
        // camera matrix can be modified by cullvisitor afterwards...
        mat4.copy( this._projectionMatrix, camera.getProjectionMatrix() );
        mat4.copy( this._viewMatrix, camera.getViewMatrix() );

        this._texture.setViewMatrix( this._viewMatrix );
        this._texture.setProjectionMatrix( this._projectionMatrix );

        this._filledOnce = true;
    },

    // Defines the frustum from light param.
    //
    cullShadowCasting: function ( cullVisitor ) {

        var bbox;

        if ( this._removeNodesNeverCastingVisitor ) {

            this._removeNodesNeverCastingVisitor.setNoCastMask( ~( this._castsShadowBoundsTraversalMask | this._castsShadowDrawTraversalMask ) );
            this._removeNodesNeverCastingVisitor.reset();
            this.getShadowedScene().accept( this._removeNodesNeverCastingVisitor );

        }

        this._computeBoundsVisitor.setTraversalMask( this._castsShadowBoundsTraversalMask );
        this._computeBoundsVisitor.reset();
        this.getShadowedScene().accept( this._computeBoundsVisitor );
        bbox = this._computeBoundsVisitor.getBoundingBox();

        if ( !bbox.valid() ) {

            // nothing to draw Early out.
            this.noDraw();

            if ( this._removeNodesNeverCastingVisitor ) {

                // remove our flags changes on any bitmask
                // not to break things
                this._removeNodesNeverCastingVisitor.restore();

            }

            return;

        }


        if ( this._debug ) {

            var min = bbox.getMin();
            var max = bbox.getMax();
            bbox.center( this._tmpVec );
            var matrix = this._debugNodeSceneCast.getMatrix();

            mat4.fromScaling( matrix, [ max[ 0 ] - min[ 0 ],
                max[ 1 ] - min[ 1 ],
                max[ 2 ] - min[ 2 ], 1
            ] );
            mat4.setTranslation( matrix,
                this._tmpVec );

        }

        // HERE we get the shadowedScene Current World Matrix
        // to get any world transform ABOVE the shadowedScene
        var worldMatrix = cullVisitor.getCurrentModelMatrix();
        // it does fuck up the results.
        bbox.transformMat4( bbox, worldMatrix );

        this._emptyCasterScene = false;
        this.aimShadowCastingCamera( cullVisitor, bbox );

        if ( this._emptyCasterScene ) {
            // nothing to draw Early out.
            //console.log( 'shadow early OUT' );
            this.noDraw();

            if ( this._removeNodesNeverCastingVisitor ) {

                // remove our flags changes on any bitmask
                // not to break things
                this._removeNodesNeverCastingVisitor.restore();

            }

            return;
        }


        // get renderer to make the cull program
        // record the traversal mask on entry so we can reapply it later.
        var traversalMask = cullVisitor.getTraversalMask();

        cullVisitor.setTraversalMask( this._castsShadowDrawTraversalMask );

        // cast geometries into depth shadow map
        cullVisitor.pushStateSet( this._casterStateSet );

        this._cameraShadow.setEnableFrustumCulling( true );
        this._cameraShadow.setComputeNearFar( true );

        if ( this._debug ) {
            this._debugNode.accept( cullVisitor );
        }


        // do RTT from the camera traversal mimicking light pos/orient
        this._cameraShadow.accept( cullVisitor );

        // make sure no negative near 
        this.nearFarBounding();

        // Here culling is done, we do have near/far.
        // and cull/non-culled info
        // if we wanted a tighter frustum.
        this.frameShadowCastingFrustum( cullVisitor );

        // disabling to prevent cullvisitor breaking
        // the projection matrix by "clamping" it
        this._cameraShadow.setComputeNearFar( false );

        if ( this._removeNodesNeverCastingVisitor ) {

            // remove our flags changes on any bitmask
            // not to break things
            this._removeNodesNeverCastingVisitor.restore();

        }

        cullVisitor.popStateSet();

        // re-apply the original traversal mask
        cullVisitor.setTraversalMask( traversalMask );
        this._filledOnce = true;
    },

    cleanReceivingStateSet: function () {
        if ( this._receivingStateset ) {

            if ( this._texture ) {
                // remove this._texture, but not if it's not this._texture
                if ( this._receivingStateset.getTextureAttribute( this._textureUnit, this._texture.getTypeMember() ) === this._texture )
                    this._receivingStateset.removeTextureAttribute( this._textureUnit, this._texture.getTypeMember() );
            }

            if ( this._receivingStateset.getAttribute( this._shadowReceiveAttribute.getTypeMember() ) === this._shadowReceiveAttribute )
                this._receivingStateset.removeAttribute( this._shadowReceiveAttribute.getTypeMember() );
        }

    },
    cleanSceneGraph: function () {
        // well release a lot more things when it works
        this._cameraShadow = undefined;
        this._filledOnce = false;


        this.cleanReceivingStateSet();

        // TODO: need state
        //this._texture.releaseGLObjects();
        //this._shadowReceiveAttribute = undefined;
        this._texture = undefined;
        this._shadowedScene = undefined;
    },

    setDebug: function ( enable ) {

        if ( enable && !this._debug ) {

            if ( !this._debugNode ) {

                this._debugGeomFrustum = Debug.createDebugFrustumGeometry();

                this._debugGeomSceneCast = Shape.createBoundingBoxGeometry();

                this._debugGeomSceneCast.getPrimitives()[ 0 ].mode = PrimitiveSet.LINES;


                this._debugNode = new MatrixTransform();
                this._debugNodeFrustum = new MatrixTransform();
                this._debugNodeSceneCast = new MatrixTransform();


                this._debugNodeFrustum.addChild( this._debugGeomFrustum );
                this._debugNodeSceneCast.addChild( this._debugGeomSceneCast );

                this._debugNode.addChild( this._debugNodeFrustum );
                this._debugNode.addChild( this._debugNodeSceneCast );

            }
        }
        this._debug = enable;

    },
    getDebug: function () {
        return this._debug;
    }

} ), 'osgShadow', 'ShadowMap' );

ShadowMap.EPSILON = 5e-3;

MACROUTILS.setTypeID( ShadowMap );

module.exports = ShadowMap;
