'use strict';
var MACROUTILS = require( 'osg/Utils' );
var mat4 = require( 'osg/glMatrix' ).mat4;
var Transform = require( 'osg/Transform' );
var TransformEnums = require( 'osg/transformEnums' );


/**
 *  MatrixTransform is a Transform Node that can be customized with user matrix
 *  @class MatrixTransform
 */
var MatrixTransform = function () {
    Transform.call( this );
    this.matrix = mat4.create();
};

/** @lends MatrixTransform.prototype */
MatrixTransform.prototype = MACROUTILS.objectLibraryClass( MACROUTILS.objectInherit( Transform.prototype, {

    getMatrix: function () {
        return this.matrix;
    },

    setMatrix: function ( m ) {
        this.matrix = m;
        this.dirtyBound();
    },

    // local to "local world" (not Global World)
    computeLocalToWorldMatrix: function ( matrix /*, nodeVisitor */ ) {

        if ( this.referenceFrame === TransformEnums.RELATIVE_RF ) {
            mat4.mul( matrix, matrix, this.matrix );
        } else {
            mat4.copy( matrix, this.matrix );
        }
        return true;
    },

    computeWorldToLocalMatrix: ( function () {
        var minverse = mat4.create();
        return function ( matrix /*, nodeVisitor */ ) {

            mat4.invert( minverse, this.matrix );
            if ( this.referenceFrame === TransformEnums.RELATIVE_RF ) {
                mat4.mul( matrix, minverse, matrix );
            } else { // absolute
                mat4.copy( matrix, minverse );
            }
            return true;
        };
    } )()
} ), 'osg', 'MatrixTransform' );
MACROUTILS.setTypeID( MatrixTransform );

module.exports = MatrixTransform;
