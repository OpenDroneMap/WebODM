'use strict';
var MACROUTILS = require( 'osg/Utils' );
var NodeVisitor = require( 'osg/NodeVisitor' );
var KdTree = require( 'osg/KdTree' );


var KdTreeBuilder = function ( options ) {
    NodeVisitor.call( this );
    this._buildOptions = options !== undefined ? options : {
        _numVerticesProcessed: 0,
        _targetNumTrianglesPerLeaf: 50,
        _maxNumLevels: 20
    };
};

KdTreeBuilder.prototype = MACROUTILS.objectInherit( NodeVisitor.prototype, {
    apply: function ( node ) {
        if ( node.getShape ) {
            var shape = node.getShape();
            // we test if the kdTree is already built and if we can build it (null means we skip it)
            if ( shape === undefined ) {
                var kdTree = new KdTree();
                if ( kdTree.build( this._buildOptions, node ) ) {
                    node.setShape( kdTree );
                }
            }
        }
        this.traverse( node );
    }
} );

module.exports = KdTreeBuilder;
