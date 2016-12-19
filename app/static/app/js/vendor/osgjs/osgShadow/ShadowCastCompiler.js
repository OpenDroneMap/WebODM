'use strict';
var MACROUTILS = require( 'osg/Utils' );
var Compiler = require( 'osgShader/Compiler' );


var CompilerShadowCast = function () {
    Compiler.apply( this, arguments );
};

CompilerShadowCast.prototype = MACROUTILS.objectInherit( Compiler.prototype, {
    getCompilerName: function () {
        return 'ShadowCast';
    },

    getFragmentShaderName: function () {
        return this.getCompilerName();
    },

    initAttributes: function () {
        var attributes = this._attributes;

        for ( var i = 0, l = attributes.length; i < l; i++ ) {

            var type = attributes[ i ].className();

            if ( type === 'ShadowCastAttribute' ) {
                this._shadowCastAttribute = attributes[ i ];
            } else if ( type === 'Billboard' ) {
                this._isBillboard = !!attributes[ i ];
            } else if ( type === 'SkinningAttribute' ) {
                this._skinningAttribute = attributes[ i ];
            } else if ( type === 'MorphAttribute' ) {
                this._morphAttribute = attributes[ i ];
            }
        }
    },

    registerTextureAttributes: function () {},

    // Depth Shadow Map Casted from Light POV Depth encoded in color buffer
    createShadowCastDepth: function ( out ) {

        this.getNode( 'ShadowCast' ).setShadowCastAttribute( this._shadowCastAttribute ).inputs( {

            exponent0: this.getOrCreateUniform( 'float', 'exponent0' ),
            exponent1: this.getOrCreateUniform( 'float', 'exponent1' ),
            shadowDepthRange: this.getOrCreateUniform( 'vec4', 'uShadowDepthRange' ),
            fragEye: this.getOrCreateVarying( 'vec4', 'vViewVertex' )

        } ).outputs( {

            color: out

        } );

        return out;
    },

    // encapsulate for easier overwrite by user defined compiler
    // that would inherint from this compiler Do not merge with above method
    createFragmentShaderGraph: function () {
        var frag = this.getNode( 'glFragColor' );
        return [ this.createShadowCastDepth( frag ) ];
    }

} );

module.exports = CompilerShadowCast;
