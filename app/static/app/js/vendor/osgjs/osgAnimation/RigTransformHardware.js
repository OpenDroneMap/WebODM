'use strict';
var mat4 = require( 'osg/glMatrix' ).mat4;
var StateAttribute = require( 'osg/StateAttribute' );
var SkinningAttribute = require( 'osgAnimation/SkinningAttribute' );
var CollectBoneVisitor = require( 'osgAnimation/CollectBoneVisitor' );


/**
 * Hardware implementation for rigGeometry
 *
 */
var RigTransformHardware = function () {
    this._isInitialized = false;

    // bones are sorted to be used directly by
    // computeMatrixPalette
    // means the
    this._bones = [];
};


RigTransformHardware.prototype = {

    // boneNameID contains a map: boneName: id
    // {
    //    'bone0' : 1,
    //    'bone4' : 0,
    // }
    //
    // boneMap contains a map: boneName: Bone
    // {
    //    'bone0: : Bone object,
    //    'bone1: : Bone object,
    // }
    //
    // return index / bone object
    // [
    //    Bone4 object,
    //    Bone0 object
    // ]
    computeBonePalette: function ( boneMap, boneNameID ) {
        var keys = window.Object.keys( boneMap );
        var size = keys.length;
        var bones = this._bones;


        for ( var i = 0; i < size; i++ ) {
            var bName = keys[ i ];
            var index = boneNameID[ bName ];
            var bone = boneMap[ bName ];

            if ( index !== undefined )
                bones[ index ] = bone;
        }

        return bones;
    },


    init: function ( geom ) {

        // init the bones map

        // stop here
        // compute bonemap / index
        var mapVisitor = new CollectBoneVisitor();
        geom.getSkeleton().accept( mapVisitor );
        var bm = mapVisitor.getBoneMap();

        this.computeBonePalette( bm, geom._boneNameID );

        // matrix are 4x3
        var nbVec4Uniforms = this._bones.length * 3;
        var animAttrib = this._skinningAttribute = new SkinningAttribute();
        animAttrib.setMatrixPalette( new Float32Array( nbVec4Uniforms * 4 ) );
        geom.getStateSetAnimation().setAttributeAndModes( animAttrib, StateAttribute.ON );

        this._isInitialized = true;
        return true;
    },


    computeMatrixPalette: ( function () {

        var mTmp = mat4.create();

        return function ( transformFromSkeletonToGeometry, invTransformFromSkeletonToGeometry ) {

            var bones = this._bones;
            var matPalette = this._skinningAttribute.getMatrixPalette();
            var uniformIndex = 0;

            for ( var i = 0, l = bones.length; i < l; i++ ) {
                var bone = bones[ i ];

                var invBindMatrix = bone.getInvBindMatrixInSkeletonSpace();
                var boneMatrix = bone.getMatrixInSkeletonSpace();

                mat4.mul( mTmp, boneMatrix, invBindMatrix );
                mat4.mul( mTmp, invTransformFromSkeletonToGeometry, mTmp );
                mat4.mul( mTmp, mTmp, transformFromSkeletonToGeometry );

                // TODO: maybe change upload order so that we can use
                // glsl constructor :
                // mat4(uBones[index], uBones[index+1], uBones[index+2], vec4(0.0, 0.0, 0.0, 1.0))
                // for faster glsl
                matPalette[ uniformIndex++ ] = mTmp[ 0 ];
                matPalette[ uniformIndex++ ] = mTmp[ 4 ];
                matPalette[ uniformIndex++ ] = mTmp[ 8 ];
                matPalette[ uniformIndex++ ] = mTmp[ 12 ];

                matPalette[ uniformIndex++ ] = mTmp[ 1 ];
                matPalette[ uniformIndex++ ] = mTmp[ 5 ];
                matPalette[ uniformIndex++ ] = mTmp[ 9 ];
                matPalette[ uniformIndex++ ] = mTmp[ 13 ];

                matPalette[ uniformIndex++ ] = mTmp[ 2 ];
                matPalette[ uniformIndex++ ] = mTmp[ 6 ];
                matPalette[ uniformIndex++ ] = mTmp[ 10 ];
                matPalette[ uniformIndex++ ] = mTmp[ 14 ];
            }
        };

    } )(),

    update: function ( geom ) {

        if ( !this._isInitialized )
            this.init( geom );

        this.computeMatrixPalette( geom.getMatrixFromSkeletonToGeometry(), geom.getInvMatrixFromSkeletonToGeometry() );
    }
};


module.exports = RigTransformHardware;
