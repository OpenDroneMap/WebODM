'use strict';
var Map = require( 'osg/Map' );
var MACROUTILS = require( 'osg/Utils' );
var StateAttribute = require( 'osg/StateAttribute' );
var Uniform = require( 'osg/Uniform' );


/**
 * SkinningAttribute encapsulate Animation State
 * @class SkinningAttribute
 * @inherits StateAttribute
 */
var SkinningAttribute = function ( disable, boneUniformSize ) {
    StateAttribute.call( this );
    this._enable = !disable;
    // optional, if it's not provided, it will fall back to the maximum bone uniform size
    // boneUniformSize represents the number of vec4 (uniform) used in the shader for all the bones
    this._boneUniformSize = boneUniformSize;
};

SkinningAttribute.uniforms = {};
SkinningAttribute.maxBoneUniformSize = 1;
SkinningAttribute.maxBoneUniformAllowed = Infinity; // can be overriden by application specific limit on startup (typically gl limit)

SkinningAttribute.prototype = MACROUTILS.objectLibraryClass( MACROUTILS.objectInherit( StateAttribute.prototype, {

    attributeType: 'Skinning',

    cloneType: function () {
        return new SkinningAttribute( true );
    },

    setBoneUniformSize: function ( boneUniformSize ) {
        this._boneUniformSize = boneUniformSize;
    },

    getBoneUniformSize: function () {
        return this._boneUniformSize !== undefined ? this._boneUniformSize : SkinningAttribute.maxBoneUniformSize;
    },

    getOrCreateUniforms: function () {
        var obj = SkinningAttribute;
        var unifHash = this.getBoneUniformSize();

        if ( obj.uniforms[ unifHash ] ) return obj.uniforms[ unifHash ];

        var uniforms = {};
        uniforms.uBones = Uniform.createFloat4Array( 'uBones' );
        obj.uniforms[ unifHash ] = new Map( uniforms );

        return obj.uniforms[ unifHash ];
    },

    setMatrixPalette: function ( matrixPalette ) {
        this._matrixPalette = matrixPalette;
        // update max bone size
        if ( this._boneUniformSize === undefined ) {
            SkinningAttribute.maxBoneUniformSize = Math.max( SkinningAttribute.maxBoneUniformSize, matrixPalette.length / 4 );
            SkinningAttribute.maxBoneUniformSize = Math.min( SkinningAttribute.maxBoneUniformAllowed, SkinningAttribute.maxBoneUniformSize );
        }
    },

    getMatrixPalette: function () {
        return this._matrixPalette;
    },

    // need a isEnabled to let the ShaderGenerator to filter
    // StateAttribute from the shader compilation
    isEnabled: function () {
        return this._enable;
    },

    getHash: function () {
        // bonesize is important, as the shader itself
        // has a different code and uniform are not shared
        // geoms have each their own bones matrix palette
        // it's up to rigGeometry to use same anim Attrib per
        // same bone matrix palette
        // as uniform array size must be statically declared
        // in shader code
        return this.getTypeMember() + this.getBoneUniformSize() + this.isEnabled();
    },

    apply: function () {

        if ( !this._enable ) return;

        this.getOrCreateUniforms().uBones.setInternalArray( this._matrixPalette );

    }

} ), 'osgAnimation', 'SkinningAttribute' );

MACROUTILS.setTypeID( SkinningAttribute );

module.exports = SkinningAttribute;
