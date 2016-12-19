'use strict';
var Notify = require( 'osg/notify' );
var WebGLUtils = require( 'osgViewer/webgl-utils' );
var Texture;

var WebGLCaps = function () {

    // circular deps with texture
    if ( !Texture ) Texture = require( 'osg/Texture' );

    this._checkRTT = {};
    this._webGLExtensions = {};
    this._webGLParameters = {};
    this._webGLShaderMaxInt = 'NONE';
    this._webGLShaderMaxFloat = 'NONE';

    this._bugsDB = {};
    this._webGLPlatforms = {};

    // webgl minimum requirements as per webgl specs
    // useful for nodejs env
    this._webGLParameters[ 'MAX_COMBINED_TEXTURE_IMAGE_UNITS' ] = 8;
    this._webGLParameters[ 'MAX_CUBE_MAP_TEXTURE_SIZE' ] = 16;
    this._webGLParameters[ 'MAX_FRAGMENT_UNIFORM_VECTORS' ] = 16;
    this._webGLParameters[ 'MAX_RENDERBUFFER_SIZE' ] = 1;
    this._webGLParameters[ 'MAX_TEXTURE_IMAGE_UNITS' ] = 8;
    this._webGLParameters[ 'MAX_TEXTURE_SIZE' ] = 64;
    this._webGLParameters[ 'MAX_VARYING_VECTORS' ] = 8;
    this._webGLParameters[ 'MAX_VERTEX_ATTRIBS' ] = 8;
    this._webGLParameters[ 'MAX_VERTEX_TEXTURE_IMAGE_UNITS' ] = 0;
    this._webGLParameters[ 'MAX_VERTEX_UNIFORM_VECTORS' ] = 128;
    this._webGLParameters[ 'MAX_VIEWPORT_DIMS' ] = [ 1, 1 ];
    this._webGLParameters[ 'NUM_COMPRESSED_TEXTURE_FORMATS' ] = 0;
    this._webGLParameters[ 'MAX_SHADER_PRECISION_FLOAT' ] = 'none';
    this._webGLParameters[ 'MAX_SHADER_PRECISION_INT' ] = 'none';

    // for multiple context
    // allow checking we're on the good one
    this._gl = undefined;

};

WebGLCaps.instance = function ( glParam ) {


    if ( !WebGLCaps._instance ) {

        var oldWebGLInspector;
        var gl = glParam;

        if ( !gl ) {

            // make sure we don't break webglinspector
            // with our webglcaps canvas
            var webglInspector = typeof window !== 'undefined' && window.gli;

            if ( webglInspector ) {

                oldWebGLInspector = window.gli.host.inspectContext;
                window.gli.host.inspectContext = false;

            }

            var c = document.createElement( 'canvas' );
            c.width = 32;
            c.height = 32;
            // not necessary, but for some reasons it crashed on chromium vr build
            var opt = {
                antialias: false
            };

            gl = WebGLUtils.setupWebGL( c, opt, function () {} );

        }

        WebGLCaps._instance = new WebGLCaps();
        if ( gl ) {

            WebGLCaps._instance.init( gl );

        } else {

            // gracefully handle non webgl
            // like nodejs, phantomjs
            // warns but no error so that nodejs/phantomjs
            // can still has some webglcaps object
            Notify.warn( 'no support for webgl context detected.' );

        }

        if ( oldWebGLInspector ) {

            window.gli.host.inspectContext = oldWebGLInspector;

        }

        //delete c;
    }

    if ( glParam && glParam !== WebGLCaps._instance.getContext() ) {

        // webgl caps called with a different context
        // than the one we draw in, will result on hard crash
        // when using extension from another context
        WebGLCaps._instance.initContextDependant( glParam );

    }

    return WebGLCaps._instance;
};

WebGLCaps.prototype = {

    getContext: function () {
        return this._gl;
    },

    initContextDependant: function ( gl ) {

        // store context in case of multiple context
        this._gl = gl;

        // Takes care of circular dependencies on Texture
        // Texture should be resolved at this point
        // Texture = require( 'osg/Texture' );

        // get extensions
        this.initWebGLExtensions( gl );

        // get float support
        this.hasLinearHalfFloatRTT( gl );
        this.hasLinearFloatRTT( gl );
        this.hasHalfFloatRTT( gl );
        this.hasFloatRTT( gl );

    },

    init: function ( gl ) {

        // get capabilites
        this.initWebGLParameters( gl );

        // order is important
        // to allow webgl extensions filtering
        this.initPlatformSupport();
        this.initBugDB();

        this.initContextDependant( gl );

        this._isGL2 = typeof window.WebGL2RenderingContext !== 'undefined' && gl instanceof window.WebGL2RenderingContext;

        if ( this._isGL2 ) {


            // osgjs code is webgl1, so we fake webgl2 capabilities
            // and calls for retrocompatibility with webgl1
            this._checkRTT[ Texture.FLOAT + ',' + Texture.NEAREST ] = true;
            this._checkRTT[ Texture.HALF_FLOAT + ',' + Texture.NEAREST ] = true;
            this._checkRTT[ Texture.FLOAT + ',' + Texture.LINEAR ] = true;
            this._checkRTT[ Texture.HALF_FLOAT + ',' + Texture.LINEAR ] = true;

            var nativeExtension = [
                'OES_element_index_uint',
                'EXT_sRGB',
                'EXT_blend_minmax',
                'EXT_frag_depth',
                'WEBGL_depth_texture',
                'EXT_shader_texture_lod',
                'OES_standard_derivatives',
                'OES_texture_float',
                'OES_texture_half_float',
                'OES_vertex_array_object',
                'WEBGL_draw_buffers',
                'OES_fbo_render_mipmap',
                'ANGLE_instanced_arrays'
            ];

            var ext = WebGLCaps._instance.getWebGLExtensions();
            var dummyFunc = function () {};
            for ( var i = 0, l = nativeExtension.length; i < l; i++ ) {
                ext[ nativeExtension[ i ] ] = dummyFunc;
            }
        }

    },

    isWebGL2: function () {
        return this._isGL2;
    },
    // inevitable bugs per platform (browser/OS/GPU)
    initBugDB: function () {

    },
    initPlatformSupport: function () {

        var p = this._webGLPlatforms;

        p.Apple = navigator.vendor.indexOf( 'Apple' ) !== -1 || navigator.vendor.indexOf( 'OS X' ) !== -1;

        // degrades complexity on handhelds.
        p.Mobile = /Mobi/.test( navigator.userAgent ) || /ablet/.test( navigator.userAgent );

    },
    getWebGLPlatform: function ( str ) {
        return this._webGLPlatforms[ str ];
    },
    getWebGLPlatforms: function () {
        return this._webGLPlatforms;
    },

    getWebGLParameter: function ( str ) {
        return this._webGLParameters[ str ];
    },
    getWebGLParameters: function () {
        return this._webGLParameters;
    },
    getShaderMaxPrecisionFloat: function () {
        return this._webGLParameters.MAX_SHADER_PRECISION_FLOAT;
    },
    getShaderMaxPrecisionInt: function () {
        return this._webGLParameters.MAX_SHADER_PRECISION_INT;
    },
    checkSupportRTT: function ( gl, typeFloat, typeTexture ) {

        var key = typeFloat + ',' + typeTexture;

        // check once only
        if ( this._checkRTT[ key ] !== undefined )
            return this._checkRTT[ key ];

        // no cached results, need gl context
        if ( !gl ) return false;

        // from http://codeflow.org/entries/2013/feb/22/how-to-write-portable-webgl/#how-can-i-detect-if-i-can-render-to-floating-point-textures

        // setup the texture
        var texture = gl.createTexture();
        gl.bindTexture( gl.TEXTURE_2D, texture );
        gl.texImage2D( gl.TEXTURE_2D, 0, gl.RGBA, 2, 2, 0, gl.RGBA, typeFloat, null );
        gl.texParameteri( gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, typeTexture );
        gl.texParameteri( gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, typeTexture );

        // setup the framebuffer
        var framebuffer = gl.createFramebuffer();
        gl.bindFramebuffer( gl.FRAMEBUFFER, framebuffer );
        gl.framebufferTexture2D( gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, texture, 0 );

        // check the framebuffer
        var status = this._checkRTT[ key ] = gl.checkFramebufferStatus( gl.FRAMEBUFFER ) === gl.FRAMEBUFFER_COMPLETE;

        // cleanup
        gl.deleteTexture( texture );
        gl.deleteFramebuffer( framebuffer );
        gl.bindTexture( gl.TEXTURE_2D, null );
        gl.bindFramebuffer( gl.FRAMEBUFFER, null );

        return status;
    },
    hasLinearHalfFloatRTT: function ( gl ) {
        return this._webGLExtensions[ 'OES_texture_half_float_linear' ] && this.checkSupportRTT( gl, Texture.HALF_FLOAT, Texture.LINEAR );
    },
    hasLinearFloatRTT: function ( gl ) {
        return this._webGLExtensions[ 'OES_texture_float_linear' ] && this.checkSupportRTT( gl, Texture.FLOAT, Texture.LINEAR );
    },
    hasHalfFloatRTT: function ( gl ) {
        return this._webGLExtensions[ 'OES_texture_half_float' ] && this.checkSupportRTT( gl, Texture.HALF_FLOAT, Texture.NEAREST );
    },
    hasFloatRTT: function ( gl ) {
        return this._webGLExtensions[ 'OES_texture_float' ] && this.checkSupportRTT( gl, Texture.FLOAT, Texture.NEAREST );
    },
    queryPrecision: function ( gl, shaderType, precision ) {
        var answer = gl.getShaderPrecisionFormat( shaderType, precision );
        if ( !answer ) return false;
        return answer.precision !== 0;
    },
    initWebGLParameters: function ( gl ) {
        if ( !gl ) return;
        var limits = [
            'MAX_COMBINED_TEXTURE_IMAGE_UNITS',
            'MAX_CUBE_MAP_TEXTURE_SIZE',
            'MAX_FRAGMENT_UNIFORM_VECTORS',
            'MAX_RENDERBUFFER_SIZE',
            'MAX_TEXTURE_IMAGE_UNITS',
            'MAX_TEXTURE_SIZE',
            'MAX_VARYING_VECTORS',
            'MAX_VERTEX_ATTRIBS',
            'MAX_VERTEX_TEXTURE_IMAGE_UNITS',
            'MAX_VERTEX_UNIFORM_VECTORS',
            'MAX_VIEWPORT_DIMS',
            'SHADING_LANGUAGE_VERSION',
            'VERSION',
            'VENDOR',
            'RENDERER',
            'ALIASED_LINE_WIDTH_RANGE',
            'ALIASED_POINT_SIZE_RANGE',
            'RED_BITS',
            'GREEN_BITS',
            'BLUE_BITS',
            'ALPHA_BITS',
            'DEPTH_BITS',
            'STENCIL_BITS'
        ];
        var params = this._webGLParameters;
        for ( var i = 0, len = limits.length; i < len; ++i ) {
            var par = limits[ i ];
            params[ par ] = gl.getParameter( gl[ par ] );
        }

        //shader precisions for float
        if ( this.queryPrecision( gl, gl.FRAGMENT_SHADER, gl.HIGH_FLOAT ) ) {
            params.MAX_SHADER_PRECISION_FLOAT = 'high';
        } else if ( this.queryPrecision( gl, gl.FRAGMENT_SHADER, gl.MEDIUM_FLOAT ) ) {
            params.MAX_SHADER_PRECISION_FLOAT = 'medium';
        } else if ( this.queryPrecision( gl, gl.FRAGMENT_SHADER, gl.LOW_FLOAT ) ) {
            params.MAX_SHADER_PRECISION_FLOAT = 'low';
        }

        //shader precisions for float
        if ( this.queryPrecision( gl, gl.FRAGMENT_SHADER, gl.HIGH_INT ) ) {
            params.MAX_SHADER_PRECISION_INT = 'high';
        } else if ( this.queryPrecision( gl, gl.FRAGMENT_SHADER, gl.MEDIUM_INT ) ) {
            params.MAX_SHADER_PRECISION_INT = 'medium';
        } else if ( this.queryPrecision( gl, gl.FRAGMENT_SHADER, gl.LOW_INT ) ) {
            params.MAX_SHADER_PRECISION_INT = 'low';
        }

        // get GPU, Angle or not, Opengl/directx, etc.
        //  ffx && chrome only
        var debugInfo = gl.getExtension( 'WEBGL_debug_renderer_info' );
        if ( debugInfo ) {
            params.UNMASKED_RENDERER_WEBGL = gl.getParameter( debugInfo.UNMASKED_VENDOR_WEBGL );
            params.UNMASKED_VENDOR_WEBGL = gl.getParameter( debugInfo.UNMASKED_RENDERER_WEBGL );

        }
        // TODO ?
        // try to compile a small shader to test the spec is respected
    },
    getWebGLExtension: function ( str ) {
        return this._webGLExtensions[ str ];
    },
    getWebGLExtensions: function () {
        return this._webGLExtensions;
    },
    initWebGLExtensions: function ( gl, filterBugs ) {

        // nodejs, phantomjs
        if ( !gl ) return;

        var doFilter = filterBugs;
        if ( doFilter === undefined )
            doFilter = true;

        var supported = gl.getSupportedExtensions();
        var ext = this._webGLExtensions;
        // we load all the extensions
        for ( var i = 0, len = supported.length; i < len; ++i ) {
            var sup = supported[ i ];

            if ( doFilter && this._bugsDB[ sup ] ) {
                // bugs on that configuration, do not enable
                continue;
            }

            ext[ sup ] = gl.getExtension( sup );
        }

        var anisoExt = this.getWebGLExtension( 'EXT_texture_filter_anisotropic' );
        if ( anisoExt ) {
            Texture.ANISOTROPIC_SUPPORT_EXT = true;
            Texture.ANISOTROPIC_SUPPORT_MAX = gl.getParameter( anisoExt.MAX_TEXTURE_MAX_ANISOTROPY_EXT );
        }

    }
};

module.exports = WebGLCaps;
