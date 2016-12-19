'use strict';
var MACROUTILS = require( 'osg/Utils' );
var Node = require( 'osg/Node' );
var mat4 = require( 'osg/glMatrix' ).mat4;
var TransformEnums = require( 'osg/transformEnums' );

/**
 * Transform - base class for Transform type node ( Camera, MatrixTransform )
 * @class Transform
 * @inherits Node
 */
var Transform = function () {
    Node.call( this );
    this.referenceFrame = TransformEnums.RELATIVE_RF;
};

/** @lends Transform.prototype */
Transform.prototype = MACROUTILS.objectInherit( Node.prototype, {
    setReferenceFrame: function ( value ) {
        this.referenceFrame = value;
    },
    getReferenceFrame: function () {
        return this.referenceFrame;
    },

    computeBoundingSphere: ( function () {
        var matrix = mat4.create();
        return function ( bSphere ) {
            Node.prototype.computeBoundingSphere.call( this, bSphere );
            if ( !bSphere.valid() ) {
                return bSphere;
            }

            mat4.identity( matrix );
            // local to local world (not Global World)
            this.computeLocalToWorldMatrix( matrix );
            bSphere.transformMat4( bSphere, matrix );
            return bSphere;
        };
    } )()
} );

module.exports = Transform;
