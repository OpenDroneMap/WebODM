'use strict';
var ShaderGenerator = require( 'osgShader/ShaderGenerator' );
var ShadowCastShaderGenerator = require( 'osgShadow/ShadowCastShaderGenerator' );
var DisplayNormalVisitor = require( 'osgUtil/DisplayNormalVisitor' );
var DisplayGeometryVisitor = require( 'osgUtil/DisplayGeometryVisitor' );

var ShaderGeneratorProxy = function () {

    // object of shader generators
    this._generators = new window.Map();
    this.addShaderGenerator( 'default', new ShaderGenerator() );
    this.addShaderGenerator( 'ShadowCast', new ShadowCastShaderGenerator() );
    this.addShaderGenerator( 'debugNormal', new DisplayNormalVisitor.ShaderGeneratorCompilerOffsetNormal() );
    this.addShaderGenerator( 'debugTangent', new DisplayNormalVisitor.ShaderGeneratorCompilerOffsetTangent() );
    this.addShaderGenerator( 'debugGeometry', new DisplayGeometryVisitor.ShaderGeneratorCompilerColorGeometry() );
    this.addShaderGenerator( 'debugSkinning', new DisplayGeometryVisitor.ShaderGeneratorCompilerColorSkinning() );

    return this;
};

ShaderGeneratorProxy.prototype = {

    getShaderGenerator: function ( name ) {

        if ( !name )
            return this._generators.get( 'default' );

        return this._generators.get( name );
    },

    // user-space facility to provide its own
    addShaderGenerator: function ( name, sg ) {

        this._generators.set( name, sg );

    }

};

module.exports = ShaderGeneratorProxy;
