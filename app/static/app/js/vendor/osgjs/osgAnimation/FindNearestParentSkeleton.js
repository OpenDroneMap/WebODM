'use strict';
var MACROUTILS = require( 'osg/Utils' );
var NodeVisitor = require( 'osg/NodeVisitor' );
var Skeleton = require( 'osgAnimation/Skeleton' );


/**
 * FindNearestParentSkeleton
 */

var FindNearestParentSkeleton = function () {
    NodeVisitor.call( this, NodeVisitor.TRAVERSE_PARENTS );
    this._root = undefined;

    // node path to skeleton (without skeleton node though)
    this._pathToRoot = undefined;
};

FindNearestParentSkeleton.prototype = MACROUTILS.objectInherit( NodeVisitor.prototype, {

    apply: function ( node ) {

        if ( this._root ) return;

        if ( node.typeID === Skeleton.typeID ) {
            this._root = node;
            this._pathToRoot = this.nodePath.slice( 1 );
            return;
        }

        this.traverse( node );
    }
} );

module.exports = FindNearestParentSkeleton;
