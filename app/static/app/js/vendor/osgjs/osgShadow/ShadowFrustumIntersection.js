'use strict';
var BoundingBox = require( 'osg/BoundingBox' );
var BoundingSphere = require( 'osg/BoundingSphere' );
var Camera = require( 'osg/Camera' );
var Geometry = require( 'osg/Geometry' );
var Light = require( 'osg/Light' );
var mat4 = require( 'osg/glMatrix' ).mat4;
var MatrixMemoryPool = require( 'osg/MatrixMemoryPool' );
var MatrixTransform = require( 'osg/MatrixTransform' );
var NodeVisitor = require( 'osg/NodeVisitor' );
var Plane = require( 'osg/Plane' );
var MACROUTILS = require( 'osg/Utils' );

/**
 * [ComputeFrustumBoundsVisitor get a scene bounds limited by a light and camera frustum]
 */
var ComputeMultiFrustumBoundsVisitor = function () {

    NodeVisitor.call( this, NodeVisitor.TRAVERSE_ALL_CHILDREN );
    this._matrixStack = [ mat4.create() ];
    this._reservedMatrixStack = new MatrixMemoryPool();
    this._bb = new BoundingBox();
    this._bs = new BoundingSphere();

};

/*
 * TODO: apply world matrix on the traverse instead of per node
 */
ComputeMultiFrustumBoundsVisitor.prototype = MACROUTILS.objectInherit( NodeVisitor.prototype, {
    reset: function ( traversalMask, worldLightPos, cameraFrustum, cameraNearFar, lightFrustum ) {

        this.setTraversalMask( traversalMask );

        this._cameraFrustum = cameraFrustum;
        this._lightFrustum = lightFrustum;

        // what plane to exclude from shadowedscene
        this.getCameraPlaneMaskForLightNear( worldLightPos, cameraFrustum, cameraNearFar ? 6 : 4 );

        this._reservedMatrixStack.reset();
        this._matrixStack.length = 1;
        this._bb.init();
    },

    getBoundingBox: function () {
        return this._bb;
    },


    getCameraPlaneMaskForLightNear: function ( point, cameraFrustum, len ) {
        var selectorMask = 0x1;
        var resultMask = 15;
        var i;

        for ( i = 0; i < len; ++i ) {
            resultMask = ( resultMask << 1 ) | 1;
        }

        var planeList = cameraFrustum.getPlanes();
        for ( i = 0; i < len; ++i ) {
            if ( Plane.distanceToPlane( planeList[ i ], point ) < 0.0 ) {
                // Ligth frustum source poitn is outside this plane.
                // subsequent checks against this plane not required.
                // as light position is behind those,
                // and culling that would cull light near
                resultMask ^= selectorMask;
            }
            selectorMask <<= 1;
        }
        this._cameraPlaneMaskedByLightNear = resultMask;

        cameraFrustum.setResultMask( resultMask );
        cameraFrustum.pushCurrentMask( resultMask );
        return resultMask;
    },

    applyTransform: function ( transform ) {

        var matrix = this._reservedMatrixStack.get();
        var stackLength = this._matrixStack.length;
        mat4.copy( matrix, this._matrixStack[ stackLength - 1 ] );
        transform.computeLocalToWorldMatrix( matrix, this );

        var bs = this._bs;
        transform.getBound().transformMat4( this._bs, matrix );

        // camera cull
        if ( this._cameraFrustum.getCurrentMask() !== 0 ) {
            // father bounding sphere is not totally inside
            // now test this one
            if ( !this._cameraFrustum.containsBoundingSphere( bs ) )
                return; // culled
        }

        // light cull
        if ( this._lightFrustum.getCurrentMask() !== 0 ) {
            // father bounding sphere is not totally inside
            // now test this one
            if ( !this._lightFrustum.containsBoundingSphere( bs ) )
                return; // culled
        }

        this._cameraFrustum.pushCurrentMask();
        this._lightFrustum.pushCurrentMask();

        this.pushMatrix( matrix );

        this.traverse( transform );

        this._cameraFrustum.popCurrentMask();
        this._lightFrustum.popCurrentMask();

        this.popMatrix();
    },
    applyBoundingBox: ( function () {
        var bbOut = new BoundingBox();
        return function ( bbox ) {
            var stackLength = this._matrixStack.length;
            var matrix = this._matrixStack[ stackLength - 1 ];
            if ( mat4.exactEquals( matrix, mat4.IDENTITY ) ) {
                this._bb.expandByBoundingBox( bbox );
            } else if ( bbox.valid() ) {
                bbox.transformMat4( bbOut, matrix );
                this._bb.expandByBoundingBox( bbOut );
            }
        };
    } )(),

    apply: function ( node ) {

        var typeID = node.getTypeID();

        if ( node instanceof MatrixTransform ) {
            this.applyTransform( node );
            return;

        } else if ( typeID === Geometry.getTypeID() ) {
            var bs = this._bs;
            var matrix = this._matrixStack[ this._matrixStack.length - 1 ];
            node.getBound().transformMat4( bs, matrix );

            // camera cull
            if ( this._cameraFrustum.getCurrentMask() !== 0 ) {
                // father bounding sphere is not totally inside
                // now test this one
                if ( !this._cameraFrustum.containsBoundingSphere( bs ) )
                    return; // culled
            }

            // light cull
            if ( this._lightFrustum.getCurrentMask() !== 0 ) {
                // father bounding sphere is not totally inside
                // now test this one
                if ( !this._lightFrustum.containsBoundingSphere( bs ) )
                    return; // culled
            }

            // Visible: we enlarge the bbox
            this.applyBoundingBox( node.getBoundingBox() );

            return;
        } else if ( typeID === Camera.getTypeID() ) {

        } else if ( typeID === Light.getTypeID() ) {

        }


        this.traverse( node );

    },

    pushMatrix: function ( matrix ) {
        this._matrixStack.push( matrix );
    },

    popMatrix: function () {
        this._matrixStack.pop();
    },

} );

module.exports = ComputeMultiFrustumBoundsVisitor;
