'use strict';
var MACROUTILS = require( 'osg/Utils' );
var Bone = require( 'osgAnimation/Bone' );
var NodeVisitor = require( 'osg/NodeVisitor' );
var Notify = require( 'osg/notify' );
var Object = require( 'osg/Object' );


/**
 *  ValidateSkeletonVisitor
 *  @class ValidateSkeletonVisitor
 */
var ValidateSkeletonVisitor = function () {
    NodeVisitor.call( this );
};

ValidateSkeletonVisitor.prototype = MACROUTILS.objectInherit( NodeVisitor.prototype, {
    apply: function ( node ) {
        if ( node.getTypeID() !== Bone.getTypeID() ) {
            return;
        }
        var foundNonBone = false;

        var children = node.getChildren();
        for ( var i = 0, l = node.getChildren().length; i < l; i++ ) {
            var child = children[ i ];
            if ( child.getTypeID() === Bone.getTypeID() ) {
                if ( foundNonBone ) {
                    Notify.warn( 'Warning: a Bone was found after a non-Bone child ' +
                        'within a Skeleton. Children of a Bone must be ordered ' +
                        'with all child Bones first for correct update order.' );
                    //this.traversalMode = NodeVisitor.TRAVERSE_NONE;
                    return;
                }
            } else {
                foundNonBone = true;
            }
        }
        this.traverse( node );
    }

} );

var compareBone = function ( x, y ) {
    var a = x instanceof Bone ? 0 : 1;
    var b = y instanceof Bone ? 0 : 1;

    return a - b;
};

/**
 *  UpdateSkeleton
 *  @class UpdateSkeleton
 */
var UpdateSkeleton = function () {
    this._needValidate = true;
};

UpdateSkeleton.prototype = MACROUTILS.objectInherit( Object.prototype, {
    needToValidate: function () {
        return this._needValidate;
    },

    update: function ( node, nv ) {
        if ( this._needValidate && nv.getVisitorType() === NodeVisitor.UPDATE_VISITOR ) {
            if ( node.className && node.className() === 'Skeleton' ) {
                var validateSkeletonVisitor = new ValidateSkeletonVisitor();
                var children = node.getChildren();
                for ( var i = 0, l = children.length; i < l; i++ ) {
                    var child = children[ i ];
                    child.accept( validateSkeletonVisitor );
                }

                //Re-order skeleton children to force correct bones update, we should put bones first
                children.sort( compareBone );

                this._needValidate = false;
            }
        }
        return true;
    }
} );

module.exports = UpdateSkeleton;
