'use strict';
var MACROUTILS = require( 'osg/Utils' );
var utils = require( 'osgShader/utils' );
var Node = require( 'osgShader/node/Node' );

var sprintf = utils.sprintf;

// base to avoid redundant global declarations
// it's to keep node more readable
var NodeFunctions = function () {
    Node.call( this );
};

NodeFunctions.prototype = MACROUTILS.objectInherit( Node.prototype, {

    globalFunctionDeclaration: function () {
        return '#pragma include "functions.glsl"';
    }

} );


var Normalize = function () {
    NodeFunctions.call( this );
};
Normalize.prototype = MACROUTILS.objectInherit( NodeFunctions.prototype, {
    type: 'Normalize',
    validInputs: [ 'vec' ],
    validOuputs: [ 'vec' ],
    computeShader: function () {
        return utils.callFunction( 'normalize', this._outputs.vec, [ this._inputs.vec ] );
    }
} );


var sRGBToLinear = function () {
    NodeFunctions.call( this );
};

sRGBToLinear.prototype = MACROUTILS.objectInherit( NodeFunctions.prototype, {

    type: 'sRGBToLinear',

    validInputs: [ 'color' ],
    validOuputs: [ 'color' ],

    computeShader: function () {
        return this.computeConversion( 'sRGBToLinear' );
    },
    computeConversion: function ( funcName ) {
        var out = this._outputs.color;
        var color = this._inputs.color;
        var rgb = out.getType() !== color.getType() ? '.rgb' : '';

        return utils.callFunction( funcName, out.getVariable() + rgb, [ color.getVariable() + rgb ] );
    }

} );

var LinearTosRGB = function () {
    sRGBToLinear.call( this );
};

LinearTosRGB.prototype = MACROUTILS.objectInherit( sRGBToLinear.prototype, {
    type: 'LinearTosRGB',
    computeShader: function () {
        return this.computeConversion( 'linearTosRGB' );
    }
} );

var FrontNormal = function () {
    NodeFunctions.call( this );
};

FrontNormal.prototype = MACROUTILS.objectInherit( NodeFunctions.prototype, {

    type: 'FrontNormal',
    validInputs: [ 'normal' ],
    validOuputs: [ 'normal' ],

    computeShader: function () {
        return sprintf( '%s = gl_FrontFacing ? %s : -%s ;', [
            this._outputs.normal.getVariable(),
            this._inputs.normal.getVariable(),
            this._inputs.normal.getVariable()
        ] );
    }
} );

var getVec3 = function ( vec ) {
    return vec.getType && vec.getType() === 'vec4' ? vec.getVariable() + '.rgb' : vec;
};
var EncodeRGBM = function () {
    NodeFunctions.call( this );
};
EncodeRGBM.prototype = MACROUTILS.objectInherit( NodeFunctions.prototype, {
    type: 'EncodeRGBM',
    validInputs: [ 'color', 'range' ],
    validOutputs: [ 'color' ],
    computeShader: function () {
        return utils.callFunction( 'encodeRGBM', this._outputs.color, [ getVec3( this._inputs.color ), this._inputs.range ] );
    }
} );

var DecodeRGBM = function () {
    NodeFunctions.call( this );
};
DecodeRGBM.prototype = MACROUTILS.objectInherit( NodeFunctions.prototype, {
    type: 'DecodeRGBM',
    validInputs: [ 'color', 'range' ],
    validOutputs: [ 'color' ],
    computeShader: function () {
        return utils.callFunction( 'decodeRGBM', this._outputs.color, [ this._inputs.color, this._inputs.range ] );
    }
} );

var Define = function ( name ) {
    Node.call( this );
    this._defineName = name;
    this._defineValue = '';
};
Define.prototype = MACROUTILS.objectInherit( Node.prototype, {
    type: 'Define',
    setValue: function ( value ) {
        this._defineValue = value;
        return this;
    },
    getDefines: function () {
        return [ '#define ' + this._defineName + ' ' + this._defineValue ];
    }
} );

module.exports = {
    NodeFunctions: NodeFunctions,
    Normalize: Normalize,
    sRGBToLinear: sRGBToLinear,
    LinearTosRGB: LinearTosRGB,
    FrontNormal: FrontNormal,
    DecodeRGBM: DecodeRGBM,
    EncodeRGBM: EncodeRGBM,
    Define: Define
};
