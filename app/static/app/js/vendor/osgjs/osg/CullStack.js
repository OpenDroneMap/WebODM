'use strict';
var MACROUTILS = require( 'osg/Utils' );
var BoundingSphere = require( 'osg/BoundingSphere' );
var Camera = require( 'osg/Camera' );
var ComputeMatrixFromNodePath = require( 'osg/computeMatrixFromNodePath' );
var CullSettings = require( 'osg/CullSettings' );
var CullingSet = require( 'osg/CullingSet' );
var mat4 = require( 'osg/glMatrix' ).mat4;
var Plane = require( 'osg/Plane' );
var MatrixMemoryPool = require( 'osg/MatrixMemoryPool' );
var Transform = require( 'osg/Transform' );
var Notify = require( 'osg/notify' );
var TransformEnums = require( 'osg/transformEnums' );
var vec3 = require( 'osg/glMatrix' ).vec3;

var CullStack = function () {

    this._modelViewMatrixStack = [];
    this._projectionMatrixStack = [];
    this._viewportStack = [];
    this._cullingSetStack = [];
    this._frustumVolume = -1.0;
    this._bbCornerFar = 0;
    this._bbCornerNear = 0;

    // keep a matrix in memory to avoid to create matrix
    this._reservedMatrixStack = new MatrixMemoryPool();

    this._reserveCullingSetStack = [
        new CullingSet()
    ];
    this._reserveCullingSetStack.current = 0;


    // data for caching camera matrix inverse for computation of world/view
    // contains index of the camera node in the nodepath
    this._cameraIndexStack = [];
    // contains index of the camera modelview matrix in the modelViewMatrixStack
    this._cameraModelViewIndexStack = [];

    // contains the id has a key to computed Inverse Matrix
    this._cameraMatrixInverse = [];
    this._cameraMatrixInverseRoot = undefined;

};

CullStack.prototype = MACROUTILS.objectInherit( CullSettings.prototype, {

    _getReservedCullingSet: function () {
        var m = this._reserveCullingSetStack[ this._reserveCullingSetStack.current++ ];
        if ( this._reserveCullingSetStack.current === this._reserveCullingSetStack.length ) {
            this._reserveCullingSetStack.push( new CullingSet() );
        }
        return m;
    },
    reset: function () {
        this._modelViewMatrixStack.length = 0;
        this._projectionMatrixStack.length = 0;
        this._cullingSetStack.length = 0;

        this._reservedMatrixStack.reset();
        this._reserveCullingSetStack.current = 0;

        this._cameraModelViewIndexStack.length = 0;
        this._cameraIndexStack.length = 0;
        this._cameraMatrixInverse.length = 0;
        this._cameraMatrixInverseRoot = undefined;
    },

    getProjectionMatrixStack: function () {
        return this._projectionMatrixStack;
    },
    getCurrentProjectionMatrix: function () {
        return this._projectionMatrixStack[ this._projectionMatrixStack.length - 1 ];
    },

    getCurrentModelViewMatrix: function () {
        return this._modelViewMatrixStack[ this._modelViewMatrixStack.length - 1 ];
    },

    getCurrentModelviewMatrix: function () {
        Notify.warn( 'deprecated switch to getCurrentModelViewMatrix' );
        return this.getCurrentModelViewMatrix();
    },

    getCameraInverseMatrix: function () {

        // Return or compute and cache the MatrixInverse of the last
        // active camera in absolute reference

        // if no index the camera inverse is the root with an fake id
        if ( !this._cameraIndexStack.length )
            return this._cameraMatrixInverseRoot;

        var idx = this._cameraIndexStack[ this._cameraIndexStack.length - 1 ];

        // get the camera node
        var camera = this.getNodePath()[ idx ];
        var id = camera.getInstanceID();

        if ( this._cameraMatrixInverse[ id ] === undefined ) {
            var indexInModelViewMatrixStack = this._cameraModelViewIndexStack[ this._cameraModelViewIndexStack.length - 1 ];
            var mat = this._modelViewMatrixStack[ indexInModelViewMatrixStack ];
            var matInverse = this._reservedMatrixStack.get();
            mat4.invert( matInverse, mat );
            this._cameraMatrixInverse[ id ] = matInverse;
        }
        return this._cameraMatrixInverse[ id ];
    },

    getCurrentModelMatrix: function () {
        // Improvment could be to cache more things
        // and / or use this method only if the shader use it
        var invMatrix = this.getCameraInverseMatrix();
        var m = this._reservedMatrixStack.get();
        var world = mat4.mul( m, invMatrix, this.getCurrentModelViewMatrix() );
        return world;
    },

    getCurrentViewMatrix: function () {
        // Improvment could be to cache more things
        // and / or use this method only if the shader use it
        if ( !this._cameraIndexStack.length )
            return this._modelViewMatrixStack[ 0 ];

        // also we could keep the index of the current to avoid lenght-1 at each access
        // it's implemented in osg like that:
        // https://github.com/openscenegraph/osg/blob/master/include/osg/fast_back_stack
        var idx = this._cameraModelViewIndexStack[ this._cameraModelViewIndexStack.length - 1 ];
        return this._modelViewMatrixStack[ idx ];
    },

    getViewport: function () {
        if ( this._viewportStack.length === 0 ) {
            return undefined;
        }
        return this._viewportStack[ this._viewportStack.length - 1 ];
    },
    getLookVectorLocal: function ( outLookVector ) {
        var lookVectorLocal = this.getCurrentModelViewMatrix();
        return vec3.set( outLookVector, -lookVectorLocal[ 2 ], -lookVectorLocal[ 6 ], -lookVectorLocal[ 10 ] );
    },
    pushViewport: function ( vp ) {
        this._viewportStack.push( vp );
    },
    popViewport: function () {
        this._viewportStack.pop();
    },

    getFrustumPlanes: ( function () {

        var mvp = mat4.create();

        return function ( out, projection, view, withNearFar ) {
            mat4.mul( mvp, projection, view );

            var computeNearFar = !!withNearFar;

            // Right clipping plane.
            var right = out[ 0 ];
            right[ 0 ] = mvp[ 3 ] - mvp[ 0 ];
            right[ 1 ] = mvp[ 7 ] - mvp[ 4 ];
            right[ 2 ] = mvp[ 11 ] - mvp[ 8 ];
            right[ 3 ] = mvp[ 15 ] - mvp[ 12 ];

            // Left clipping plane.
            var left = out[ 1 ];
            left[ 0 ] = mvp[ 3 ] + mvp[ 0 ];
            left[ 1 ] = mvp[ 7 ] + mvp[ 4 ];
            left[ 2 ] = mvp[ 11 ] + mvp[ 8 ];
            left[ 3 ] = mvp[ 15 ] + mvp[ 12 ];

            // Bottom clipping plane.
            var bottom = out[ 2 ];
            bottom[ 0 ] = mvp[ 3 ] + mvp[ 1 ];
            bottom[ 1 ] = mvp[ 7 ] + mvp[ 5 ];
            bottom[ 2 ] = mvp[ 11 ] + mvp[ 9 ];
            bottom[ 3 ] = mvp[ 15 ] + mvp[ 13 ];

            // Top clipping plane.
            var top = out[ 3 ];
            top[ 0 ] = mvp[ 3 ] - mvp[ 1 ];
            top[ 1 ] = mvp[ 7 ] - mvp[ 5 ];
            top[ 2 ] = mvp[ 11 ] - mvp[ 9 ];
            top[ 3 ] = mvp[ 15 ] - mvp[ 13 ];

            if ( computeNearFar ) {
                // Far clipping plane.
                var far = out[ 4 ];
                far[ 0 ] = mvp[ 3 ] - mvp[ 2 ];
                far[ 1 ] = mvp[ 7 ] - mvp[ 6 ];
                far[ 2 ] = mvp[ 11 ] - mvp[ 10 ];
                far[ 3 ] = mvp[ 15 ] - mvp[ 14 ];

                // Near clipping plane.
                var near = out[ 5 ];
                near[ 0 ] = mvp[ 3 ] + mvp[ 2 ];
                near[ 1 ] = mvp[ 7 ] + mvp[ 6 ];
                near[ 2 ] = mvp[ 11 ] + mvp[ 10 ];
                near[ 3 ] = mvp[ 15 ] + mvp[ 14 ];
            }

            //Normalize the planes
            var j = withNearFar ? 6 : 4;
            for ( var i = 0; i < j; i++ ) {
                Plane.normalizeEquation( out[ i ] );
            }

        };
    } )(),

    pushCullingSet: function () {
        var cs = this._getReservedCullingSet();
        if ( this._enableFrustumCulling ) {
            mat4.getFrustumPlanes( cs.getFrustum().getPlanes(), this.getCurrentProjectionMatrix(), this.getCurrentModelViewMatrix(), false );
            // TODO: no far no near.
            // should check if we have them
            // should add at least a near 0 clip if not
            cs.getFrustum().setupMask( 4 );
        }

        this._cullingSetStack.push( cs );
    },
    popCullingSet: function () {
        return this._cullingSetStack.pop();
    },
    getCurrentCullingSet: function () {
        return this._cullingSetStack[ this._cullingSetStack.length - 1 ];
    },


    pushCurrentMask: function () {
        var cs = this.getCurrentCullingSet();
        if ( cs ) cs.pushCurrentMask();
    },
    popCurrentMask: function () {
        var cs = this.getCurrentCullingSet();
        if ( cs ) cs.popCurrentMask();
    },

    isVerticesCulled: function ( vertices ) {
        if ( !this._enableFrustumCulling )
            return false;
        return this.getCurrentCullingSet().isVerticesCulled( vertices );
    },

    isBoundingBoxCulled: function ( bb ) {
        if ( !this._enableFrustumCulling )
            return false;
        return bb.valid() && this.getCurrentCullingSet().isBoundingBoxCulled( bb );
    },

    isBoundingSphereCulled: function ( bs ) {
        if ( !this._enableFrustumCulling )
            return false;
        return bs.valid() && this.getCurrentCullingSet().isBoundingSphereCulled( bs );
    },

    isCulled: ( function () {
        var bsWorld = new BoundingSphere();
        return function ( node, nodePath ) {
            if ( !this._enableFrustumCulling )
                return false;
            if ( node.isCullingActive() ) {
                if ( this.getCurrentCullingSet().getCurrentResultMask() === 0 )
                    return false; // father bounding sphere totally inside

                var matrix = this._reservedMatrixStack.get();
                mat4.identity( matrix );

                // TODO: Perf just get World Matrix at each node transform
                // store it in a World Transform Node Path (only world matrix change)
                // so that it's computed once and reused for each further node getCurrentModel
                // otherwise, it's 1 mult for each node, each matrix node, and each geometry
                //matrix = this.getCurrentModelMatrix();
                // tricky: change push be before isculled, and pop in case of culling
                // strange bug for now on frustum culling sample with that

                if ( node instanceof Transform ) {

                    // tricky: MatrixTransform getBound is already transformed to
                    // its local space whereas nodepath also have its matrix ...
                    // so to get world space, you HAVE to remove that matrix from nodePATH
                    // TODO: GC Perf of array slice creating new array
                    matrix = ComputeMatrixFromNodePath.computeLocalToWorld( nodePath.slice( 0, nodePath.length - 1 ), true, matrix );

                } else {

                    matrix = ComputeMatrixFromNodePath.computeLocalToWorld( nodePath, true, matrix );

                }

                // Matrix.transformBoundingSphere( matrix, node.getBound(), bsWorld );
                node.getBound().transformMat4( bsWorld, matrix );

                return this.getCurrentCullingSet().isBoundingSphereCulled( bsWorld );
            } else {
                this.getCurrentCullingSet().resetCullingMask();
                return false;
            }
        };
    } )(),



    pushModelViewMatrix: ( function () {
        var lookVector = vec3.create();
        return function ( matrix ) {

            // When pushing a matrix, it can be a transform or camera. To compute
            // differents matrix type in shader ( ViewMatrix/ModelMatrix/ModelViewMatrix )
            // we track camera node when using pushModelViewMatrix
            // To detect a camera, we check on the nodepath the type of the node and if the
            // camera is relatif or absolute.
            // When we detect an absolute camera we keep it's index to get it when needed to
            // compute the World/View matrix
            // Th    ere is an exception for the root camera, the root camera is not pushed on the
            // CullVisitor but only its matrixes, so to handle this we compute the inverse camera
            // when the nodepath has a lenght of 0
            // To avoid to compute too much inverse matrix, we keep a cache of them during the
            // traverse and store the result under the instanceID key, except for the root
            var np = this.getNodePath();
            var length = np.length;
            if ( !length ) { // root
                var matInverse = this._reservedMatrixStack.get();
                mat4.invert( matInverse, matrix );
                this._cameraMatrixInverseRoot = matInverse;
            } else {
                var index = length - 1;
                if ( np[ index ].getTypeID() === Camera.getTypeID() && np[ index ].getReferenceFrame() === TransformEnums.ABSOLUTE_RF ) {
                    this._cameraIndexStack.push( index );
                    this._cameraModelViewIndexStack.push( this._modelViewMatrixStack.length );
                }
            }

            this._modelViewMatrixStack.push( matrix );
            this.getLookVectorLocal( lookVector );

            /*jshint bitwise: false */
            this._bbCornerFar = ( lookVector[ 0 ] >= 0 ? 1 : 0 ) | ( lookVector[ 1 ] >= 0 ? 2 : 0 ) | ( lookVector[ 2 ] >= 0 ? 4 : 0 );
            this._bbCornerNear = ( ~this._bbCornerFar ) & 7;
            /*jshint bitwise: true */

        };
    } )(),
    popModelViewMatrix: ( function () {
        var lookVector = vec3.create();

        return function () {

            // if same index it's a camera and we have to pop it
            var np = this.getNodePath();
            var index = np.length - 1;
            if ( this._cameraIndexStack.length && index === this._cameraIndexStack[ this._cameraIndexStack.length - 1 ] ) {
                this._cameraIndexStack.pop();
                this._cameraModelViewIndexStack.pop();
            }

            this._modelViewMatrixStack.pop();

            if ( this._modelViewMatrixStack.length !== 0 ) {
                this.getLookVectorLocal( lookVector );
            } else {
                vec3.set( lookVector, 0.0, 0.0, -1.0 );
            }

            /*jshint bitwise: false */
            this._bbCornerFar = ( lookVector[ 0 ] >= 0.0 ? 1.0 : 0.0 ) | ( lookVector[ 1 ] >= 0 ? 2.0 : 0.0 ) | ( lookVector[ 2 ] >= 0 ? 4.0 : 0.0 );
            this._bbCornerNear = ( ~this._bbCornerFar ) & 7;
            /*jshint bitwise: true */
        };
    } )(),

    pushProjectionMatrix: function ( matrix ) {
        this._projectionMatrixStack.push( matrix );

        // need to recompute frustum volume.
        this._frustumVolume = -1.0;

        this.pushCullingSet();
    },
    popProjectionMatrix: function () {
        this._projectionMatrixStack.pop();

        // need to recompute frustum volume.
        this._frustumVolume = -1.0;

        this.popCullingSet();
    }


} );

module.exports = CullStack;
