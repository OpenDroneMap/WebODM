'use strict';
var MACROUTILS = require( 'osg/Utils' );
var shaderUtils = require( 'osgShader/utils' );
var Node = require( 'osgShader/node/Node' );

// base class for all point based light: Point/Directional/Spot/Hemi
// avoid duplicate code
var NodeLights = function () {
    Node.call( this );
};

NodeLights.prototype = MACROUTILS.objectInherit( Node.prototype, {

    validOutputs: [ 'color' ],
    globalFunctionDeclaration: function () {
        return '#pragma include "lights.glsl"';
    }

} );

var getVec3 = function ( vec ) {
    return vec.getType() === 'vec4' ? vec.getVariable() + '.rgb' : vec;
};

var PointLight = function () {
    NodeLights.call( this );
};

PointLight.prototype = MACROUTILS.objectInherit( NodeLights.prototype, {

    type: 'PointLight',

    validInputs: [
        'normal',
        'eyeVector',
        'materialambient',
        'materialdiffuse',
        'materialspecular',
        'materialshininess',

        'lightambient',
        'lightdiffuse',
        'lightspecular',

        'lightposition',
        'lightattenuation',

        'lightmatrix',

        'lighted',
        'lightEyePos',
        'lightEyeDir',
        'lightNDL'

    ],

    computeShader: function () {

        return shaderUtils.callFunction(
            'computePointLightShading',
            this._outputs.color, [ this._inputs.normal,
                this._inputs.eyeVector,

                getVec3( this._inputs.materialambient ),
                getVec3( this._inputs.materialdiffuse ),
                getVec3( this._inputs.materialspecular ),
                this._inputs.materialshininess,

                getVec3( this._inputs.lightambient ),
                getVec3( this._inputs.lightdiffuse ),
                getVec3( this._inputs.lightspecular ),

                this._inputs.lightposition,
                this._inputs.lightattenuation,

                this._inputs.lightmatrix,

                this._inputs.lightEyePos,
                this._inputs.lightEyeDir,
                this._inputs.lightNDL,
                this._inputs.lighted
            ] );
    }

} );



var SpotLight = function () {
    NodeLights.call( this );
};

SpotLight.prototype = MACROUTILS.objectInherit( NodeLights.prototype, {

    type: 'SpotLight',

    validInputs: [
        'normal',
        'eyeVector',

        'materialambient',
        'materialdiffuse',
        'materialspecular',
        'materialshininess',

        'lightambient',
        'lightdiffuse',
        'lightspecular',

        'lightdirection',
        'lightattenuation',
        'lightposition',
        'lightspotCutOff',
        'lightspotBlend',

        'lightmatrix',
        'lightinvMatrix',

        'lighted',
        'lightEyePos',
        'lightEyeDir',
        'lightNDL'

    ],

    computeShader: function () {

        return shaderUtils.callFunction(
            'computeSpotLightShading',
            this._outputs.color, [ this._inputs.normal,
                this._inputs.eyeVector,

                getVec3( this._inputs.materialambient ),
                getVec3( this._inputs.materialdiffuse ),
                getVec3( this._inputs.materialspecular ),
                this._inputs.materialshininess,

                getVec3( this._inputs.lightambient ),
                getVec3( this._inputs.lightdiffuse ),
                getVec3( this._inputs.lightspecular ),

                this._inputs.lightdirection,
                this._inputs.lightattenuation,
                this._inputs.lightposition,
                this._inputs.lightspotCutOff,
                this._inputs.lightspotBlend,

                this._inputs.lightmatrix,
                this._inputs.lightinvMatrix,

                this._inputs.lightEyePos,
                this._inputs.lightEyeDir,
                this._inputs.lightNDL,
                this._inputs.lighted
            ] );
    }

} );


var SunLight = function () {
    NodeLights.call( this );
};

SunLight.prototype = MACROUTILS.objectInherit( NodeLights.prototype, {

    type: 'SunLight',

    validInputs: [
        'normal',
        'eyeVector',
        'materialambient',
        'materialdiffuse',
        'materialspecular',
        'materialshininess',

        'lightambient',
        'lightdiffuse',
        'lightspecular',

        'lightposition',

        'lightmatrix',

        'lighted',
        'lightEyeDir',
        'lightNDL'

    ],

    computeShader: function () {

        return shaderUtils.callFunction(
            'computeSunLightShading',
            this._outputs.color, [ this._inputs.normal,
                this._inputs.eyeVector,

                getVec3( this._inputs.materialambient ),
                getVec3( this._inputs.materialdiffuse ),
                getVec3( this._inputs.materialspecular ),
                this._inputs.materialshininess,

                getVec3( this._inputs.lightambient ),
                getVec3( this._inputs.lightdiffuse ),
                getVec3( this._inputs.lightspecular ),

                this._inputs.lightposition,

                this._inputs.lightmatrix,

                this._inputs.lightEyeDir,
                this._inputs.lightNDL,
                this._inputs.lighted
            ] );
    }
} );

var HemiLight = function () {
    NodeLights.call( this );
};

HemiLight.prototype = MACROUTILS.objectInherit( NodeLights.prototype, {

    type: 'HemiLight',

    validInputs: [
        'normal',
        'eyeVector',
        'materialdiffuse',
        'materialspecular',
        'materialshininess',

        'lightdiffuse',
        'lightground',

        'lightposition',

        'lightmatrix',

        'lighted',
        'lightEyeDir',
        'lightNDL'
    ],

    computeShader: function () {

        return shaderUtils.callFunction(
            'computeHemiLightShading',
            this._outputs.color, [ this._inputs.normal,
                this._inputs.eyeVector,

                getVec3( this._inputs.materialdiffuse ),
                getVec3( this._inputs.materialspecular ),
                this._inputs.materialshininess,

                getVec3( this._inputs.lightdiffuse ),
                getVec3( this._inputs.lightground ),

                this._inputs.lightposition,

                this._inputs.lightmatrix,

                this._inputs.lightEyeDir,
                this._inputs.lightNDL,
                this._inputs.lighted
            ] );
    }
} );

module.exports = {
    PointLight: PointLight,
    SpotLight: SpotLight,
    SunLight: SunLight,
    HemiLight: HemiLight
};
