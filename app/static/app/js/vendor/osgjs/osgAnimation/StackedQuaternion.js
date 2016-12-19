'use strict';
var MACROUTILS = require( 'osg/Utils' );
var Object = require( 'osg/Object' );
var mat4 = require( 'osg/glMatrix' ).mat4;
var quat = require( 'osg/glMatrix' ).quat;
var Target = require( 'osgAnimation/target' );

var qIdentity = quat.create();

var StackedQuaternion = function ( name, q ) {
    Object.call( this );
    this._target = Target.createQuatTarget( q || qIdentity );
    if ( name ) this.setName( name );
};

StackedQuaternion.prototype = MACROUTILS.objectInherit( Object.prototype, {

    init: function ( q ) {
        this.setQuaternion( q );
        quat.copy( this._target.defaultValue, q );
    },

    setQuaternion: function ( q ) {
        quat.copy( this._target.value, q );
    },

    getTarget: function () {
        return this._target;
    },

    resetToDefaultValue: function () {
        this.setQuaternion( this._target.defaultValue );
    },

    applyToMatrix: ( function () {
        var matrixTmp = mat4.create();

        return function applyToMatrix( m ) {
            var mtmp = matrixTmp;
            mat4.fromQuat( mtmp, this._target.value );
            mat4.mul( m, m, mtmp );
        };
    } )()

} );

module.exports = StackedQuaternion;
