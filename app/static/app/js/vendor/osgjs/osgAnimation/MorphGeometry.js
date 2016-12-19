'use strict';
var MACROUTILS = require( 'osg/Utils' );
var BufferArrayProxy = require( 'osg/BufferArrayProxy' );
var Notify = require( 'osg/notify' );
var vec3 = require( 'osg/glMatrix' ).vec3;
var Geometry = require( 'osg/Geometry' );
var StateSet = require( 'osg/StateSet' );
var MorphAttribute = require( 'osgAnimation/MorphAttribute' );
var StateAttribute = require( 'osg/StateAttribute' );
var BoundingBox = require( 'osg/BoundingBox' );


/**
 * MorphGeometry manage up to 4 morphTargets
 * @class MorphGeometry
 * @inherits Geometry
 */

var MorphGeometry = function () {
    Geometry.call( this );

    this._shape = null; // by default no kdtree/shape for morph

    this._targets = []; // Target list (Geometry)
    this._stateSetAnimation = new StateSet(); // StateSet to handle morphAttribute
    this._targetWeights = new Float32Array( 4 ); // Fixed length array feed by UpdateMorph

    this._morphTargetNames = undefined;
    this._updateMorph = undefined;

    this._isInitialized = false;
};

// sync with UpdateMorph
var EFFECTIVE_EPS = MorphGeometry.EFFECTIVE_EPS = 0.05;

MorphGeometry.prototype = MACROUTILS.objectLibraryClass( MACROUTILS.objectInherit( Geometry.prototype, {

    init: function () {
        var animAttrib = new MorphAttribute( Math.min( 4, this.getMorphTargets().length ) );
        this.getStateSetAnimation().setAttributeAndModes( animAttrib, StateAttribute.ON );
        animAttrib.setTargetWeights( this.getTargetsWeight() );


        if ( this._targets[ 0 ] ) {
            this._morphTargetNames = window.Object.keys( this._targets[ 0 ].getVertexAttributeList() );
            animAttrib.copyTargetNames( this._morphTargetNames );
        } else {
            this._morphTargetNames = [];
            Notify.error( 'No Targets in the MorphGeometry !' );
        }

        this._isInitialized = true;
        return true;
    },

    getMorphTargetNames: function () {
        return this._morphTargetNames;
    },

    getStateSetAnimation: function () {
        return this._stateSetAnimation;
    },

    getMorphTargets: function () {
        return this._targets;
    },

    isInitialized: function () {
        return this._isInitialized;
    },

    getTargetsWeight: function () {
        return this._targetWeights;
    },

    computeBoundingBox: ( function () {
        var tmpBox = new BoundingBox();

        return function ( boundingBox ) {
            Geometry.prototype.computeBoundingBox.call( this, boundingBox );

            // expand bb with targets
            // Note : if the morphs have many many targets it can be done more smartly in
            // the UpdateMorph on each frame by just taking into account the "active morphs"
            for ( var i = 0, l = this._targets.length; i < l; i++ ) {
                boundingBox.expandByBoundingBox( this._targets[ i ].computeBoundingBox( tmpBox ) );
            }

            return boundingBox;
        };
    } )(),

    mergeChildrenVertexAttributeList: function () {

        for ( var i = 0, l = this._targets.length; i < l; i++ ) {

            var target = this._targets[ i ];

            // change BufferArray to BufferArrayProxy
            var attributeList = target.getVertexAttributeList();
            var names = window.Object.keys( attributeList );
            for ( var j = 0, jn = names.length; j < jn; j++ ) {

                var name = names[ j ];
                var att = attributeList[ name ];
                // check it's a buffer array before swtiching to proxy
                if ( att && !att.getBufferArray ) {

                    attributeList[ name ] = new BufferArrayProxy( att );

                }

            }

            Geometry.appendVertexAttributeToList( target.getVertexAttributeList(), this.getVertexAttributeList(), i );

        }

    },

    _computeEffectiveSumWeights: function () {
        var sum = 0.0;
        var weights = this._targetWeights;
        for ( var i = 0, nb = weights.length; i < nb; ++i ) {

            var weight = weights[ i ];
            if ( Math.abs( weight ) < EFFECTIVE_EPS )
                continue;

            sum += weight;
        }
        var eps = 1e-5;
        if ( Math.abs( sum ) > eps ) return sum;
        return sum < 0.0 ? -eps : eps;
    },

    computeTransformedVertex: function ( id, out ) {
        out = out || vec3.create();

        var id3 = id * 3;

        var weights = this._targetWeights;
        var vList = this.getVertexAttributeList();

        var baseVerts = vList.Vertex.getElements();

        var sumWeights = 1.0 - this._computeEffectiveSumWeights();
        out[ 0 ] = sumWeights * baseVerts[ id3 ];
        out[ 1 ] = sumWeights * baseVerts[ id3 + 1 ];
        out[ 2 ] = sumWeights * baseVerts[ id3 + 2 ];

        for ( var j = 0, nb = weights.length; j < nb; ++j ) {

            var weight = weights[ j ];
            if ( Math.abs( weight ) < EFFECTIVE_EPS )
                continue;

            var morphElts = vList[ 'Vertex_' + j ].getElements();
            out[ 0 ] += weight * morphElts[ id3 ];
            out[ 1 ] += weight * morphElts[ id3 + 1 ];
            out[ 2 ] += weight * morphElts[ id3 + 2 ];
        }

        return out;
    },

    computeTransformedVertices: function () {

        var weights = this._targetWeights;
        var vList = this.getVertexAttributeList();

        var baseVerts = vList.Vertex.getElements();
        var vertexLen = baseVerts.length;

        var morphedVerts = this._morphedVerts = this._morphedVerts || new Float32Array( vertexLen );

        // base vertex influence
        var baseWeight = 1.0 - this._computeEffectiveSumWeights();
        for ( var i = 0; i < vertexLen; ++i ) {
            morphedVerts[ i ] = baseWeight * baseVerts[ i ];
        }

        for ( var j = 0, nb = weights.length; j < nb; ++j ) {

            var weight = weights[ j ];
            if ( Math.abs( weight ) < EFFECTIVE_EPS )
                continue;

            // important : we should not take getInitialBufferArray as we should take the partially computed cpu morph from UpdateMorph
            var morphElts = vList[ 'Vertex_' + j ].getElements();
            for ( var k = 0; k < vertexLen; ++k ) {
                morphedVerts[ k ] += weight * morphElts[ k ];
            }
        }

        return morphedVerts;
    }


} ), 'osgAnimation', 'MorphGeometry' );

MACROUTILS.setTypeID( MorphGeometry );

module.exports = MorphGeometry;
