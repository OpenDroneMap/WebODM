'use strict';
var MACROUTILS = require( 'osg/Utils' );
var Object = require( 'osg/Object' );
var mat4 = require( 'osg/glMatrix' ).mat4;
var Target = require( 'osgAnimation/target' );


var StackedMatrix = function ( name, matrix ) {
    Object.call( this );
    this._target = Target.createMatrixTarget( matrix || mat4.IDENTITY );
    if ( name ) this.setName( name );
};

StackedMatrix.prototype = MACROUTILS.objectInherit( Object.prototype, {

    init: function ( matrix ) {
        this.setMatrix( matrix );
        mat4.copy( this._target.defaultValue, matrix );
    },

    getTarget: function () {
        return this._target;
    },

    getMatrix: function () {
        return this._target.value;
    },

    setMatrix: function ( m ) {
        mat4.copy( this._target.value, m );
    },

    resetToDefaultValue: function () {
        this.setMatrix( this._target.defaultValue );
    },

    applyToMatrix: function ( m ) {
        mat4.mul( m, m, this._target.value );
    }

} );

module.exports = StackedMatrix;
