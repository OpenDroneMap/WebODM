'use strict';
var MACROUTILS = require( 'osg/Utils' );
var ShaderUtils = require( 'osgShader/utils' );
var Node = require( 'osgShader/node/Node' );

var Skinning = function () {
    Node.call( this );
};

Skinning.prototype = MACROUTILS.objectInherit( Node.prototype, {
    type: 'Skinning',
    validInputs: [ 'weights', 'bonesIndex', 'matrixPalette' ],
    validOutputs: [ 'mat4' ],

    globalFunctionDeclaration: function () {
        return '#pragma include "skinning.glsl"';
    },

    computeShader: function () {
        // For now matrixPalette is used as a global (uBones) because an array means a dynamic function signature in the glsl...
        return ShaderUtils.callFunction( 'skeletalTransform', this._outputs.mat4, [ this._inputs.weights, this._inputs.bonesIndex ] );
    }
} );

module.exports = {
    Skinning: Skinning
};
