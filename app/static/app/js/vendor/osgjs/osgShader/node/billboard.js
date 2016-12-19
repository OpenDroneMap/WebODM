'use strict';
var MACROUTILS = require( 'osg/Utils' );
var ShaderUtils = require( 'osgShader/utils' );
var Node = require( 'osgShader/node/Node' );

var Billboard = function () {
    Node.apply( this );
};

Billboard.prototype = MACROUTILS.objectInherit( Node.prototype, {
    type: 'Billboard',
    validInputs: [ 'Vertex', 'ModelViewMatrix', 'ProjectionMatrix' ],
    validOutputs: [ 'vec' ],

    globalFunctionDeclaration: function () {
        return '#pragma include "billboard.glsl"';
    },
    computeShader: function () {
        return ShaderUtils.callFunction( 'billboard', this._outputs.vec, [ this._inputs.Vertex, this._inputs.ModelViewMatrix, this._inputs.ProjectionMatrix ] );
    }
} );

module.exports = {
    Billboard: Billboard
};
