'use strict';
var Notify = require( 'osg/notify' );
var MACROUTILS = require( 'osg/Utils' );
var Node = require( 'osg/Node' );
var CullFace = require( 'osg/CullFace' );
var Depth = require( 'osg/Depth' );
var Texture = require( 'osg/Texture' );
var Camera = require( 'osg/Camera' );
var FrameBufferObject = require( 'osg/FrameBufferObject' );
var Viewport = require( 'osg/Viewport' );
var mat4 = require( 'osg/glMatrix' ).mat4;
var Uniform = require( 'osg/Uniform' );
var StateSet = require( 'osg/StateSet' );
var Program = require( 'osg/Program' );
var Shader = require( 'osg/Shader' );
var Shape = require( 'osg/shape' );
var TransformEnums = require( 'osg/transformEnums' );
var vec2 = require( 'osg/glMatrix' ).vec2;
var vec3 = require( 'osg/glMatrix' ).vec3;


/*
 Composer is an helper to create post fx. The idea is to push one or more textures into a pipe of shader filter.

 how to use it:

 // example how to blur a texture and render it to screen
 var myTexture; // imagine it's your texture you want to process
 var composer = new Composer();
 composer.addPass(new Composer.Filter.InputTexture(myTexture));
 composer.addPass(new Composer.Filter.HBlur(5));
 composer.addPass(new Composer.Filter.VBlur(5));
 composer.renderToScreen(1200, 900);
 composer.build(); // if you dont build manually it will be done in the scenegraph while upading
 rootnode.addChild(composer);

 // now you can imagine to some process and use the result as input texture for a geometry
 var myTexture; // imagine it's your texture you want to process
 var myResultTexture = new Texture(); // imagine it's your texture you want to process
 myResultTexture.setTextureSize(1200,900);
 var composer = new Composer();
 composer.addPass(new Composer.Filter.InputTexture(myTexture));
 composer.addPass(new Composer.Filter.HBlur(5));
 composer.addPass(new Composer.Filter.VBlur(5), resultTexture);

 myGeometry.getStateSet().setTextureAttributeAndModes(0, resultTexture);
 rootnode.addChild(composer);

 */

var Composer = function () {
    Node.call( this );
    this._stack = [];
    this._renderToScreen = false;
    this._dirty = false;

    this._textureRTT = [];
    this._cameraRTT = [];

    var UpdateCallback = function () {

    };
    UpdateCallback.prototype = {
        update: function ( node /*, nv */ ) {
            if ( node.isDirty() ) {
                node.build();
            }
            return true;
        }
    };
    this.addUpdateCallback( new UpdateCallback() );
    // disable unecessarry drawing/states/check
    this.getOrCreateStateSet().setAttributeAndModes( new Depth( 'DISABLE' ) );
    this.getOrCreateStateSet().setAttributeAndModes( new CullFace( 'BACK' ) );
};

Composer.prototype = MACROUTILS.objectInherit( Node.prototype, {
    dirty: function () {
        for ( var i = 0, l = this._stack.length; i < l; i++ ) {
            this._stack[ i ].filter.dirty();
        }
    },

    // addPass support different signature
    // addPass(filter) -> the filter will be done on a texture of the same size than the previous pass
    // addPass(filter, textureWidth, textureHeight) -> the filter will be done on a texture width and height
    // addPass(filter, texture) -> the filter will be done on the giver texture using its width and height
    addPass: function ( filter, arg0, arg1 ) {

        var newPass = {};
        newPass.filter = filter;
        // when arg0 is a texture
        // arg1 is the target, can be TEXTURE_2D ( by default ) or
        // a cubemape's face like TEXTURE_CUBE_MAP_POSITIVE_X, ...
        if ( arg0 instanceof Texture ) {
            newPass.texture = arg0;
            newPass.textureTarget = arg1 || Texture.TEXTURE_2D;
        } else if ( arg0 !== undefined && arg1 !== undefined ) {
            newPass.width = Math.floor( arg0 );
            newPass.height = Math.floor( arg1 );
        }

        this._stack.push( newPass );
        return newPass.filter;
    },
    renderToScreen: function ( w, h ) {
        this._renderToScreen = true;
        this._renderToScreenWidth = w;
        this._renderToScreenHeight = h;
    },
    getResultTexture: function () {
        return this._resultTexture;
    },
    isDirty: function () {
        for ( var i = 0, l = this._stack.length; i < l; i++ ) {
            if ( this._stack[ i ].filter.isDirty() ) {
                return true;
            }
        }
        return false;
    },

    /*develblock:start*/
    // debug only check for specific bad condition:
    // in webgl 1.0 you cannot read and write on the same texture
    // so you shouldn't bind a FOB texture as input and output
    debugCheckRttNotReadWrite: function ( textureResult, stateSet ) {

        for ( var k = 0, lt = stateSet.getNumTextureAttributeLists(); k < lt; k++ ) {
            var textureBinded = stateSet.getTextureAttribute( k, 'Texture' );
            Notify.assert( textureResult !== textureBinded, 'Composer: write/read at the same time on a texture is undefined behavior' );

        }
    },
    /*develblock:end*/

    build: function () {

        var self = this;

        // keep some references
        // TODO: use for reuse/cache/invalidation
        self._textureRTT = [];
        self._cameraRTT = [];


        this.removeChildren();
        var lastTextureResult;

        this._stack.forEach( function ( element, i, array ) {

            // update filter internal due to user change on filter
            if ( element.filter.isDirty() ) {
                element.filter.build();
            }

            // this filter need a special setup that composer build cannot do
            if ( element.filter.interConnectFilters ) {
                lastTextureResult = element.filter.interConnectFilters( self, i, array );
                // goto next filter directly
                return;
            }

            var stateSet = element.filter.getStateSet();
            var w, h;

            // compute filter render texture size
            if ( element.texture !== undefined ) {

                w = element.texture.getWidth();
                h = element.texture.getHeight();

            } else if ( element.width !== undefined && element.height !== undefined ) {

                w = element.width;
                h = element.height;

            } else {

                // get width from Texture0
                var inputTexture = stateSet.getTextureAttribute( 0, 'Texture' );
                if ( inputTexture === undefined ) {
                    Notify.warn( 'Composer can\'t find any information to setup texture output size' );
                } else {
                    w = inputTexture.getWidth();
                    h = inputTexture.getHeight();
                }
            }

            // is it the last filter and we want to render to screen ?
            var lastFilterRenderToScreen = ( i === array.length - 1 &&
                self._renderToScreen === true );

            // check if we have something to do
            // else we will just translate stateset to the next filter
            // this part exist to manage the Composer.Filter.InputTexture that setup the first texture unit
            if ( !lastFilterRenderToScreen ) {
                if ( stateSet.getAttribute( 'Program' ) === undefined ) {
                    array[ i + 1 ].filter.getStateSet().setTextureAttributeAndModes( 0, stateSet.getTextureAttribute( 0, 'Texture' ) );
                    return;
                }
            }

            // build the filter into a Camera and a StateSet
            var camera = new Camera();
            self._cameraRTT.push( camera );
            camera.setStateSet( stateSet );


            var textureResult;
            // check if we want to render on screen
            if ( lastFilterRenderToScreen === true ) {
                w = self._renderToScreenWidth;
                h = self._renderToScreenHeight;
            } else {
                // Or in a offscreen Framebuffer
                camera.setRenderOrder( Camera.PRE_RENDER, 0 );
                textureResult = element.texture;
                var textureTarget = element.textureTarget;
                // if no user provided render target texture, create one
                if ( textureResult === undefined ) {
                    textureResult = new Texture();
                    textureResult.setName( 'composer Rtt ' + element.filter.getFragmentName() );
                    textureResult.setTextureSize( w, h );
                    textureTarget = Texture.TEXTURE_2D;
                    self._textureRTT.push( textureResult );
                }
                // Attach the render texture target as FBO
                // Note: node depth attachment because we're in 2D
                camera.attachTexture( FrameBufferObject.COLOR_ATTACHMENT0, textureResult, textureTarget );
            }

            var vp = new Viewport( 0, 0, w, h );
            camera.setReferenceFrame( TransformEnums.ABSOLUTE_RF );
            camera.setViewport( vp );

            // FIXME: not really useful, but osgjs keep pushing projection matrix
            // and maybe some old code still use it
            mat4.ortho( camera.getProjectionMatrix(), 0, 1, 0, 1, -5, 5 );

            var quad = Shape.createTexturedFullScreenFakeQuadGeometry();

            if ( element.filter.buildGeometry )
                quad = element.filter.buildGeometry( quad );

            quad.setName( 'composer layer' );

            // if rendering into texture framebuffer
            if ( textureResult ) {

                /*develblock:start*/
                self.debugCheckRttNotReadWrite( textureResult, stateSet );
                /*develblock:end*/

                // assign the result texture to the next stateset
                if ( i + 1 < array.length ) {
                    array[ i + 1 ].filter.getStateSet().setTextureAttributeAndModes( 0, textureResult );
                }

            }
            lastTextureResult = textureResult;


            camera.addChild( quad );
            element.filter.getStateSet().addUniform( Uniform.createFloat2( vec2.fromValues( w, h ), 'RenderSize' ) );

            // Optimization, no need to clear,
            // unless we know we'll have transparent parts
            // which is a special case rather than the default
            camera.setClearMask( 0 );

            camera.setName( element.filter.getFragmentName() || 'Composer Pass' + i );
            // add to composer
            self.addChild( camera );
        } );
        // reference to the resulting texture
        // undefined if rendering directly to screen
        this._resultTexture = lastTextureResult;
    }
} );

Composer.Filter = function () {
    this._stateSet = new StateSet();
    this._dirty = true;
    this._fragmentName = 'FilterOSGJS';
    this._vertexName = '';
};

Composer.Filter.prototype = {
    setFragmentName: function ( fname ) {
        this._fragmentName = fname;
    },
    getFragmentName: function () {
        return this._fragmentName;
    },
    setVertexName: function ( vname ) {
        this._vertexName = vname;
    },
    getVertexName: function () {
        return this._vertexName;
    },
    getDefineFragmentName: function () {
        return '\n#define SHADER_NAME ' + this._fragmentName + '\n';
    },
    getDefineVertexName: function () {
        return '\n#define SHADER_NAME ' + ( this._vertexName || this._fragmentName ) + '\n';
    },
    getStateSet: function () {
        return this._stateSet;
    },
    getOrCreateStateSet: function () {
        return this._stateSet;
    },
    dirty: function () {
        this._dirty = true;
    },
    isDirty: function () {
        return this._dirty;
    }
};

// default means you do use the special optimized full screen triangle
// dubbed fakeFullscreenQuad
// no need of modelView, projection, nor texcoord
Composer.Filter.defaultVertexShader = [
    'attribute vec3 Vertex;',
    'varying vec2 vTexCoord0;',
    'void main(void) {',
    '  gl_Position = vec4(Vertex*2.0 - 1.0,1.0);',
    '  vTexCoord0 = Vertex.xy;',
    '}',
    ''
].join( '\n' );
Composer.Filter.defaultFragmentShaderHeader = [
    '#ifdef GL_FRAGMENT_PRECISION_HIGH\n precision highp float;\n #else\n precision mediump float;\n#endif',
    'varying vec2 vTexCoord0;',
    'uniform vec2 RenderSize;',
    'uniform sampler2D Texture0;',
    ''
].join( '\n' );

Composer.Filter.shaderUtils = [
    'vec4 packFloatTo4x8(in float v) {',
    'vec4 enc = vec4(1.0, 255.0, 65025.0, 16581375.0) * v;',
    'enc = fract(enc);',
    'enc -= enc.yzww * vec4(1.0/255.0,1.0/255.0,1.0/255.0,0.0);',
    'return enc;',
    '}',

    ' ',
    'vec4 pack2FloatTo4x8(in vec2 val) {',
    ' const vec2 bitSh = vec2(256.0, 1.0);',
    ' const vec2 bitMsk = vec2(0.0, 1.0/256.0);',
    ' vec2 res1 = fract(val.x * bitSh);',
    ' res1 -= res1.xx * bitMsk;',
    ' vec2 res2 = fract(val.y * bitSh);',
    ' res2 -= res2.xx * bitMsk;',
    ' return vec4(res1.x,res1.y,res2.x,res2.y);',
    '}',
    ' ',
    'float unpack4x8ToFloat( vec4 rgba ) {',
    ' return dot( rgba, vec4(1.0, 1.0/255.0, 1.0/65025.0, 1.0/16581375.0) );',
    '}',
    ' ',
    'vec2 unpack4x8To2Float(in vec4 val) {',
    ' const vec2 unshift = vec2(1.0/256.0, 1.0);',
    ' return vec2(dot(val.xy, unshift), dot(val.zw, unshift));',
    '}',

    'vec2 encodeNormal (vec3 n)',
    '{',
    '    float f = sqrt(8.0*n.z+8.0);',
    '    return n.xy / f + 0.5;',
    '}',

    'vec3 decodeNormal (vec2 enc)',
    '{',
    '    vec2 fenc = enc*4.0-2.0;',
    '    float f = dot(fenc,fenc);',
    '    float g = sqrt(1.0-f/4.0);',
    '    vec3 n;',
    '    n.xy = fenc*g;',
    '    n.z = 1.0-f/2.0;',
    '    return n;',
    '}',
    ''
].join( '\n' );

Composer.Filter.Helper = {
    pascalCache: [
        [ 1 ]
    ],
    getOrCreatePascalCoefficients: function ( kernelSize ) {
        kernelSize = kernelSize === undefined ? 5 : Math.min( kernelSize, 128 );
        var cache = Composer.Filter.Helper.pascalCache;
        if ( cache[ kernelSize ] )
            return cache[ kernelSize ];
        for ( var j = cache.length - 1; j < kernelSize; j++ ) {
            var currentRow = cache[ j ];
            var currentRowSize = currentRow.length;

            var nextRow = new Array( currentRowSize );
            nextRow[ 0 ] = 1.0;
            nextRow[ currentRowSize ] = 1.0;

            // unnormalized pascal
            var sum = j === cache.length - 1 ? Math.pow( 2, j ) : 1.0;
            for ( var p = 0; p < currentRowSize - 1; p++ )
                nextRow[ p + 1 ] = ( currentRow[ p ] + currentRow[ p + 1 ] ) * sum;
            // normalized array
            sum = Math.pow( 2, j + 1 );
            for ( var k = 0; k < currentRowSize + 1; k++ )
                nextRow[ k ] /= sum;
            cache.push( nextRow );
        }
        return cache[ kernelSize ];
    }
};

Composer.Filter.Custom = function ( fragmentShader, uniforms ) {
    Composer.Filter.call( this );
    this._fragmentShader = fragmentShader;
    this._uniforms = uniforms;
    this._vertexShader = Composer.Filter.defaultVertexShader;
};

Composer.Filter.Custom.prototype = MACROUTILS.objectInherit( Composer.Filter.prototype, {
    setFragmentShader: function ( f ) {
        this._fragmentShader = f;
    },
    setVertexShader: function ( v ) {
        this._vertexShader = v;
    },
    autoBindFragmentUniformStateSet: function ( stateSet, fragmentShader, uniforms ) {

        var unitIndex = 0;

        // TODO: check if not a better place Utils
        // and reuse (we already do this in shader)
        // At least DEFINE the regexp somewhere somehow
        var r = fragmentShader.match( /uniform\s+\w+\s+\w+/g );
        if ( !r ) return;

        for ( var i = 0, l = r.length; i < l; i++ ) {

            var match = r[ i ].match( /uniform\s+(\w+)\s+(\w+)/ );
            var uniformType = match[ 1 ];
            var uniformName = match[ 2 ];
            var uniform;

            if ( !uniforms[ uniformName ] ) continue;

            var uniformValue = uniforms[ uniformName ];

            if ( uniformType.search( 'sampler' ) !== -1 ) {

                // STRONG IMPLICIT LINKING HERE:
                // Texture Unit Linked directly to declaration order in fragment Shader
                stateSet.setTextureAttributeAndModes( unitIndex, uniformValue );
                uniform = Uniform.createInt1( unitIndex, uniformName );
                unitIndex++;
                stateSet.addUniform( uniform );

            } else {

                if ( Uniform.isUniform( uniformValue ) ) {
                    uniform = uniformValue;
                } else {
                    uniform = Uniform[ uniformType ]( uniforms[ uniformName ], uniformName );
                }
                stateSet.addUniform( uniform );

            }

        }
    },
    build: function () {

        this._program = new Program(
            new Shader( Shader.VERTEX_SHADER, this._vertexShader + this.getDefineVertexName() ),
            new Shader( Shader.FRAGMENT_SHADER, this._fragmentShader + this.getDefineFragmentName() ) );

        if ( this._uniforms ) {
            this.autoBindFragmentUniformStateSet( this._stateSet, this._fragmentShader, this._uniforms );
        }
        this._stateSet.setAttributeAndModes( this._program );
        this._dirty = false;

    }
} );


// filter that switch its render target and its input at each frame
// allowing to get input for last frame render.
Composer.Filter.PingPong = function ( cameraRtt0, rtt0, cameraRtt1, rtt1, fragmentShader, uniforms ) {
    Composer.Filter.Custom.apply( this, [ fragmentShader, uniforms ] );

    this._cameraRtt0 = cameraRtt0;
    this._rtt0 = rtt0;

    this._cameraRtt1 = cameraRtt1;
    this._rtt1 = rtt1;

    this._fragmentName = 'PingPong';
};

Composer.Filter.PingPong.prototype = MACROUTILS.objectInherit( Composer.Filter.Custom.prototype, {

    // Constraints:
    // - Next Filter: texture unit 0 === rtt0 && texture unit 1 === rtt1
    // - Previous Filter: the output of the previous filter if any
    //      will be binded to texture unit 0 of both camera stateset
    interConnectFilters: function ( composer, i, array ) {

        var filterStateSet = this.getStateSet();

        var st0 = this._cameraRtt0.getOrCreateStateSet();
        var st1 = this._cameraRtt1.getOrCreateStateSet();

        // copy filter program and uniforms on the 2 cameras
        st0.setAttributeAndModes( this._program );
        st1.setAttributeAndModes( this._program );

        // PingPong filter is a peculiar Filter where user provides the Camera
        // instead of compose::build creating them, and allowing user to provide
        // them in the ctor
        // To make sure we don't forget any uniform
        // we make sure to get uniform from the filter itself and the uniform
        // from the parameters
        var k, l, keys, unif, uniforms = this.getStateSet().getUniformList();
        if ( uniforms ) {
            keys = window.Object.keys( uniforms );
            for ( k = 0, l = keys.length; k < l; k++ ) {
                unif = uniforms[ keys[ k ] ].getUniform();
                st0.addUniform( unif );
                st1.addUniform( unif );
            }
        }

        uniforms = this._uniforms;
        if ( uniforms ) {
            keys = window.Object.keys( uniforms );
            for ( k = 0, l = keys.length; k < l; k++ ) {
                unif = uniforms[ keys[ k ] ];
                st0.addUniform( unif );
                st1.addUniform( unif );
            }
        }


        var uniformTU0 = Uniform.createInt1( 0, 'Texture0' );
        var uniformTU1 = Uniform.createInt1( 1, 'Texture1' );

        st0.addUniform( uniformTU0 );
        st0.addUniform( uniformTU1 );

        st1.addUniform( uniformTU0 );
        st1.addUniform( uniformTU1 );

        // copy input on both camera
        // Composer::Build set the last render into the current filter stateset texture unit 0
        // we copy that into each camera as Texture unit 0
        var inputTexture = filterStateSet.getTextureAttribute( 0, 'Texture' );
        st0.setTextureAttributeAndModes( 0, inputTexture );
        st1.setTextureAttributeAndModes( 0, inputTexture );

        st0.setTextureAttributeAndModes( 1, this._rtt1 );
        st1.setTextureAttributeAndModes( 1, this._rtt0 );

        // if not the last filter
        // bind both result to next filter
        // rtt0 to texture unit 0
        // rtt0 to texture unit 1
        if ( i !== array.length - 1 ) {

            // just translate stateset to the next filter
            var nextSt = array[ i + 1 ].filter.getStateSet();

            nextSt.setTextureAttributeAndModes( 0, this._rtt0 );
            nextSt.setTextureAttributeAndModes( 1, this._rtt1 );

            nextSt.addUniform( uniformTU0 );
            nextSt.addUniform( uniformTU1 );

        }

        var quad = Shape.createTexturedFullScreenFakeQuadGeometry();

        if ( this.buildGeometry )
            quad = this.buildGeometry( quad );

        quad.setName( 'composer layer' );

        this._cameraRtt0.addChild( quad );
        this._cameraRtt1.addChild( quad );

        composer.addChild( this._cameraRtt0 );
        composer.addChild( this._cameraRtt1 );

        composer._textureRTT.push( this._rtt0 );
        composer._textureRTT.push( this._rtt1 );

        composer._cameraRTT.push( this._cameraRtt0 );
        composer._cameraRTT.push( this._cameraRtt1 );

        // hide one of the two pass, as we will render only one each frame
        this._cameraRtt1.setNodeMask( 0x0 );

        // last texture result, only one possible so the first will do
        return this._rtt0;

    },

    // PingPong
    switch: function () {

        var nodeMask0 = this._cameraRtt0.getNodeMask();
        var nodeMask1 = this._cameraRtt1.getNodeMask();

        this._cameraRtt0.setNodeMask( nodeMask1 );
        this._cameraRtt1.setNodeMask( nodeMask0 );

    }

} );

Composer.Filter.AverageHBlur = function ( nbSamplesOpt, linear, unpack, pack ) {
    Composer.Filter.call( this );
    this._linear = linear !== false;
    this.setBlurSize( nbSamplesOpt !== undefined ? nbSamplesOpt : 5 );
    this._unpack = unpack;
    this._pack = pack;
    this._pixelSize = 1.0;
    this._fragmentName = 'AverageHBlur' + this._nbSamples;
};

Composer.Filter.AverageHBlur.prototype = MACROUTILS.objectInherit( Composer.Filter.prototype, {
    setBlurSize: function ( nbSamples ) {
        if ( nbSamples % 2 !== 1 ) {
            nbSamples += 1;
        }
        this._nbSamples = nbSamples;
        this.dirty();
    },
    setPixelSize: function ( value ) {
        this._pixelSize = value;
        this.dirty();
    },

    getUVOffset: function ( value ) {
        return 'vec2(float(' + value + ')/RenderSize[0], 0.0);';
    },
    getShaderBlurKernel: function () {
        var nbSamples = this._nbSamples;


        var kernel = [];

        kernel.push( ' pixel = unpack(Texture0, vTexCoord0 );' );
        kernel.push( ' if (pixel.w == 0.0) { gl_FragColor = pixel; return; }' );
        kernel.push( ' vec2 offset;' );
        var i;
        var numTexBlurStep = Math.floor( nbSamples / 2 );
        if ( numTexBlurStep % 2 !== 0 ) {
            nbSamples += 1;
            numTexBlurStep = Math.floor( nbSamples / 2 );
        }
        var numFinalSample = numTexBlurStep * 2.0 + 1.0;
        var weight = 1.0 / numFinalSample;
        if ( !this._linear ) {
            for ( i = 0; i < numTexBlurStep; i++ ) {
                kernel.push( ' offset = ' + this.getUVOffset( ( i + 1 ) * this._pixelSize ) );
                kernel.push( ' pixel += unpack(Texture0, vTexCoord0 + offset);' );
                kernel.push( ' pixel += unpack(Texture0, vTexCoord0 - offset);' );
            }
            kernel.push( ' pixel *= float(' + weight + ');' );

            //console.log( 'N: Sum = ' + ( weight + numTexBlurStep * weight * 2 ) );
            //console.log( 'N: nbSample = ' + nbSamples + ' texBlurStep= ' + numTexBlurStep + ' finalSample= ' + numFinalSample );
            //console.log( 'N: w = ' + weight );

        } else {
            // using bilinear HW to divide texfetch by 2
            var offset, offsetIdx;
            var idx = 1;
            var weightTwo = ( 1.0 - weight ) / ( numTexBlurStep * 2.0 );
            // first pixel not same weight as others
            kernel.push( ' pixel *= float(' + weight + ');' );
            kernel.push( ' vec4 pixelLin = vec4(0.0);' );

            for ( i = 0; i < numTexBlurStep; i += 2 ) {

                offsetIdx = idx + 0.5; //  ((i*weight + (i+1)*weight)/(weight+weight)) ===  (2i + 1) / 2 = i + 0.5
                idx += 2;
                offset = this.getUVOffset( offsetIdx * this._pixelSize );

                kernel.push( ' offset = ' + offset );

                kernel.push( ' pixelLin += unpack(Texture0, vTexCoord0 + offset);' );
                kernel.push( ' pixelLin += unpack(Texture0, vTexCoord0 - offset);' );
            }
            kernel.push( ' pixel += pixelLin * float(' + weightTwo * 2 + ');' );

            //console.log( 'L: Sum = ' + ( weight + numTexBlurStep * weightTwo * 2 ) );
            //console.log( 'L: nbSample = ' + nbSamples + ' texBlurStep= ' + numTexBlurStep + ' finalSample= ' + numFinalSample );
            //console.log( 'N: w = ' + weight + ' numTexBlurStep  ' + numTexBlurStep + ' * w2 = ' + weightTwo );

        }
        return kernel;
    },
    build: function () {

        var tex = this._stateSet.getTextureAttribute( 0, 'Texture' );
        if ( tex && this._linear ) {
            tex.setMinFilter( 'LINEAR' );
            tex.setMagFilter( 'LINEAR' );
        } else {
            this._linear = false;
        }

        //var nbSamples = this._nbSamples;
        var vtx = Composer.Filter.defaultVertexShader;
        var fgt = [
            Composer.Filter.defaultFragmentShaderHeader,
            'uniform float width;',

            this._unpack || 'vec4 unpack(const in sampler2D tex, const in vec2 uv) { return texture2D(tex, uv); }',
            this._pack || 'vec4 pack(vec4 pix) { return pix; }',

            'void main (void)',
            '{',
            '  vec4 pixel;',
            this.getShaderBlurKernel().join( '\n' ),
            '  gl_FragColor = pack(pixel);',
            '}',
            ''
        ].join( '\n' );

        var program = new Program(
            new Shader( Shader.VERTEX_SHADER, vtx + this.getDefineVertexName() ),
            new Shader( Shader.FRAGMENT_SHADER, fgt + this.getDefineFragmentName() ) );

        if ( this._stateSet.getUniform( 'Texture0' ) === undefined ) {
            this._stateSet.addUniform( Uniform.createInt1( 0, 'Texture0' ) );
        }


        this._stateSet.setAttributeAndModes( program );
        this._dirty = false;
    }
} );


Composer.Filter.AverageVBlur = function ( nbSamplesOpt, linear, unpack, pack ) {
    Composer.Filter.AverageHBlur.call( this, nbSamplesOpt, linear, unpack, pack );
    this._fragmentName = 'AverageVBlur' + this._nbSamples;
};
Composer.Filter.AverageVBlur.prototype = MACROUTILS.objectInherit( Composer.Filter.AverageHBlur.prototype, {
    getUVOffset: function ( value ) {
        return 'vec2(0.0, float(' + value + ')/RenderSize[1]);';
    }
} );

Composer.Filter.BilateralHBlur = function ( options, unpack, pack ) {
    Composer.Filter.call( this );

    if ( options === undefined ) {
        options = {};
    }

    var nbSamplesOpt = options.nbSamples;
    var depthTexture = options.depthTexture;
    var radius = options.radius;

    this.setBlurSize( nbSamplesOpt !== undefined ? nbSamplesOpt : 5 );
    this._depthTexture = depthTexture;
    this._radius = Uniform.createFloat( 1.0, 'radius' );
    this._pixelSize = Uniform.createFloat( 1.0, 'pixelSize' );
    this.setRadius( radius );

    this._unpack = unpack;
    this._pack = pack;
    this._fragmentName = 'BilateralHBlur' + this._nbSamples;
};

Composer.Filter.BilateralHBlur.prototype = MACROUTILS.objectInherit( Composer.Filter.prototype, {
    setBlurSize: function ( nbSamples ) {
        if ( nbSamples % 2 !== 1 ) {
            nbSamples += 1;
        }
        //Notify.log('BlurSize ' + nbSamples);
        this._nbSamples = nbSamples;
        this.dirty();
    },
    setPixelSize: function ( value ) {
        this._pixelSize.setFloat( value );
    },
    setRadius: function ( radius ) {
        this._radius.setFloat( radius ); // *2.0;
    },
    getUVOffset: function ( value ) {
        return 'vec2(0.0, float(' + value + ') * pixelSize )/RenderSize[1];';
    },
    getShaderBlurKernel: function () {
        var nbSamples = this._nbSamples;
        var kernel = [];
        kernel.push( ' pixel = unpack(Texture0, vTexCoord0 );' );
        kernel.push( ' if (pixel.w <= 0.0001) { gl_FragColor = vec4(1.0); return; }' );
        kernel.push( ' vec2 offset, tmpUV;' );
        kernel.push( ' depth = getDepthValue(unpack(Texture1, vTexCoord0 ));' );
        for ( var i = 1; i < Math.ceil( nbSamples / 2 ); i++ ) {
            kernel.push( ' offset = ' + this.getUVOffset( i ) );

            kernel.push( ' tmpUV =  vTexCoord0 + offset;' );
            kernel.push( ' tmpDepth = getDepthValue(unpack(Texture1, tmpUV ));' );
            kernel.push( ' if ( abs(depth-tmpDepth) < radius) {' );
            kernel.push( '   pixel += unpack(Texture0, tmpUV);' );
            kernel.push( '   nbHits += 1.0;' );
            kernel.push( ' }' );

            kernel.push( ' tmpUV =  vTexCoord0 - offset;' );
            kernel.push( ' tmpDepth = getDepthValue(unpack(Texture1, tmpUV ));' );
            kernel.push( ' if ( abs(depth-tmpDepth) < radius) {' );
            kernel.push( '   pixel += unpack(Texture0, tmpUV);' );
            kernel.push( '   nbHits += 1.0;' );
            kernel.push( ' }' );
        }
        kernel.push( ' pixel /= nbHits;' );
        return kernel;
    },
    build: function () {
        //var nbSamples = this._nbSamples;
        var vtx = Composer.Filter.defaultVertexShader;
        var fgt = [
            Composer.Filter.defaultFragmentShaderHeader,
            'uniform sampler2D Texture1;',
            'uniform float width;',
            'uniform mat4 projection;',
            'uniform float radius;',
            'uniform float pixelSize;',

            this._unpack || 'vec4 unpack(const in sampler2D tex, const in vec2 uv) { return texture2D(tex, uv); }',
            this._pack || 'vec4 pack(vec4 pix) { return pix; }',

            'float znear,zfar,zrange;',
            '',
            Composer.Filter.shaderUtils,
            '',
            'float getDepthValue(vec4 v) {',
            '  float depth = unpack4x8ToFloat(v);',
            '  depth = depth*zrange+znear;',
            '  return -depth;',
            '}',

            'void main (void)',
            '{',
            '  vec4 pixel;',
            '  float depth, tmpDepth;',
            '  znear = projection[3][2] / (projection[2][2]-1.0);',
            '  zfar = projection[3][2] / (projection[2][2]+1.0);',
            '  zrange = zfar-znear;',
            '  float nbHits = 1.0;',

            this.getShaderBlurKernel().join( '\n' ),
            '  gl_FragColor = pack(pixel);',
            '}',
            ''
        ].join( '\n' );

        var program = new Program(
            new Shader( Shader.VERTEX_SHADER, vtx + this.getDefineVertexName() ),
            new Shader( Shader.FRAGMENT_SHADER, fgt + this.getDefineFragmentName() ) );

        if ( this._stateSet.getUniform( 'Texture0' ) === undefined ) {
            this._stateSet.addUniform( Uniform.createInt1( 0, 'Texture0' ) );
        }
        if ( this._stateSet.getUniform( 'Texture1' ) === undefined ) {
            this._stateSet.addUniform( Uniform.createInt1( 1, 'Texture1' ) );
        }
        this._stateSet.addUniform( this._radius );
        this._stateSet.addUniform( this._pixelSize );
        this._stateSet.setTextureAttributeAndModes( 1, this._depthTexture );
        this._stateSet.setAttributeAndModes( program );
        this._dirty = false;
    }
} );

Composer.Filter.BilateralVBlur = function ( options, unpack, pack ) {
    Composer.Filter.BilateralHBlur.call( this, options, unpack, pack );
    this._fragmentName = 'BilateralVBlur' + this._nbSamples;
};

Composer.Filter.BilateralVBlur.prototype = MACROUTILS.objectInherit( Composer.Filter.BilateralHBlur.prototype, {
    getUVOffset: function ( value ) {
        return 'vec2(float(' + value + ')*pixelSize/RenderSize[0],0.0);';
    }
} );

// InputTexture is a fake filter to setup the first texture
// in the composer pipeline
Composer.Filter.InputTexture = function ( texture ) {
    Composer.Filter.call( this );
    this._stateSet.setTextureAttributeAndModes( 0, texture );
    this._fragmentName = 'InputTexture';
};
Composer.Filter.InputTexture.prototype = MACROUTILS.objectInherit( Composer.Filter.prototype, {
    build: function () {
        this._dirty = false;
    }
} );

// Operate a Gaussian horizontal blur
Composer.Filter.HBlur = function ( nbSamplesOpt, linear, unpack, pack ) {
    Composer.Filter.call( this );
    this._linear = linear !== false;
    this.setBlurSize( nbSamplesOpt !== undefined ? nbSamplesOpt : 5 );
    this._unpack = unpack;
    this._pack = pack;
    this._fragmentName = 'HBlur' + this._nbSamples;
};

Composer.Filter.HBlur.prototype = MACROUTILS.objectInherit( Composer.Filter.prototype, {
    setBlurSize: function ( nbSamples ) {
        if ( nbSamples % 2 !== 0 ) {
            nbSamples += 1;
        }
        this._nbSamples = nbSamples;
        this.dirty();
    },
    getUVOffset: function ( value ) {
        // TODO: could compute that in JS and remove 1 div per kernel step
        return 'vec2(float(' + value + ')/ RenderSize[0], 0.0) ;';
    },
    build: function () {
        var nbSamples = this._nbSamples;

        // TODO: get rendersize from that and precompute
        // offset when possible
        var tex = this._stateSet.getTextureAttribute( 0, 'Texture' );
        if ( tex && this._linear ) {
            tex.setMinFilter( 'LINEAR' );
            tex.setMagFilter( 'LINEAR' );
        } else {
            this._linear = false;
        }

        var vtx = Composer.Filter.defaultVertexShader;


        // http://rastergrid.com/blog/2010/09/efficient-gaussian-blur-with-linear-sampling/
        // outermost are near 0, so unless float buffer...
        // at samples = 6 already it's 1/32 = 0.03
        // so we lessen texFetch (allow higher kernel size with less texfetch)
        var weightMin = 0.005 / nbSamples;
        var coeffIdx = nbSamples;
        var weights = Composer.Filter.Helper.getOrCreatePascalCoefficients( coeffIdx );
        var start = Math.floor( coeffIdx / 2.0 );

        var kernel = [];
        kernel.push( ' pixel = float(' + weights[ start ] + ')*unpack(Texture0, vTexCoord0 ).rgb;' );

        kernel.push( ' vec2 offset;' );
        var idx, i, weight, offset, offsetIdx;
        if ( !this._linear ) {
            idx = 1;
            for ( i = start + 1; i < nbSamples; i++ ) {
                weight = weights[ i ];

                if ( weight < weightMin ) break;

                offsetIdx = idx++;
                offset = this.getUVOffset( offsetIdx );

                kernel.push( ' offset = ' + offset );
                kernel.push( ' pixel += ' + weight + '* unpack(Texture0, (vTexCoord0.xy + offset.xy)).rgb;' );
                kernel.push( ' pixel += ' + weight + '* unpack(Texture0, (vTexCoord0.xy - offset.xy)).rgb;' );
            }
        } else {

            // using bilinear HW to divide texfetch by 2
            // http://www.rastergrid.com/blog/wp-content/uploads/2010/09/equation.png
            idx = 1;
            for ( i = start + 1; i < nbSamples; i += 2 ) {
                var weightT1 = weights[ i ];
                var weightT2 = weights[ i + 1 ];

                weight = weightT1 + weightT2;

                if ( weight < weightMin ) break;

                var offsetT1 = idx;
                var offsetT2 = idx + 1;
                idx += 2;

                offsetIdx = ( offsetT1 * weightT1 + offsetT2 * weightT2 ) / weight;
                offset = this.getUVOffset( offsetIdx );

                kernel.push( ' offset = ' + offset );
                kernel.push( ' pixel += ' + weight + '* unpack(Texture0, (vTexCoord0.xy + offset.xy)).rgb;' );
                kernel.push( ' pixel += ' + weight + '* unpack(Texture0, (vTexCoord0.xy - offset.xy)).rgb;' );
            }
        }
        var fgt = [
            Composer.Filter.defaultFragmentShaderHeader,
            'uniform float width;',

            this._unpack || 'vec4 unpack(const in sampler2D tex, const in vec2 uv) { return texture2D(tex, uv); }',
            this._pack || 'vec4 pack(vec4 pix) { return pix; }',

            'void main (void)',
            '{',
            '  vec3 pixel;',
            kernel.join( '\n' ),
            '  gl_FragColor = pack(vec4(pixel, 1.0));',
            '}',
            ''
        ].join( '\n' );

        var program = new Program(
            new Shader( Shader.VERTEX_SHADER, vtx + this.getDefineVertexName() ),
            new Shader( Shader.FRAGMENT_SHADER, fgt + this.getDefineFragmentName() ) );

        if ( this._stateSet.getUniform( 'Texture0' ) === undefined ) {
            this._stateSet.addUniform( Uniform.createInt1( 0, 'Texture0' ) );
        }
        this._stateSet.setAttributeAndModes( program );
        this._dirty = false;
    }
} );

// Operate a Gaussian vertical blur
Composer.Filter.VBlur = function ( nbSamplesOpt, linear, unpack, pack ) {
    Composer.Filter.HBlur.call( this, nbSamplesOpt, linear, unpack, pack );
    this._fragmentName = 'VBlur' + this._nbSamples;
};

Composer.Filter.VBlur.prototype = MACROUTILS.objectInherit( Composer.Filter.HBlur.prototype, {
    getUVOffset: function ( value ) {
        return 'vec2(0.0, float(' + value + ')/RenderSize[1]) ;';
    }
} );

// Sobel filter
// http://en.wikipedia.org/wiki/Sobel_operator
Composer.Filter.SobelFilter = function () {
    Composer.Filter.call( this );
    this._color = Uniform.createFloat3( vec3.fromValues( 1.0, 1.0, 1.0 ), 'color' );
    this._factor = Uniform.createFloat( 1.0, 'factor' );
    this._fragmentName = 'SobelFilter';
};

Composer.Filter.SobelFilter.prototype = MACROUTILS.objectInherit( Composer.Filter.prototype, {
    setColor: function ( color ) {
        this._color.setVec3( color );
    },
    setFactor: function ( f ) {
        this._factor.setFloat( f );
    },
    build: function () {
        var stateSet = this._stateSet;
        var vtx = Composer.Filter.defaultVertexShader;
        var fgt = [
            '',
            Composer.Filter.defaultFragmentShaderHeader,
            'uniform vec3 color;',
            'uniform float factor;',
            'void main (void)',
            '{',
            '  float fac0 = 2.0;',
            '  float fac1 = 1.0;',
            '  float offsetx = 1.0/RenderSize[0];',
            '  float offsety = 1.0/RenderSize[1];',
            '  vec4 texel0 = texture2D(Texture0, vTexCoord0 + vec2(offsetx, offsety));',
            '  vec4 texel1 = texture2D(Texture0, vTexCoord0 + vec2(offsetx, 0.0));',
            '  vec4 texel2 = texture2D(Texture0, vTexCoord0 + vec2(offsetx, -offsety));',
            '  vec4 texel3 = texture2D(Texture0, vTexCoord0 + vec2(0.0, -offsety));',
            '  vec4 texel4 = texture2D(Texture0, vTexCoord0 + vec2(-offsetx, -offsety));',
            '  vec4 texel5 = texture2D(Texture0, vTexCoord0 + vec2(-offsetx, 0.0));',
            '  vec4 texel6 = texture2D(Texture0, vTexCoord0 + vec2(-offsetx, offsety));',
            '  vec4 texel7 = texture2D(Texture0, vTexCoord0 + vec2(0.0, offsety));',
            '  vec4 rowx = -fac0*texel5 + fac0*texel1 +  -fac1*texel6 + fac1*texel0 + -fac1*texel4 + fac1*texel2;',
            '  vec4 rowy = -fac0*texel3 + fac0*texel7 +  -fac1*texel4 + fac1*texel6 + -fac1*texel2 + fac1*texel0;',
            '  float mag = sqrt(dot(rowy,rowy)+dot(rowx,rowx));',
            '  if (mag < 1.0/255.0) discard;',
            '  mag *= factor;',
            '  mag = min(1.0, mag);',
            '  gl_FragColor = vec4(color*mag,mag);',
            '}',
            ''
        ].join( '\n' );

        var program = new Program(
            new Shader( Shader.VERTEX_SHADER, vtx + this.getDefineVertexName() ),
            new Shader( Shader.FRAGMENT_SHADER, fgt + this.getDefineFragmentName() ) );

        stateSet.setAttributeAndModes( program );
        stateSet.addUniform( this._color );
        stateSet.addUniform( this._factor );
        stateSet.addUniform( Uniform.createInt1( 0, 'Texture0' ) );
        this._dirty = false;
    }
} );

Composer.Filter.BlendMix = function () {
    Composer.Filter.call( this );
    var texture0, texture1, mixValue;
    var unit0 = 0;
    var unit1 = 1;
    var stateSet = this._stateSet;
    if ( arguments.length === 3 ) {
        texture0 = arguments[ 0 ];
        texture1 = arguments[ 1 ];
        mixValue = arguments[ 2 ];
        unit0 = 1;
        unit1 = 2;
        stateSet.setTextureAttributeAndModes( unit0, texture0 );
    } else if ( arguments.length === 2 ) {
        texture1 = arguments[ 0 ];
        mixValue = arguments[ 1 ];
    } else if ( arguments.length === 1 ) {
        texture1 = arguments[ 0 ];
        mixValue = 0.5;
    }
    stateSet.setTextureAttributeAndModes( unit1, texture1 );
    stateSet.addUniform( Uniform.createInt1( unit0, 'Texture0' ) );
    stateSet.addUniform( Uniform.createInt1( unit1, 'Texture1' ) );
    this._mixValueUniform = Uniform.createFloat1( mixValue, 'MixValue' );
    stateSet.addUniform( this._mixValueUniform );
    this._fragmentName = 'BlendMix';
};

Composer.Filter.BlendMix.prototype = MACROUTILS.objectInherit( Composer.Filter.prototype, {
    getBlendFactorUniform: function () {
        return this._mixValueUniform;
    },

    build: function () {
        var stateSet = this._stateSet;
        var vtx = Composer.Filter.defaultVertexShader;
        var fgt = [
            '',
            Composer.Filter.defaultFragmentShaderHeader,
            'uniform sampler2D Texture1;',
            'uniform float MixValue;',

            'void main (void)',
            '{',
            '  gl_FragColor = mix(texture2D(Texture0,vTexCoord0), texture2D(Texture1,vTexCoord0),MixValue);',
            '}',
            ''
        ].join( '\n' );

        var program = new Program(
            new Shader( Shader.VERTEX_SHADER, vtx + this.getDefineVertexName() ),
            new Shader( Shader.FRAGMENT_SHADER, fgt + this.getDefineFragmentName() ) );

        stateSet.setAttributeAndModes( program );
        this._dirty = false;
    }
} );


Composer.Filter.BlendMultiply = function () {
    Composer.Filter.call( this );
    var stateSet = this._stateSet;
    var texture0, texture1;
    var unit0 = 0;
    var unit1 = 1;
    if ( arguments.length === 2 ) {
        texture0 = arguments[ 0 ];
        texture1 = arguments[ 1 ];
        unit0 = 1;
        unit0 = 2;
        stateSet.setTextureAttributeAndModes( unit0, texture0 );
    } else if ( arguments.length === 1 ) {
        texture1 = arguments[ 0 ];
    }
    stateSet.setTextureAttributeAndModes( unit1, texture1 );
    stateSet.addUniform( Uniform.createInt1( unit0, 'Texture0' ) );
    stateSet.addUniform( Uniform.createInt1( unit1, 'Texture1' ) );
    this._fragmentName = 'BlendMultiply';
};

Composer.Filter.BlendMultiply.prototype = MACROUTILS.objectInherit( Composer.Filter.prototype, {
    build: function () {
        var vtx = Composer.Filter.defaultVertexShader;
        var fgt = [
            '',
            Composer.Filter.defaultFragmentShaderHeader,
            'uniform sampler2D Texture1;',
            'uniform float MixValue;',

            'void main (void)',
            '{',
            '  gl_FragColor = texture2D(Texture0,vTexCoord0)*texture2D(Texture1,vTexCoord0);',
            '}',
            ''
        ].join( '\n' );

        var program = new Program(
            new Shader( Shader.VERTEX_SHADER, vtx + this.getDefineVertexName() ),
            new Shader( Shader.FRAGMENT_SHADER, fgt + this.getDefineFragmentName() ) );

        this._stateSet.setAttributeAndModes( program );
        this._dirty = false;
    }
} );

Composer.Filter.SSAO = function ( options ) {
    Composer.Filter.call( this );

    var stateSet = this._stateSet;
    var nbSamples = 16;
    var radius = 0.05;
    if ( options !== undefined ) {
        if ( options.nbSamples !== undefined )
            nbSamples = options.nbSamples;

        if ( options.radius !== undefined )
            radius = options.radius;
        var textureNormal = options.normal;
        var texturePosition = options.position;
        var w = textureNormal.getWidth();
        var h = textureNormal.getHeight();
        this._size = vec2.fromValues( w, h );

        stateSet.setTextureAttributeAndModes( 0, textureNormal );
        stateSet.setTextureAttributeAndModes( 1, texturePosition );
    }

    this._radius = radius;
    this._nbSamples = nbSamples;
    this._noiseTextureSize = 16;
    this._sceneRadius = 2.0;

    stateSet.addUniform( Uniform.createFloat1( 1.0, 'Power' ) );
    stateSet.addUniform( Uniform.createFloat1( radius, 'Radius' ) );
    stateSet.addUniform( Uniform.createInt1( 0, 'Texture0' ) );
    stateSet.addUniform( Uniform.createInt1( 1, 'Texture1' ) );
    stateSet.addUniform( Uniform.createInt1( 2, 'Texture2' ) );
    stateSet.addUniform( Uniform.createFloat1( 0.1, 'AngleLimit' ) );

    this.initNoise();
    this._fragmentName = 'SSAO';
};

Composer.Filter.SSAO.prototype = MACROUTILS.objectInherit( Composer.Filter.prototype, {

    initNoise: function () {
        var sizeNoise = this._noiseTextureSize;
        var noise = new Array( sizeNoise * sizeNoise * 3 );
        ( function ( array ) {
            var n = vec2.fromValues( 0.0, 0.0 );
            for ( var i = 0; i < sizeNoise * sizeNoise; i++ ) {
                n[ 0 ] = 2.0 * ( Math.random() - 0.5 );
                n[ 1 ] = 2.0 * ( Math.random() - 0.5 );

                vec2.normalize( n, n );
                array[ i * 3 + 0 ] = 255 * ( n[ 0 ] * 0.5 + 0.5 );
                array[ i * 3 + 1 ] = 255 * ( n[ 1 ] * 0.5 + 0.5 );
                array[ i * 3 + 2 ] = 255 * 0.5;
            }
        } )( noise );

        var noiseTexture = new Texture();
        noiseTexture.setWrapS( 'REPEAT' );
        noiseTexture.setWrapT( 'REPEAT' );
        noiseTexture.setMinFilter( 'NEAREST' );
        noiseTexture.setMagFilter( 'NEAREST' );

        noiseTexture.setTextureSize( sizeNoise, sizeNoise );
        noiseTexture.setImage( new Uint8Array( noise ), 'RGB' );
        this._noiseTexture = noiseTexture;
    },
    setSceneRadius: function ( value ) {
        this._sceneRadius = value;
        this.dirty();
    },
    setAngleLimit: function ( value ) {
        var uniform = this._stateSet.getUniform( 'AngleLimit' );
        uniform.setFloat( value );
    },
    setNbSamples: function ( value ) {
        if ( value === this._nbSamples ) {
            return;
        }
        this._nbSamples = Math.floor( value );
        this.dirty();
    },
    setRadius: function ( value ) {
        var uniform = this._stateSet.getUniform( 'Radius' );
        uniform.setFloat( value );
    },
    setPower: function ( value ) {
        var uniform = this._stateSet.getUniform( 'Power' );
        uniform.setFloat( value );
    },
    build: function () {
        var stateSet = this._stateSet;
        var nbSamples = this._nbSamples;
        var kernel = new Array( nbSamples * 4 );
        ( function ( array ) {
            var v = vec3.create();
            for ( var i = 0; i < nbSamples; i++ ) {
                v[ 0 ] = 2.0 * ( Math.random() - 0.5 );
                v[ 1 ] = 2.0 * ( Math.random() - 0.5 );
                v[ 2 ] = Math.random();

                vec3.normalize( v, v );
                var scale = Math.max( i / nbSamples, 0.1 );
                scale = 0.1 + ( 1.0 - 0.1 ) * ( scale * scale );
                array[ i * 3 + 0 ] = v[ 0 ];
                array[ i * 3 + 1 ] = v[ 1 ];
                array[ i * 3 + 2 ] = v[ 2 ];
                array[ i * 3 + 3 ] = scale;
            }
        } )( kernel );


        stateSet.setTextureAttributeAndModes( 2, this._noiseTexture );
        var uniform = stateSet.getUniform( 'noiseSampling' );
        if ( uniform === undefined ) {
            uniform = Uniform.createFloat2( vec2.fromValues( this._size[ 0 ] / this._noiseTextureSize, this._size[ 1 ] / this._noiseTextureSize ), 'noiseSampling' );
            stateSet.addUniform( uniform );
        } else {
            uniform.setVec2( vec2.fromValues( this._size[ 0 ] / this._noiseTextureSize, this._size[ 1 ] / this._noiseTextureSize ) );
        }
        var vertexShader = [
            '',
            'attribute vec3 Vertex;',
            'attribute vec2 TexCoord0;',
            'varying vec2 vTexCoord0;',
            'uniform mat4 uModelViewMatrix;',
            'uniform mat4 uProjectionMatrix;',
            'void main(void) {',
            '  gl_Position = uProjectionMatrix * uModelViewMatrix * vec4(Vertex,1.0);',
            '  vTexCoord0 = TexCoord0;',
            '}',
            ''
        ].join( '\n' );

        var kernelglsl = [];
        for ( var i = 0; i < nbSamples; i++ ) {
            kernelglsl.push( 'kernel[' + i + '] = vec4(' + kernel[ i * 3 ] + ',' + kernel[ i * 3 + 1 ] + ', ' + kernel[ i * 3 + 2 ] + ', ' + kernel[ i * 3 + 3 ] + ');' );
        }
        kernelglsl = kernelglsl.join( '\n' );

        //var ssaoRadiusMin = this._sceneRadius * 0.002;
        //var ssaoRadiusMax = this._sceneRadius * 0.05;
        //var ssaoRadiusStep = ( ssaoRadiusMax - ssaoRadiusMin ) / 200.0;

        var fragmentShader = [
            '',
            Composer.Filter.defaultFragmentShaderHeader,
            'uniform sampler2D Texture1;',
            'uniform sampler2D Texture2;',
            'uniform mat4 projection;',
            'uniform vec2 noiseSampling;',
            'uniform float Power;', //'+ '{ 'min': 0.1, 'max': 16.0, 'step': 0.1, 'value': 1.0 }',
            'uniform float Radius;', //'+ '{ 'min': ' + ssaoRadiusMin +', 'max': ' + ssaoRadiusMax + ', 'step': '+ ssaoRadiusStep + ', 'value': 0.01 }',
            'uniform float AngleLimit;',
            '#define NB_SAMPLES ' + this._nbSamples,
            'float depth;',
            'vec3 normal;',
            'vec4 position;',
            'vec4 kernel[' + nbSamples + '];',


            'mat3 computeBasis()',
            '{',
            '  vec2 uvrand = vTexCoord0*noiseSampling;',
            '  vec3 rvec = texture2D(Texture2, uvrand*2.0).xyz*2.0-vec3(1.0);',
            '  vec3 tangent = normalize(rvec - normal * dot(rvec, normal));',
            '  vec3 bitangent = cross(normal, tangent);',
            '  mat3 tbn = mat3(tangent, bitangent, normal);',
            '  return tbn;',
            '}',

            'void main (void)',
            '{',
            kernelglsl,
            '  position = texture2D(Texture1, vTexCoord0);',
            '  vec4 p = texture2D(Texture0, vTexCoord0);',
            '  depth = p.w;',
            '  normal = vec3(p);',
            '  if ( position.w == 0.0) {',
            '     gl_FragColor = vec4(1.0,1.0,1.0,0.0);',
            '     return;',
            '  }',
            '',
            ' mat3 tbn = computeBasis();',
            ' float occlusion = 0.0;',
            ' for (int i = 0; i < NB_SAMPLES; i++) {',
            '    vec3 vecKernel = vec3(kernel[i]);',
            '    vecKernel[2] = max(AngleLimit,vecKernel[2]);',
            '    vec3 sample = tbn * vecKernel;',
            '    vec3 dir = sample;',
            '    float w = dot(dir, normal);',
            '    float dist = 1.0-kernel[i].w;',
            '    w *= dist*dist*Power;',
            '    sample = dir * float(Radius) + position.xyz;',

            '    vec4 offset = projection * vec4(sample,1.0);',
            '    offset.xy /= offset.w;',
            '    offset.xy = offset.xy * 0.5 + 0.5;',

            '    float sample_depth = texture2D(Texture1, offset.xy).z;',
            '    float range_check = abs(sample.z - sample_depth) < float(Radius) ? 1.0 : 0.0;',
            '    occlusion += (sample_depth > sample.z ? 1.0 : 0.0) * range_check*w;',

            ' }',
            ' occlusion = 1.0 - (occlusion / float(NB_SAMPLES));',
            ' gl_FragColor = vec4(vec3(occlusion),1.0);',
            '}',
            ''
        ].join( '\n' );

        var program = new Program(
            new Shader( Shader.VERTEX_SHADER, vertexShader + this.getDefineVertexName() ),
            new Shader( Shader.FRAGMENT_SHADER, fragmentShader + this.getDefineFragmentName() ) );

        stateSet.setAttributeAndModes( program );
        this._dirty = false;
    }
} );

Composer.Filter.SSAO8 = function ( options ) {
    Composer.Filter.SSAO.call( this, options );
    this._fragmentName = 'SSAO8';
};

Composer.Filter.SSAO8.prototype = MACROUTILS.objectInherit( Composer.Filter.SSAO.prototype, {
    buildGeometry: function ( quad ) {
        quad.getAttributes().TexCoord1 = this._texCoord1;
        return quad;
    },
    build: function () {
        var stateSet = this._stateSet;
        var nbSamples = this._nbSamples;
        var kernel = new Array( nbSamples * 4 );
        //var angleLimit = this._angleLimit;
        ( function ( array ) {
            var v = vec3.create();
            for ( var i = 0; i < nbSamples; i++ ) {
                v[ 0 ] = 2.0 * ( Math.random() - 0.5 );
                v[ 1 ] = 2.0 * ( Math.random() - 0.5 );
                v[ 2 ] = Math.random();

                vec3.normalize( v, v );
                var scale = Math.max( i / nbSamples, 0.1 );
                scale = 0.1 + ( 1.0 - 0.1 ) * ( scale * scale );
                array[ i * 3 + 0 ] = v[ 0 ];
                array[ i * 3 + 1 ] = v[ 1 ];
                array[ i * 3 + 2 ] = v[ 2 ];
                array[ i * 3 + 3 ] = scale;
            }
        } )( kernel );

        //var sizeNoise = this._noiseTextureSize;
        stateSet.setTextureAttributeAndModes( 2, this._noiseTexture );
        var uniform = stateSet.getUniform( 'noiseSampling' );
        if ( uniform === undefined ) {
            uniform = Uniform.createFloat2( vec2.fromValues( this._size[ 0 ] / this._noiseTextureSize, this._size[ 1 ] / this._noiseTextureSize ), 'noiseSampling' );
            stateSet.addUniform( uniform );
        } else {
            uniform.setVec2( vec2.fromValues( this._size[ 0 ] / this._noiseTextureSize, this._size[ 1 ] / this._noiseTextureSize ) );
        }
        var vertexShader = [
            '',
            'attribute vec3 Vertex;',
            'attribute vec2 TexCoord0;',
            'attribute vec3 TexCoord1;',
            'varying vec2 vTexCoord0;',
            'varying vec3 vTexCoord1;',
            'uniform mat4 uModelViewMatrix;',
            'uniform mat4 uProjectionMatrix;',
            'void main(void) {',
            '  gl_Position = uProjectionMatrix * uModelViewMatrix * vec4(Vertex,1.0);',
            '  vTexCoord0 = TexCoord0;',
            '  vTexCoord1 = TexCoord1;',
            '}',
            ''
        ].join( '\n' );

        var kernelglsl = [];
        for ( var i = 0; i < nbSamples; i++ ) {
            kernelglsl.push( 'kernel[' + i + '] = vec4(' + kernel[ i * 3 ] + ',' + kernel[ i * 3 + 1 ] + ', ' + kernel[ i * 3 + 2 ] + ', ' + kernel[ i * 3 + 3 ] + ');' );
        }
        kernelglsl = kernelglsl.join( '\n' );

        //var ssaoRadiusMin = this._sceneRadius * 0.002;
        //var ssaoRadiusMax = this._sceneRadius * 0.05;
        //var ssaoRadiusStep = ( ssaoRadiusMax - ssaoRadiusMin ) / 200.0;

        var fragmentShader = [
            '',
            Composer.Filter.defaultFragmentShaderHeader,
            'varying vec3 vTexCoord1;',
            'uniform sampler2D Texture1;',
            'uniform sampler2D Texture2;',
            'uniform mat4 projection;',
            'uniform vec2 noiseSampling;',
            'uniform float Power;', //'+ '{ 'min': 0.1, 'max': 16.0, 'step': 0.1, 'value': 1.0 }',
            'uniform float Radius;', //'+ '{ 'min': ' + ssaoRadiusMin +', 'max': ' + ssaoRadiusMax + ', 'step': '+ ssaoRadiusStep + ', 'value': 0.01 }',
            'uniform float AngleLimit;',
            '#define NB_SAMPLES ' + this._nbSamples,
            'float depth;',
            'float znear, zfar, zrange;',
            'vec3 normal;',
            'vec3 position;',
            'vec4 kernel[' + nbSamples + '];',

            Composer.Filter.shaderUtils,

            'mat3 computeBasis()',
            '{',
            '  vec2 uvrand = vTexCoord0*noiseSampling;',
            '  //uvrand = rand(gl_FragCoord.xy);',
            '  vec3 rvec = texture2D(Texture2, uvrand*2.0).xyz*2.0-vec3(1.0);',
            '  //vec3 rvec = normalize(vec3(uvrand,0.0));',
            '  vec3 tangent = normalize(rvec - normal * dot(rvec, normal));',
            '  vec3 bitangent = cross(normal, tangent);',
            '  mat3 tbn = mat3(tangent, bitangent, normal);',
            '  return tbn;',
            '}',

            'float getDepthValue(vec4 v) {',
            '  float depth = unpack4x8ToFloat(v);',
            '  depth = depth*zrange+znear;',
            '  //depth = depth*zrange;',
            '  return -depth;',
            '}',

            'void main (void)',
            '{',
            kernelglsl,
            '  vec4 p = texture2D(Texture0, vTexCoord0);',
            '  if (dot(p,p) < 0.001) { ',
            '     gl_FragColor = vec4(1.0,1.0,1.0,0.0);',
            '     return;',
            '  }',
            '  znear = projection[3][2] / (projection[2][2]-1.0);',
            '  zfar = projection[3][2] / (projection[2][2]+1.0);',
            '  zrange = zfar-znear;',
            '  depth = getDepthValue(texture2D(Texture1, vTexCoord0));',
            //B = (A - znear)/(zfar-znear);',
            //B = A/(zfar-znear) - znear/(zfar-znear);',
            //B+ znear/(zfar-znear) = A/(zfar-znear) ;',
            //(zfar-znear)*(B+ znear/(zfar-znear)) = A ;',
            //(zfar-znear)*B+ znear = A ;',

            '  if ( -depth < znear) {',
            '     gl_FragColor = vec4(1.0,1.0,1.0,0.0);',
            '     return;',
            '  }',

            '  normal = decodeNormal(unpack4x8To2Float(p));',

            '  position = -vTexCoord1*depth;',
            '  position.z = -position.z;',

            '',
            ' mat3 tbn = computeBasis();',
            ' float occlusion = 0.0;',
            ' for (int i = 0; i < NB_SAMPLES; i++) {',
            '    vec3 vecKernel = vec3(kernel[i]);',
            '    vecKernel[2] = max(AngleLimit,vecKernel[2]);',
            '    vec3 sample = tbn * vec3(vecKernel);',
            '    vec3 dir = sample;',
            '    float w = dot(dir, normal);',
            '    float dist = 1.0-kernel[i].w;',
            '    w *= dist*dist*Power;',
            '    sample = dir * float(Radius) + position.xyz;',

            '    vec4 offset = projection * vec4(sample,1.0);',
            '    offset.xy /= offset.w;',
            '    offset.xy = offset.xy * 0.5 + 0.5;',

            '    float sample_depth = getDepthValue(texture2D(Texture1, offset.xy));',
            '    float range_check = abs(sample.z - sample_depth) < float(Radius) ? 1.0 : 0.0;',
            '    occlusion += (sample_depth > sample.z ? 1.0 : 0.0) * range_check*w;',

            ' }',
            ' occlusion = 1.0 - (occlusion / float(NB_SAMPLES));',
            ' gl_FragColor = vec4(vec3(occlusion),1.0);',
            '}',
            ''
        ].join( '\n' );

        var program = new Program(
            new Shader( Shader.VERTEX_SHADER, vertexShader + this.getDefineVertexName() ),
            new Shader( Shader.FRAGMENT_SHADER, fragmentShader + this.getDefineFragmentName() ) );

        stateSet.setAttributeAndModes( program );
        this._dirty = false;
    }
} );

module.exports = Composer;
