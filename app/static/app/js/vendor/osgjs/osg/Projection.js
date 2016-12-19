'use strict';
var MACROUTILS = require( 'osg/Utils' );
var Node = require( 'osg/Node' );
var mat4 = require( 'osg/glMatrix' ).mat4;

var Projection = function () {
    Node.call( this );
    this.projection = mat4.create();
};
Projection.prototype = MACROUTILS.objectInherit( Node.prototype, {
    getProjectionMatrix: function () {
        return this.projection;
    },
    setProjectionMatrix: function ( m ) {
        this.projection = m;
    }
} );

MACROUTILS.setTypeID( Projection );

module.exports = Projection;
