'use strict';
var BoundingSphere = require( 'osg/BoundingSphere' );
var mat4 = require( 'osg/glMatrix' ).mat4;
var Notify = require( 'osg/notify' );


// Base class for Camera / User manipulator
var Manipulator = function ( boundStrategy ) {
    this._boundStrategy = boundStrategy;
    if ( this._boundStrategy === undefined )
        this._boundStrategy = Manipulator.COMPUTE_HOME_USING_SPHERE;

    this._controllerList = {};
    this._inverseMatrix = mat4.create();
    this._camera = undefined;
    this._node = undefined;
    this._frustum = {};
    this._computeBoundNodeMaskOverride = ~0x0;
};

Manipulator.prototype = {
    setCamera: function ( c ) {
        this._camera = c;
    },
    getCamera: function () {
        return this._camera;
    },
    setNode: function ( node ) {
        this._node = node;
    },
    setComputeBoundNodeMaskOverride: function ( mask ) {
        this._computeBoundNodeMaskOverride = mask;
    },
    getComputeBoundNodeMaskOverride: function () {
        return this._computeBoundNodeMaskOverride;
    },
    getHomeBound: function ( overrideStrat ) {
        var node = this._node;
        if ( !node )
            return;

        var type = overrideStrat !== undefined ? overrideStrat : this._boundStrategy;

        if ( type === true || type === false ) {
            Notify.warn( 'Manipulator.getHomeBound with boolean is deprecated, pass a type instead' );
            type = type ? Manipulator.COMPUTE_HOME_USING_BBOX : Manipulator.COMPUTE_HOME_USING_SPHERE;
        }

        if ( type & Manipulator.COMPUTE_HOME_USING_BBOX ) {
            var bs = new BoundingSphere();

            var bb = null;
            if ( this._computeBoundNodeMaskOverride === ~0x0 ) {
                bb = node.getBoundingBox();
            } else {
                var ComputeBoundsVisitor = require( 'osg/ComputeBoundsVisitor' );
                var cbv = new ComputeBoundsVisitor();
                cbv.setNodeMaskOverride( this._computeBoundNodeMaskOverride );
                cbv.reset();

                cbv.apply( node );
                bb = cbv.getBoundingBox();
            }

            if ( bb.valid() )
                bs.expandByBoundingBox( bb );

            // minimum between sphere and box
            if ( type & Manipulator.COMPUTE_HOME_USING_SPHERE ) {
                var boundSphere = node.getBound();
                if ( boundSphere.radius() < bs.radius() )
                    return boundSphere;
            }

            return bs;
        }

        return node.getBound();
    },
    getHomeDistance: function ( bs ) {
        var frustum = this._frustum;
        var dist = bs.radius();
        if ( this._camera && mat4.getFrustum( frustum, this._camera.getProjectionMatrix() ) ) {
            var vertical2 = Math.abs( frustum.right - frustum.left ) / frustum.zNear / 2;
            var horizontal2 = Math.abs( frustum.top - frustum.bottom ) / frustum.zNear / 2;
            dist /= Math.sin( Math.atan2( horizontal2 < vertical2 ? horizontal2 : vertical2, 1 ) );
        } else {
            dist *= 1.5;
        }
        return dist;
    },
    // eg: var currentTime = nv.getFrameStamp().getSimulationTime();
    update: function ( /*nv*/) {},

    getInverseMatrix: function () {
        return this._inverseMatrix;
    },

    getControllerList: function () {
        return this._controllerList;
    }
};

// flags
Manipulator.COMPUTE_HOME_USING_SPHERE = 1 << 0;
Manipulator.COMPUTE_HOME_USING_BBOX = 1 << 1;

module.exports = Manipulator;
