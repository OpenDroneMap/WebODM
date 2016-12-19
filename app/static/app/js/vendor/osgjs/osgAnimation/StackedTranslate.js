'use strict';
var MACROUTILS = require( 'osg/Utils' );
var Object = require( 'osg/Object' );
var vec3 = require( 'osg/glMatrix' ).vec3;
var mat4 = require( 'osg/glMatrix' ).mat4;
var Target = require( 'osgAnimation/target' );


/**
 *  StackedTranslate
 */
var StackedTranslate = function ( name, translate ) {
    Object.call( this );
    this._target = Target.createVec3Target( translate || vec3.ZERO );
    if ( name ) this.setName( name );
};


StackedTranslate.prototype = MACROUTILS.objectInherit( Object.prototype, {

    init: function ( translate ) {
        this.setTranslate( translate );
        vec3.copy( this._target.defaultValue, translate );
    },

    setTranslate: function ( translate ) {
        vec3.copy( this._target.value, translate );
    },

    getTarget: function () {
        return this._target;
    },

    resetToDefaultValue: function () {
        this.setTranslate( this._target.defaultValue );
    },

    applyToMatrix: function ( m ) {
        mat4.translate( m, m, this._target.value );
    }
} );

module.exports = StackedTranslate;
