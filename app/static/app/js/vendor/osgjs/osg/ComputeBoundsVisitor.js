'use strict';
var BoundingBox = require( 'osg/BoundingBox' );
var Geometry = require( 'osg/Geometry' );
var mat4 = require( 'osg/glMatrix' ).mat4;
var MatrixMemoryPool = require( 'osg/MatrixMemoryPool' );
var Transform = require( 'osg/Transform' );
var NodeVisitor = require( 'osg/NodeVisitor' );
var MACROUTILS = require( 'osg/Utils' );


var ComputeBoundsVisitor = function ( traversalMode ) {
    NodeVisitor.call( this, traversalMode );

    // keep a matrix in memory to avoid to create matrix
    this._reservedMatrixStack = new MatrixMemoryPool();

    // Matrix stack along path traversal
    this._matrixStack = [];
    this._bb = new BoundingBox();
};

ComputeBoundsVisitor.prototype = MACROUTILS.objectLibraryClass( MACROUTILS.objectInherit( NodeVisitor.prototype, {

    reset: function () {
        this._reservedMatrixStack.reset();
        this._matrixStack.length = 0;
        this._bb.init();
    },

    getBoundingBox: function () {
        return this._bb;
    },

    // not implemented
    //void getPolytope(osg::Polytope& polytope, float margin=0.1) const;
    //void getBase(osg::Polytope& polytope, float margin=0.1) const;

    //applyDrawable: function ( drawable ) {},

    applyTransform: function ( transform ) {

        var matrix = this._reservedMatrixStack.get();
        var stackLength = this._matrixStack.length;

        if ( stackLength )
            mat4.copy( matrix, this._matrixStack[ stackLength - 1 ] );
        else
            mat4.identity( matrix );

        transform.computeLocalToWorldMatrix( matrix, this );

        this.pushMatrix( matrix );

        this.traverse( transform );

        this.popMatrix();
    },

    apply: function ( node ) {

        if ( node instanceof Transform ) {
            this.applyTransform( node );
            return;

        } else if ( node instanceof Geometry ) {
            this.applyBoundingBox( node.getBoundingBox() );
            return;
        }

        this.traverse( node );

    },

    pushMatrix: function ( matrix ) {
        this._matrixStack.push( matrix );
    },

    popMatrix: function () {
        this._matrixStack.pop();
    },


    applyBoundingBox: ( function () {
        var bbOut = new BoundingBox();

        return function ( bbox ) {

            var stackLength = this._matrixStack.length;

            if ( !stackLength )
                this._bb.expandByBoundingBox( bbox );
            else if ( bbox.valid() ) {
                var matrix = this._matrixStack[ stackLength - 1 ];
                //Matrix.transformBoundingBox( matrix, bbox, bbOut );
                bbox.transformMat4( bbOut, matrix );
                this._bb.expandByBoundingBox( bbOut );
            }

        };
    } )(),

    getMatrixStack: function () {
        return this._matrixStack;
    }


} ), 'osg', 'ComputeBoundsVisitor' );

module.exports = ComputeBoundsVisitor;
