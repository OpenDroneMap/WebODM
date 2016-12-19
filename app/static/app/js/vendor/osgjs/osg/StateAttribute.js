'use strict';
var MACROUTILS = require( 'osg/Utils' );
var Object = require( 'osg/Object' );


var StateAttribute = function () {
    Object.call( this );
};

StateAttribute.prototype = MACROUTILS.objectLibraryClass( MACROUTILS.objectInherit( Object.prototype, {

    getType: function () {
        return this.attributeType;
    },

    // basically, if you want two StateAttribute with the same attributeType in a stateSet/State
    // their typeMember should be different
    getTypeMember: function () {
        return this.attributeType;
    },

    apply: function () {},

    // getHash is used by the compiler to know if a change in a StateAttribute
    // must trigger a shader build
    // If you create your own attribute you will have to customize this function
    // a good rule is to that if you change uniform it should not rebuild a shader
    // but if you change a type or representation of your StateAttribute, then it should
    // if it impact the rendering.
    // check other attributes for examples
    getHash: function () {
        return this.getTypeMember();
    }

} ), 'osg', 'StateAttribute' );

StateAttribute.OFF = 0;
StateAttribute.ON = 1;
StateAttribute.OVERRIDE = 2;
StateAttribute.PROTECTED = 4;
StateAttribute.INHERIT = 8;

module.exports = StateAttribute;
