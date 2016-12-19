'use strict';
var MACROUTILS = require( 'osg/Utils' );
var BufferArray = require( 'osg/BufferArray' );
var RigGeometry = require( 'osgAnimation/RigGeometry' );
var AnimationUpdateCallback = require( 'osgAnimation/AnimationUpdateCallback' );
var Target = require( 'osgAnimation/target' );
var MorphGeometry = require( 'osgAnimation/MorphGeometry' );

var UpdateMorph = function () {
    AnimationUpdateCallback.call( this );

    this._isInitialized = false;
    this._targets = []; // float target
    this._targetNames = []; // names of targets
    this._morphs = []; // the update morph can update several morphs

    this._weights = new Float32Array( 4 );
    // stuffs to handles > 4 targets
    this._indexMap = [ 0, 0, 0, 0 ]; // we map VA to the first 4th VA targets
    this._gpuMorphed = []; // size of this._targets, for each target a bool states if it's gpu morphed or not
};

var EFFECTIVE_EPS = MorphGeometry.EFFECTIVE_EPS; // in case we have more than 4 morphs, we can skip low effective weights

// for sorting
var funcWeights = function ( a, b ) {
    return Math.abs( b.value ) - Math.abs( a.value );
};

UpdateMorph.prototype = MACROUTILS.objectInherit( AnimationUpdateCallback.prototype, {

    init: function ( node ) {
        //Find the morph geometry & init it
        var children = node.getChildren();
        for ( var i = 0, l = children.length; i < l; i++ ) {

            var geom = children[ i ];
            var morph;
            if ( geom instanceof MorphGeometry ) {
                morph = geom;
            } else if ( geom instanceof RigGeometry && geom.getSourceGeometry() instanceof MorphGeometry ) {
                morph = geom.getSourceGeometry();
            }

            if ( !morph ) continue;

            if ( morph.getName() === this.getName() ) {
                if ( !morph.isInitialized() )
                    morph.init();

                this._morphs.push( morph );
                this._isInitialized = true;
            }
        }
    },

    isInitialized: function () {
        return this._isInitialized;
    },

    getNumTarget: function () {
        return this._targets.length;
    },

    getTarget: function ( index ) {
        return this._targets[ index ];
    },

    getTargetName: function ( index ) {
        return this._targetNames[ index ];
    },

    addTarget: function ( name, index ) {
        this._targets[ index ] = Target.createFloatTarget( 0 );
        this._targetNames[ index ] = name;
    },

    _remapBufferArrays: function () {

        // basically, this function remaps all the active morphed VA to the 4th first morphTargets VA
        var indexMap = this._indexMap;
        var morphs = this._morphs;
        for ( var i = 0; i < 4; ++i ) {
            var index = indexMap[ i ];
            var strI = '_' + i;
            var strIndex = '_' + index;

            for ( var j = 0, nbMorphs = morphs.length; j < nbMorphs; ++j ) {

                var morph = morphs[ j ];
                var vAttrs = morph.getVertexAttributeList();
                var morphNames = morph.getMorphTargetNames();
                for ( var k = 0, nbNames = morphNames.length; k < nbNames; ++k ) {

                    var attName = morphNames[ k ];
                    vAttrs[ attName + strI ].setBufferArray( vAttrs[ attName + strIndex ].getInitialBufferArray() );

                }
            }
        }
    },

    _mergeExtraMorphTarget: function ( attrs, attName, extraWeightSum ) {

        var i = 0;
        // ignore the gpu morphed
        var gpuMorphed = this._gpuMorphed;
        var vAttr = attrs[ attName ];
        var vertexLen = vAttr.getElements().length;
        var nbVertex = vertexLen / vAttr.getItemSize();
        var itemSize = vAttr.getItemSize();

        vAttr._cpuMorph = vAttr._cpuMorph || new BufferArray( BufferArray.ARRAY_BUFFER, new Float32Array( vertexLen ), itemSize );
        var morphExtraTargets = vAttr._cpuMorph.getElements();
        for ( i = 0; i < vertexLen; ++i ) {
            morphExtraTargets[ i ] = 0.0;
        }

        var targets = this._targets;
        for ( var j = 0, nb = targets.length; j < nb; ++j ) {

            // ignore gpu morphed targets
            if ( gpuMorphed[ j ] === true )
                continue;

            var weight = targets[ j ].value;
            if ( Math.abs( weight ) < EFFECTIVE_EPS )
                continue;

            weight /= extraWeightSum;

            var morphElts = attrs[ attName + '_' + j ].getInitialBufferArray().getElements();
            for ( i = 0; i < nbVertex; ++i ) {

                var k = i * itemSize;
                morphExtraTargets[ k ] += weight * morphElts[ k ];
                morphExtraTargets[ k + 1 ] += weight * morphElts[ k + 1 ];
                morphExtraTargets[ k + 2 ] += weight * morphElts[ k + 2 ];
                // don't morph tangent w component
            }
        }

        // map on last index target
        attrs[ attName + '_3' ].setBufferArray( vAttr._cpuMorph );
        vAttr._cpuMorph.dirty();
    },

    _computeExtraWeightsSum: function () {
        var gpuMorphed = this._gpuMorphed;
        var sum = 0.0;
        var targets = this._targets;
        for ( var i = 0, nb = targets.length; i < nb; ++i ) {

            // ignore gpu morphed targets
            if ( gpuMorphed[ i ] === true )
                continue;

            var weight = targets[ i ].value;
            if ( Math.abs( weight ) < EFFECTIVE_EPS )
                continue;

            sum += weight;
        }
        // check comment in _morphBufferArrayCPU (avoid near zero value)
        var eps = 1e-5;
        if ( Math.abs( sum ) > eps ) return sum;
        return sum < 0.0 ? -eps : eps;
    },

    _morphBufferArrayCPU: function () {

        // the idea is... we have :
        // v' = v * (1-w1-w2-w3) + t1*w1 + t2*w2 + t3*w3
        // we want
        // v' = v * (1-w1-w4) + t1*w1 + t4*w4
        // so basically we have to compute
        // w4 = w2+w3 // (check if ~0 !)
        // t4 = (t2*w2+t3*w3)/w4
        // (w4 is extraWeightSum and t4 will be computed in _mergeExtraMorphTarget)

        // compute new weights for the 4th target (all the extra target will be merged inside this one)
        var extraWeightSum = this._weights[ 3 ] = this._computeExtraWeightsSum();

        var processed = {}; // handles referenced buffer array (avoid useless double morph computation the same buffer)
        var morphs = this._morphs;
        for ( var i = 0, nbMorphs = morphs.length; i < nbMorphs; ++i ) {

            var morph = morphs[ i ];
            var vAttrs = morph.getVertexAttributeList();
            var morphNames = morph.getMorphTargetNames();

            for ( var j = 0, nbNames = morphNames.length; j < nbNames; ++j ) {

                var name = morphNames[ j ];
                var attr = vAttrs[ name ];
                // skip if the bufferArray is shared in another morphGeometry and has already been cpu morphed
                if ( !attr || processed[ attr.getInstanceID() ] ) continue;
                processed[ attr.getInstanceID() ] = true;

                this._mergeExtraMorphTarget( vAttrs, name, extraWeightSum );
            }
        }
    },

    updateWeights: function () {

        var i = 0;
        var targets = this._targets;
        var nbTargets = targets.length;
        // reset weights
        var weights = this._weights;
        weights[ 0 ] = weights[ 1 ] = weights[ 2 ] = weights[ 3 ] = 0.0;

        // no need to swap VA or to use CPU morph
        if ( nbTargets <= 4 ) {
            for ( i = 0; i < nbTargets; ++i ) {
                weights[ i ] = targets[ i ].value;
            }
            return;
        }

        // reset indexMap
        var indexMap = this._indexMap;
        indexMap[ 0 ] = indexMap[ 1 ] = indexMap[ 2 ] = indexMap[ 3 ] = 0;

        // reset gpu morphed array
        var gpuMorphed = this._gpuMorphed;
        gpuMorphed.length = nbTargets;
        for ( i = 0; i < nbTargets; ++i ) gpuMorphed[ i ] = false;

        var sortedTargets = targets.slice( 0 ).sort( funcWeights );

        for ( i = 0; i < 4; ++i ) {
            var ti = targets.indexOf( sortedTargets[ i ] );
            gpuMorphed[ ti ] = true;
            indexMap[ i ] = ti;
            weights[ i ] = sortedTargets[ i ].value;
        }

        // check more than 4 targets, we compute all the extra targets influence and merge in the last 4th morphs targets
        var extraMorphCPU = Math.abs( sortedTargets[ 4 ].value ) >= EFFECTIVE_EPS;
        gpuMorphed[ indexMap[ 3 ] ] = !extraMorphCPU;

        this._remapBufferArrays();
        if ( extraMorphCPU ) {
            this._morphBufferArrayCPU();
        }
    },

    update: function ( node /*, nv*/ ) {
        if ( !this.isInitialized() )
            this.init( node );

        this.updateWeights();

        var weights = this._weights;
        var nbTargets = Math.min( 4, this._targets.length );
        var morphs = this._morphs;
        for ( var i = 0, nbMorphs = morphs.length; i < nbMorphs; ++i ) {

            var array = morphs[ i ].getTargetsWeight();
            for ( var j = 0; j < nbTargets; j++ ) {
                array[ j ] = weights[ j ];
            }
        }

        return true;
    }
} );

module.exports = UpdateMorph;
