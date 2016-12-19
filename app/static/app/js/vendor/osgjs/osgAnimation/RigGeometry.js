'use strict';
var MACROUTILS = require( 'osg/Utils' );
var vec3 = require( 'osg/glMatrix' ).vec3;
var Geometry = require( 'osg/Geometry' );
var Notify = require( 'osg/notify' );
var mat4 = require( 'osg/glMatrix' ).mat4;
var StateSet = require( 'osg/StateSet' );
var MorphGeometry = require( 'osgAnimation/MorphGeometry' );
var UpdateRigGeometry = require( 'osgAnimation/UpdateRigGeometry' );
var RigTransformHardware = require( 'osgAnimation/RigTransformHardware' );
var AnimationUpdateCallback = require( 'osgAnimation/AnimationUpdateCallback' );
var ComputeMatrixFromNodePath = require( 'osg/computeMatrixFromNodePath' );


// RigGeometry is a Geometry deformed by bones
// To connect bones to RigGeometry it requires:
//     - a map of bones with index / weight eg also called VertexInfluenceMap
// {
//     bone0: { index: [],  // vertex index
//              weight: []  // weight for this index
//            },
//     bone2: { index: [],
//              weight: []
//            }
// }


var RigGeometry = function () {

    Geometry.call( this );

    this._shape = null; // by default no kdtree/shape for rig

    this.addUpdateCallback( new UpdateRigGeometry() );

    // handle matrixFromSkeletonToGeometry and invMatrixFromSkeletonToGeometry computation
    this._root = undefined;
    this._pathToRoot = undefined;
    this._isAnimatedPath = false;

    this._boneNameID = {};

    this._matrixFromSkeletonToGeometry = mat4.create();
    this._invMatrixFromSkeletonToGeometry = mat4.create();

    this._rigTransformImplementation = new RigTransformHardware();

    // RigGeometry have a special stateset that will be pushed at the very end of the culling
    // this stateSet only represents animation (and shouldn't contain any rendering attributes)
    // It's a way to make every RigGeometry unique (in term of stateSet stack)
    this._stateSetAnimation = new StateSet();

    this._needToComputeMatrix = true;

};

RigGeometry.prototype = MACROUTILS.objectLibraryClass( MACROUTILS.objectInherit( Geometry.prototype, {

    getStateSetAnimation: function () {
        return this._stateSetAnimation;
    },

    getSkeleton: function () {
        return this._root;
    },

    setSkeleton: function ( root ) {
        this._root = root;
    },

    setPathToSkeleton: function ( path ) {
        this._pathToRoot = path;
        this._isAnimatedPath = AnimationUpdateCallback.checkPathIsAnimated( path );
    },

    setNeedToComputeMatrix: function ( needToComputeMatrix ) {
        this._needToComputeMatrix = needToComputeMatrix;
    },

    getNeedToComputeMatrix: function () {
        return this._needToComputeMatrix;
    },

    computeBoundingBox: function ( boundingBox ) {

        boundingBox.init();

        var vertexArray = this.getVertexAttributeList().Vertex;
        var weightsArray = this.getVertexAttributeList().Weights;
        // mainly copy paste of geometry computeBoundingBox code, except we only
        // take into account the non-influenced vertices

        // we do that only for the non-influenced vertices because the rigged ones
        // can't be statically computed (full moving bbox of rigs should be computed externally
        // through bones or cpu rigged colision mesh, etc)
        // bbox is important for culling (near/far)

        if ( vertexArray && weightsArray && vertexArray.getElements() && vertexArray.getItemSize() > 2 ) {

            var weights = weightsArray.getElements();
            var vertexes = vertexArray.getElements();
            var itemSize = vertexArray.getItemSize();

            var min = boundingBox.getMin();
            var max = boundingBox.getMax();

            var minx = min[ 0 ];
            var miny = min[ 1 ];
            var minz = min[ 2 ];
            var maxx = max[ 0 ];
            var maxy = max[ 1 ];
            var maxz = max[ 2 ];

            for ( var idx = 0, idb = 0, l = vertexes.length; idx < l; idx += itemSize, idb += 4 ) {

                if ( weights[ idx ] !== 0.0 || weights[ idx + 1 ] !== 0.0 || weights[ idx + 2 ] !== 0.0 || weights[ idx + 3 ] !== 0.0 )
                    continue;

                var v1 = vertexes[ idx ];
                var v2 = vertexes[ idx + 1 ];
                var v3 = vertexes[ idx + 2 ];
                if ( v1 < minx ) minx = v1;
                if ( v1 > maxx ) maxx = v1;
                if ( v2 < miny ) miny = v2;
                if ( v2 > maxy ) maxy = v2;
                if ( v3 < minz ) minz = v3;
                if ( v3 > maxz ) maxz = v3;
            }

            min[ 0 ] = minx;
            min[ 1 ] = miny;
            min[ 2 ] = minz;
            max[ 0 ] = maxx;
            max[ 1 ] = maxy;
            max[ 2 ] = maxz;
        }

        return boundingBox;
    },

    computeMatrixFromRootSkeleton: function () {

        if ( !this._root ) {
            Notify.warn( 'Warning ' + this.className() + '.computeMatrixFromRootSkeleton if you have this message it means you miss to call buildTransformer( root ), or your RigGeometry (' + this.getName() + ') is not attached to a Skeleton subgraph' );
            return;
        }

        mat4.identity( this._matrixFromSkeletonToGeometry );
        ComputeMatrixFromNodePath.computeLocalToWorld( this._pathToRoot, true, this._matrixFromSkeletonToGeometry );
        mat4.invert( this._invMatrixFromSkeletonToGeometry, this._matrixFromSkeletonToGeometry );

        if ( !this._isAnimatedPath )
            this._needToComputeMatrix = false;
    },

    getMatrixFromSkeletonToGeometry: function () {
        return this._matrixFromSkeletonToGeometry;
    },

    getInvMatrixFromSkeletonToGeometry: function () {
        return this._invMatrixFromSkeletonToGeometry;
    },

    getSourceGeometry: function () {
        return this._geometry;
    },

    setSourceGeometry: function ( geometry ) {
        this._geometry = geometry;
    },

    getBoneNameID: function () {
        return this._boneNameID;
    },

    setBoneNameID: function ( boneMap ) {
        this._boneNameID = boneMap;
    },

    mergeChildrenVertexAttributeList: function () {

        if ( this._geometry instanceof MorphGeometry )
            this._geometry.mergeChildrenVertexAttributeList();

        var sourceGeometryVertexAttributeList = this._geometry.getVertexAttributeList();

        Geometry.appendVertexAttributeToList( sourceGeometryVertexAttributeList, this.getVertexAttributeList() );

    },

    mergeChildrenData: function () {

        // move to the rig the vertex attributes, the primitives and the stateset

        this.mergeChildrenVertexAttributeList();
        var primitiveSetList = this._geometry.getPrimitiveSetList();

        this.getPrimitiveSetList().length = 0;
        for ( var i = 0, il = primitiveSetList.length; i < il; i++ )
            this.getPrimitiveSetList()[ i ] = primitiveSetList[ i ];

        if ( this.getStateSet() )
            console.error( 'A stateset in the rig is already present : ' + this.getStateSet() );
        this.setStateSet( this._geometry.getStateSet() );
    },

    update: function () {
        this._rigTransformImplementation.update( this );
    },

    computeTransformedVertex: function ( id, out ) {
        out = out || vec3.create();

        var vList = this.getVertexAttributeList();
        var vWeights = vList.Weights.getElements();
        var vBones = vList.Bones.getElements();

        var x = 0.0;
        var y = 0.0;
        var z = 0.0;
        if ( this._geometry.computeTransformedVertex ) {
            this._geometry.computeTransformedVertex( id, out );
            x = out[ 0 ];
            y = out[ 1 ];
            z = out[ 2 ];
        } else {
            var verts = vList.Vertex.getElements();
            x = verts[ id * 3 ];
            y = verts[ id * 3 + 1 ];
            z = verts[ id * 3 + 2 ];
        }

        var id4 = id * 4;

        var palette = this._rigTransformImplementation._skinningAttribute.getMatrixPalette();
        var m0 = 0.0;
        var m1 = 0.0;
        var m2 = 0.0;
        var m4 = 0.0;
        var m5 = 0.0;
        var m6 = 0.0;
        var m8 = 0.0;
        var m9 = 0.0;
        var m10 = 0.0;
        var m12 = 0.0;
        var m13 = 0.0;
        var m14 = 0.0;
        var m15 = 0.0;

        var doSkin = false;
        for ( var i = 0; i < 4; ++i ) {
            var w = vWeights[ id4 + i ];
            if ( w === 0.0 )
                continue;

            var idBone = vBones[ id4 + i ] * 12;

            m0 += palette[ idBone + 0 ] * w;
            m4 += palette[ idBone + 1 ] * w;
            m8 += palette[ idBone + 2 ] * w;
            m12 += palette[ idBone + 3 ] * w;

            m1 += palette[ idBone + 4 ] * w;
            m5 += palette[ idBone + 5 ] * w;
            m9 += palette[ idBone + 6 ] * w;
            m13 += palette[ idBone + 7 ] * w;

            m2 += palette[ idBone + 8 ] * w;
            m6 += palette[ idBone + 9 ] * w;
            m10 += palette[ idBone + 10 ] * w;
            m14 += palette[ idBone + 11 ] * w;

            m15 += w;
            doSkin = true;
        }

        if ( !doSkin ) {
            out[ 0 ] = x;
            out[ 1 ] = y;
            out[ 2 ] = z;
        }

        var d = 1.0 / m15;
        out[ 0 ] = ( m0 * x + m4 * y + m8 * z + m12 ) * d;
        out[ 1 ] = ( m1 * x + m5 * y + m9 * z + m13 ) * d;
        out[ 2 ] = ( m2 * x + m6 * y + m10 * z + m14 ) * d;

        return out;
    },

    computeTransformedVertices: function () {

        // obviously slow as it can't rely on kdTree AND we transform everything cpu side

        var vList = this.getVertexAttributeList();
        var verts = this._geometry.computeTransformedVertices ? this._geometry.computeTransformedVertices() : vList.Vertex.getElements();
        var vWeights = vList.Weights.getElements();
        var vBones = vList.Bones.getElements();

        var riggedVerts = this._riggedVerts || new Float32Array( verts.length );

        // /!\ if the geometry has several parents inside a skeleton
        // it might not work as it will just take the last compute matrix palette
        var palette = this._rigTransformImplementation._skinningAttribute.getMatrixPalette();

        // verbose... but fast
        for ( var idv = 0, idr = 0, len = verts.length; idv < len; idv += 3, idr += 4 ) {

            var m0 = 0.0;
            var m1 = 0.0;
            var m2 = 0.0;

            var m4 = 0.0;
            var m5 = 0.0;
            var m6 = 0.0;

            var m8 = 0.0;
            var m9 = 0.0;
            var m10 = 0.0;

            var m12 = 0.0;
            var m13 = 0.0;
            var m14 = 0.0;
            var m15 = 0.0;

            var doSkin = false;

            var w = vWeights[ idr ];
            var idBone;
            if ( w !== 0.0 ) {
                idBone = vBones[ idr ] * 12;
                m0 += palette[ idBone + 0 ] * w;
                m4 += palette[ idBone + 1 ] * w;
                m8 += palette[ idBone + 2 ] * w;
                m12 += palette[ idBone + 3 ] * w;

                m1 += palette[ idBone + 4 ] * w;
                m5 += palette[ idBone + 5 ] * w;
                m9 += palette[ idBone + 6 ] * w;
                m13 += palette[ idBone + 7 ] * w;

                m2 += palette[ idBone + 8 ] * w;
                m6 += palette[ idBone + 9 ] * w;
                m10 += palette[ idBone + 10 ] * w;
                m14 += palette[ idBone + 11 ] * w;

                m15 += w;
                doSkin = true;
            }

            w = vWeights[ idr + 1 ];
            if ( w !== 0.0 ) {
                idBone = vBones[ idr + 1 ] * 12;
                m0 += palette[ idBone + 0 ] * w;
                m4 += palette[ idBone + 1 ] * w;
                m8 += palette[ idBone + 2 ] * w;
                m12 += palette[ idBone + 3 ] * w;

                m1 += palette[ idBone + 4 ] * w;
                m5 += palette[ idBone + 5 ] * w;
                m9 += palette[ idBone + 6 ] * w;
                m13 += palette[ idBone + 7 ] * w;

                m2 += palette[ idBone + 8 ] * w;
                m6 += palette[ idBone + 9 ] * w;
                m10 += palette[ idBone + 10 ] * w;
                m14 += palette[ idBone + 11 ] * w;

                m15 += w;
                doSkin = true;
            }

            w = vWeights[ idr + 2 ];
            if ( w !== 0.0 ) {
                idBone = vBones[ idr + 2 ] * 12;

                m0 += palette[ idBone + 0 ] * w;
                m4 += palette[ idBone + 1 ] * w;
                m8 += palette[ idBone + 2 ] * w;
                m12 += palette[ idBone + 3 ] * w;

                m1 += palette[ idBone + 4 ] * w;
                m5 += palette[ idBone + 5 ] * w;
                m9 += palette[ idBone + 6 ] * w;
                m13 += palette[ idBone + 7 ] * w;

                m2 += palette[ idBone + 8 ] * w;
                m6 += palette[ idBone + 9 ] * w;
                m10 += palette[ idBone + 10 ] * w;
                m14 += palette[ idBone + 11 ] * w;

                m15 += w;
                doSkin = true;
            }

            w = vWeights[ idr + 3 ];
            if ( w !== 0.0 ) {
                idBone = vBones[ idr + 3 ] * 12;

                m0 += palette[ idBone + 0 ] * w;
                m4 += palette[ idBone + 1 ] * w;
                m8 += palette[ idBone + 2 ] * w;
                m12 += palette[ idBone + 3 ] * w;

                m1 += palette[ idBone + 4 ] * w;
                m5 += palette[ idBone + 5 ] * w;
                m9 += palette[ idBone + 6 ] * w;
                m13 += palette[ idBone + 7 ] * w;

                m2 += palette[ idBone + 8 ] * w;
                m6 += palette[ idBone + 9 ] * w;
                m10 += palette[ idBone + 10 ] * w;
                m14 += palette[ idBone + 11 ] * w;

                m15 += w;
                doSkin = true;
            }

            var x = verts[ idv ];
            var y = verts[ idv + 1 ];
            var z = verts[ idv + 2 ];

            if ( !doSkin ) {
                riggedVerts[ idv ] = x;
                riggedVerts[ idv + 1 ] = y;
                riggedVerts[ idv + 2 ] = z;
                continue;
            }

            var d = 1.0 / m15;
            riggedVerts[ idv ] = ( m0 * x + m4 * y + m8 * z + m12 ) * d;
            riggedVerts[ idv + 1 ] = ( m1 * x + m5 * y + m9 * z + m13 ) * d;
            riggedVerts[ idv + 2 ] = ( m2 * x + m6 * y + m10 * z + m14 ) * d;
        }

        return riggedVerts;
    }

} ), 'osgAnimation', 'RigGeometry' );

MACROUTILS.setTypeID( RigGeometry );

module.exports = RigGeometry;
