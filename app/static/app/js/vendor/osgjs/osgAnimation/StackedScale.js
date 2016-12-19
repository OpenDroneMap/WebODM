'use strict';
var MACROUTILS = require( 'osg/Utils' );
var Object = require( 'osg/Object' );
var mat4 = require( 'osg/glMatrix' ).mat4;
var vec3 = require( 'osg/glMatrix' ).vec3;
var Target = require( 'osgAnimation/target' );


var StackedScale = function ( name, scale ) {
    Object.call( this );
    this._target = Target.createVec3Target( scale || vec3.ONE );
    if ( name ) this.setName( name );
};


StackedScale.prototype = MACROUTILS.objectInherit( Object.prototype, {

    init: function ( scale ) {
        this.setScale( scale );
        vec3.copy( this._target.defaultValue, scale );
    },

    setScale: function ( scale ) {
        vec3.copy( this._target.value, scale );
    },

    getTarget: function () {
        return this._target;
    },

    resetToDefaultValue: function () {
        this.setScale( this._target.defaultValue );
    },

    // must be optimized
    applyToMatrix: function ( m ) {

        var scale = this._target.value;
        mat4.scale( m, m, scale );

    }

} );

module.exports = StackedScale;
