'use strict';
var ShaderGenerator = require( 'osgShader/ShaderGenerator' );
var ShadowCompiler = require( 'osgShadow/ShadowCastCompiler' );

var ShaderGeneratorShadowCast = function () {

    ShaderGenerator.apply( this, arguments );
    this.setShaderCompiler( ShadowCompiler );
    // only one attribute makes change to the compilation
    // ignore all others
    this._acceptAttributeTypes = new window.Set( [ 'ShadowCast', 'Skinning', 'Morph' ] );

};

ShaderGeneratorShadowCast.prototype = ShaderGenerator.prototype;

module.exports = ShaderGeneratorShadowCast;
