'use strict';
var MACROUTILS = require( 'osg/Utils' );
var vec3 = require( 'osg/glMatrix' ).vec3;
var BoundingBox = require( 'osg/BoundingBox' );
var mat4 = require( 'osg/glMatrix' ).mat4;
var MatrixTransform = require( 'osg/MatrixTransform' );
var UpdateBone = require( 'osgAnimation/UpdateBone' );


/**
 *  Bone
 *  @class Bone
 */
var Bone = function ( name ) {
    if ( name !== undefined )
        this.setName( name );

    MatrixTransform.call( this );
    this._invBindInSkeletonSpace = mat4.create();
    this._boneInSkeletonSpace = mat4.create();
    this._boneBoundingBox = new BoundingBox();
};

Bone.prototype = MACROUTILS.objectLibraryClass( MACROUTILS.objectInherit( MatrixTransform.prototype, {

    // consistent color depending of id
    // _rand: function ( id ) {
    //     var x = Math.sin( id * 45.233 ) * 43758.5453;
    //     return x - Math.floor( x );
    // },
    // _generateBoneColor: function ( id ) {
    //     return vec3.fromValues( this._rand( id + 2.16 ), this._rand( id * 57.27 ), this._rand( id * 0.874 ) );
    // },

    getOrCreateDebugColor: function () {
        // for bone display (debugging, etc)
        if ( this._boneColor ) return this._boneColor;
        // this._boneColor = this._generateBoneColor( this.getInstanceID() );
        this._boneColor = vec3.fromValues( Math.random(), Math.random(), Math.random() );
        return this._boneColor;
    },

    getBoneBoundingBox: function () {
        return this._boneBoundingBox;
    },

    setBoneBoundingBox: function ( bb ) {
        this._boneBoundingBox = bb;
    },

    getMatrixInSkeletonSpace: function () {
        return this._boneInSkeletonSpace;
    },

    getInvBindMatrixInSkeletonSpace: function () {
        return this._invBindInSkeletonSpace;
    },

    setMatrixInSkeletonSpace: function ( m ) {
        mat4.copy( this._boneInSkeletonSpace, m );
    },

    setInvBindMatrixInSkeletonSpace: function ( m ) {
        mat4.copy( this._invBindInSkeletonSpace, m );
    },

    getBoneParent: function () {
        var parents = this.getParents();
        for ( var i = 0, l = parents.length; i < l; i++ ) {
            var typeID = parents[ i ].getTypeID();
            if ( typeID === Bone.getTypeID() ) {
                return parents[ i ];
            }
        }
        return undefined;
    },

    setDefaultUpdateCallback: function ( name ) {
        this.addUpdateCallback( new UpdateBone( ( name !== undefined ) ? name : this.getName() ) );
    }
} ), 'osgAnimation', 'Bone' );
MACROUTILS.setTypeID( Bone );

module.exports = Bone;
