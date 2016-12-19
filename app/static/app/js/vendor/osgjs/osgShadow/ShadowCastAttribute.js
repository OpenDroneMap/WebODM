'use strict';
var MACROUTILS = require( 'osg/Utils' );
var StateAttribute = require( 'osg/StateAttribute' );


// Used to notify the Compiler to create a Depth Casting optimized shader
var ShadowCastAttribute = function ( disable, shadowReceiveAttribute ) {
    StateAttribute.call( this );
    this._enable = !disable;
    this._shadowReceiveAttribute = shadowReceiveAttribute;
};
ShadowCastAttribute.prototype = MACROUTILS.objectLibraryClass( MACROUTILS.objectInherit( StateAttribute.prototype, {
    attributeType: 'ShadowCast',
    cloneType: function () {
        return new ShadowCastAttribute( true );
    },
    //
    setReceiveAttribute: function ( shadowReceiveAttribute ) {
        this._shadowReceiveAttribute = shadowReceiveAttribute;
    },
    getReceiveAttribute: function () {
        return this._shadowReceiveAttribute;
    },
    getDefines: function () {
        if ( !this._shadowReceiveAttribute ) return undefined; // test here because of cloneType
        return this._shadowReceiveAttribute.getDefines();
    },
    getAlgorithm: function () {
        if ( !this._shadowReceiveAttribute ) return undefined; // test here because of cloneType
        return this._shadowReceiveAttribute.getAlgorithm();
    },
    getHash: function () {
        return 'ShadowCast' + this._enable + this._shadowReceiveAttribute.getAlgorithm() + this._shadowReceiveAttribute.getPrecision();
    },
    // need a isEnabled to let the ShaderGenerator to filter
    // StateAttribute from the shader compilation
    isEnabled: function () {
        return this._enable;
    }
} ), 'osgShadow', 'ShadowCastAttribute' );

MACROUTILS.setTypeID( ShadowCastAttribute );

module.exports = ShadowCastAttribute;
