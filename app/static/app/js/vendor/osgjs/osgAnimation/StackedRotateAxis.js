'use strict';
var MACROUTILS = require( 'osg/Utils' );
var Object = require( 'osg/Object' );
var mat4 = require( 'osg/glMatrix' ).mat4;
var vec3 = require( 'osg/glMatrix' ).vec3;
var quat = require( 'osg/glMatrix' ).quat;
var Target = require( 'osgAnimation/target' );


var StackedRotateAxis = function ( name, axis, angle ) {
    Object.call( this );
    this._axis = vec3.fromValues( 0, 0, 1 );
    if ( axis ) vec3.copy( this._axis, axis );
    this._target = Target.createFloatTarget( typeof angle === 'number' ? angle : 0.0 );
    if ( name ) this.setName( name );
};

StackedRotateAxis.prototype = MACROUTILS.objectInherit( Object.prototype, {

    init: function ( axis, angle ) {
        this.setAxis( axis );
        this.setAngle( angle );
        this._target.defaultValue = angle;
    },

    setAxis: function ( axis ) {
        vec3.copy( this._axis, axis );
    },

    setAngle: function ( angle ) {
        this._target.value = angle;
    },

    getTarget: function () {
        return this._target;
    },

    resetToDefaultValue: function () {
        this.setAngle( this._target.defaultValue );
    },

    applyToMatrix: ( function () {
        var matrixTmp = mat4.create();
        var quatTmp = quat.create();

        return function ( m ) {
            var axis = this._axis;
            var qtmp = quatTmp;
            var mtmp = matrixTmp;
            var angle = this._target.value;

            quat.setAxisAngle( qtmp, axis, angle );
            mat4.fromQuat( mtmp, qtmp );
            mat4.mul( m, m, mtmp );
        };
    } )()

} );

module.exports = StackedRotateAxis;
