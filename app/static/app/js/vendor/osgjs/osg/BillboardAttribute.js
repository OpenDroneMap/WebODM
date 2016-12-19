'use strict';
var MACROUTILS = require( 'osg/Utils' );
var StateAttribute = require( 'osg/StateAttribute' );


var BillboardAttribute = function () {
    StateAttribute.call( this );
    this._attributeEnable = false;
};

BillboardAttribute.prototype = MACROUTILS.objectLibraryClass( MACROUTILS.objectInherit( StateAttribute.prototype, {

    attributeType: 'Billboard',

    cloneType: function () {
        return new BillboardAttribute();
    },

    setEnabled: function ( state ) {
        this._attributeEnable = state;
    },

    isEnabled: function () {
        return this._attributeEnable;
    },

    apply: function () {}

} ), 'osg', 'Billboard' );

module.exports = BillboardAttribute;
