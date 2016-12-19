'use strict';
var MACROUTILS = require( 'osg/Utils' );
var StateAttribute = require( 'osg/StateAttribute' );
var vec4 = require( 'osg/glMatrix' ).vec4;
var Uniform = require( 'osg/Uniform' );
var Map = require( 'osg/Map' );

// Define a material attribute
var Material = function () {
    StateAttribute.call( this );
    this._ambient = vec4.fromValues( 0.2, 0.2, 0.2, 1.0 );
    this._diffuse = vec4.fromValues( 0.8, 0.8, 0.8, 1.0 );
    this._specular = vec4.fromValues( 0.0, 0.0, 0.0, 1.0 );
    this._emission = vec4.fromValues( 0.0, 0.0, 0.0, 1.0 );
    this._shininess = 12.5;
};

Material.prototype = MACROUTILS.objectLibraryClass( MACROUTILS.objectInherit( StateAttribute.prototype, {

    attributeType: 'Material',

    cloneType: function () {
        return new Material();
    },

    getParameterName: function ( name ) {
        return 'u' + this.getType() + '_' + name;
    },

    getOrCreateUniforms: function () {
        var obj = Material;
        if ( obj.uniforms ) return obj.uniforms;

        var uniformList = {
            ambient: Uniform.createFloat4( 'uMaterialAmbient' ),
            diffuse: Uniform.createFloat4( 'uMaterialDiffuse' ),
            specular: Uniform.createFloat4( 'uMaterialSpecular' ),
            emission: Uniform.createFloat4( 'uMaterialEmission' ),
            shininess: Uniform.createFloat1( 'uMaterialShininess' )
        };

        obj.uniforms = new Map( uniformList );
        return obj.uniforms;
    },

    setEmission: function ( a ) {
        vec4.copy( this._emission, a );
    },

    getEmission: function () {
        return this._emission;
    },

    setAmbient: function ( a ) {
        vec4.copy( this._ambient, a );
    },

    getAmbient: function () {
        return this._ambient;
    },

    setSpecular: function ( a ) {
        vec4.copy( this._specular, a );
    },

    getSpecular: function () {
        return this._specular;
    },

    setDiffuse: function ( a ) {
        vec4.copy( this._diffuse, a );
    },

    getDiffuse: function () {
        return this._diffuse;
    },

    setShininess: function ( a ) {
        this._shininess = a;
    },

    getShininess: function () {
        return this._shininess;
    },

    setTransparency: function ( a ) {
        this._diffuse[ 3 ] = 1.0 - a;
    },

    getTransparency: function () {
        return this._diffuse[ 3 ];
    },

    apply: function () {
        var uniforms = this.getOrCreateUniforms();

        uniforms.ambient.setFloat4( this._ambient );
        uniforms.diffuse.setFloat4( this._diffuse );
        uniforms.specular.setFloat4( this._specular );
        uniforms.emission.setFloat4( this._emission );
        uniforms.shininess.setFloat( this._shininess );

    }


} ), 'osg', 'Material' );

module.exports = Material;
