'use strict';
var MACROUTILS = require( 'osg/Utils' );
var Notify = require( 'osg/notify' );
var UpdateMatrixTransform = require( 'osgAnimation/UpdateMatrixTransform' );
var mat4 = require( 'osg/glMatrix' ).mat4;
var NodeVisitor = require( 'osg/NodeVisitor' );


/**
 *  UpdateBone
 *  @class UpdateBone
 */
var UpdateBone = function () {
    UpdateMatrixTransform.call( this );
};

/** @lends UpdateBone.prototype */
UpdateBone.prototype = MACROUTILS.objectInherit( UpdateMatrixTransform.prototype, {

    update: function ( node, nv ) {

        if ( nv.getVisitorType() === NodeVisitor.UPDATE_VISITOR ) {

            if ( node.className && node.className() !== 'Bone' ) {
                Notify.warn( 'Warning: UpdateBone set on non-Bone object.' );
                return false;
            }

            var bone = node;

            UpdateMatrixTransform.prototype.update.call( this, node );
            bone.setMatrix( bone.getMatrix() );
            var matrix = bone.getMatrix();
            var parent = bone.getBoneParent();

            if ( parent ) {
                mat4.mul( bone.getMatrixInSkeletonSpace(), parent.getMatrixInSkeletonSpace(), matrix );
            } else {
                bone.setMatrixInSkeletonSpace( matrix );
            }
        }
        return true;
    }

} );

module.exports = UpdateBone;
