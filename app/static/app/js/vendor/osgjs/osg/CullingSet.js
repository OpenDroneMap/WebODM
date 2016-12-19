'use strict';
var Polytope = require( 'osg/Polytope' );

var CullingSet = function () {

    this._mask = CullingSet.DEFAULT_CULLING;
    this._frustum = new Polytope();

};

CullingSet.prototype = {

    reset: function () {
        this._mask = CullingSet.DEFAULT_CULLING;
        this._frustum.clear();
    },
    setCullingMask: function ( mask ) {
        this._mask = mask;
    },
    getCullingMask: function () {
        return this._mask;
    },
    setFrustum: function ( frustum ) {
        this._frustum = frustum;
    },
    getFrustum: function () {
        return this._frustum;
    },
    getCurrentResultMask: function () {
        return this._frustum.getCurrentMask();
    },
    pushCurrentMask: function () {
        this._frustum.pushCurrentMask();
    },
    popCurrentMask: function () {
        this._frustum.popCurrentMask();
    },
    resetCullingMask: function () {
        this._frustum.setResultMask( this._frustum.getCurrentMask() );
    },
    isBoundingBoxCulled: function ( bbox ) {
        if ( this._mask & CullingSet.VIEW_FRUSTUM_CULLING ) {
            // is it outside the view frustum...
            if ( !this._frustum.containsBoundingBox( bbox ) ) return true;
        }
        return false;
    },
    isBoundingSphereCulled: function ( bs ) {
        if ( this._mask & CullingSet.VIEW_FRUSTUM_CULLING ) {
            // is it outside the view frustum...
            if ( !this._frustum.containsBoundingSphere( bs ) ) return true;
        }
        return false;
    },
    isVerticesCulled: function ( vertices ) {
        if ( this._mask & CullingSet.VIEW_FRUSTUM_CULLING ) {
            // is it outside the view frustum...
            if ( !this._frustum.containsVertices( vertices ) ) return true;
        }
        return false;
    }
};

CullingSet.NO_CULLING = 0x0;

CullingSet.VIEW_FRUSTUM_LEFT_CULLING = 0x1;
CullingSet.VIEW_FRUSTUM_RIGHT_CULLING = 0x2;
CullingSet.VIEW_FRUSTUM_TOP_CULLING = 0x3;
CullingSet.VIEW_FRUSTUM_BOTTOM_CULLING = 0x4;
CullingSet.NEAR_PLANE_CULLING = 0x5;
CullingSet.FAR_PLANE_CULLING = 0x6;

CullingSet.VIEW_FRUSTUM_SIDES_CULLING = CullingSet.VIEW_FRUSTUM_LEFT_CULLING | CullingSet.VIEW_FRUSTUM_RIGHT_CULLING | CullingSet.VIEW_FRUSTUM_BOTTOM_CULLING | CullingSet.VIEW_FRUSTUM_TOP_CULLING;

CullingSet.VIEW_FRUSTUM_CULLING = CullingSet.VIEW_FRUSTUM_SIDES_CULLING | CullingSet.NEAR_PLANE_CULLING | CullingSet.FAR_PLANE_CULLING;

CullingSet.DEFAULT_CULLING = CullingSet.VIEW_FRUSTUM_SIDES_CULLING;

CullingSet.ENABLE_ALL_CULLING = CullingSet.VIEW_FRUSTUM_CULLING;

module.exports = CullingSet;
