'use strict';
var MACROUTILS = require( 'osg/Utils' );
var ShaderUtils = require( 'osgShader/utils' );
var Node = require( 'osgShader/node/Node' );

var ShadowReceive = function () {
    Node.call( this );

};

ShadowReceive.prototype = MACROUTILS.objectInherit( Node.prototype, {
    type: 'ShadowReceiveNode',
    validInputs: [ 'lighted', 'shadowTexture', 'shadowTextureMapSize', 'shadowTextureProjectionMatrix', 'shadowTextureViewMatrix', 'shadowTextureDepthRange', 'lightNDL', 'vertexWorld', 'shadowbias', /* 'shadowexponent0', 'shadowexponent1', 'shadowepsilonVSM' */ ],
    validOutputs: [ 'float' ],

    globalFunctionDeclaration: function () {
        return '#pragma include "shadowsReceive.glsl"';
    },

    setShadowAttribute: function ( shadowAttr ) {
        this._shadow = shadowAttr;
    },

    // must return an array of defines
    // because it will be passed to the ShaderGenerator
    getDefines: function () {
        return this._shadow.getDefines();
    },
    getExtensions: function () {
        return this._shadow.getExtensions();
    },
    computeShader: function () {

        var inp = this._inputs;

        // common inputs
        var inputs = [
            inp.lighted,
            inp.shadowTexture,
            inp.shadowTextureMapSize,
            inp.shadowTextureProjectionMatrix,
            inp.shadowTextureViewMatrix,
            inp.shadowTextureDepthRange,
            inp.lightNDL,
            inp.vertexWorld,
            inp.shadowbias
        ];

        var algo = this._shadow.getAlgorithm();
        if ( algo === 'ESM' ) {
            inputs.push( this._inputs.shadowexponent0 );
            inputs.push( this._inputs.shadowexponent1 );
        } else if ( algo === 'EVSM' ) {
            inputs.push( this._inputs.shadowepsilonVSM );
            inputs.push( this._inputs.shadowexponent0 );
            inputs.push( this._inputs.shadowexponent1 );
        } else if ( algo === 'VSM' ) {
            inputs.push( this._inputs.shadowepsilonVSM );
        }

        return ShaderUtils.callFunction( 'computeShadow', this._outputs.float, inputs );
    }

} );

var ShadowCast = function () {
    Node.call( this );

};

ShadowCast.prototype = MACROUTILS.objectInherit( Node.prototype, {
    type: 'ShadowCast',
    validInputs: [ 'exponent0', 'exponent1', 'shadowDepthRange', 'fragEye' ],
    validOutputs: [ 'color' ],

    globalFunctionDeclaration: function () {
        return '#pragma include "shadowsCastFrag.glsl"';
    },
    setShadowCastAttribute: function ( shadowAttr ) {
        this._shadowCast = shadowAttr;
        return this;
    },
    // must return an array of defines
    // because it will be passed to the ShaderGenerator
    getDefines: function () {
        return this._shadowCast.getDefines();
    },
    computeShader: function () {
        var inp = this._inputs;

        var algo = this._shadowCast.getAlgorithm();
        if ( algo === 'NONE' || algo === 'PCF' ) {
            return ShaderUtils.callFunction( 'computeShadowDepth', this._outputs.color, [ inp.fragEye, inp.shadowDepthRange ] );
        }

        return ShaderUtils.callFunction( 'computeShadowDepth', this._outputs.color, [ inp.fragEye, inp.shadowDepthRange, inp.exponent0, inp.exponent1 ] );
    }

} );

module.exports = {
    ShadowCast: ShadowCast,
    ShadowReceive: ShadowReceive
};
