'use strict';
var MACROUTILS = require( 'osg/Utils' );
var Texture = require( 'osg/Texture' );

var kernelSizeList = [ '1Band(1texFetch)', '4Band(4texFetch)', '9Band(9texFetch)', '16Band(16texFetch)', '1Tap(4texFetch)', '4Tap(16texFetch)', '9Tap(36texFetch)', '16Tap(64texFetch)', '4Poisson(16texFetch)', '8Poisson(32texFetch)', '16Poisson(64texFetch)', '25Poisson(100texFetch)', '32Poisson(128texFetch)' ];

/**
 *  ShadowSettings provides the parameters that the ShadowTechnique should use as a guide for setting up shadowing
 *  @class ShadowSettings
 */
var ShadowSettings = function ( options ) {

    this.castsShadowDrawTraversalMask = 0xffffffff;
    this.castsShadowBoundsTraversalMask = 0xffffffff;

    this.textureSize = 1024;

    // important note:
    // comparison shadow is: DepthShadow > DephFragment => shadowed
    // which is d<z
    // and
    // Average( (d < z) ) != (Average( z ) < d)
    // so PCF/NONE technique cannot be prefiltered (bilinear, etc..) with HW filter
    // on gl/dx desktop there is a sampler2DShadow that allows that taking z in third param
    // we emulate that with texture2DShadowLerp
    // which is why some techniques have more texfetch than advertized.
    // http://http.developer.nvidia.com/GPUGems/gpugems_ch11.html

    // texture precision. (and bandwith implication)
    this.textureType = 'UNSIGNED_BYTE';

    this.textureFormat = Texture.RGBA;

    // either orthogonal (non-fov) or perpsective (fov)
    this.shadowProjection = 'fov';
    // fov size: can be infered from spotlight angle
    this.fov = 50;

    // PCF algo and kernel size
    // Band kernelsize gives nxn texFetch
    // others a n*n*4 (emulating the HW shadowSampler)
    // '4Band(4texFetch)', '9Band(9texFetch)', '16Band(16texFetch)', '4Tap(16texFetch)', '9Tap(36texFetch)', '16Tap(64texFetch)', '4Poisson(16texFetch)', '8Poisson(32texFetch)', '16Poisson(64texFetch)', '25Poisson(100texFetch)', '32Poisson(128texFetch)'
    this.kernelSizePCF = '4Band(4texFetch)';
    // ensure that we don't linearly interpolate between shadowmap
    // but do use the fake Texture2DShadow
    // http://codeflow.org/entries/2013/feb/15/soft-shadow-mapping/#interpolated-shadowing
    this._fakePCF = false;
    //
    this._rotateOffset = false;
    // for prefilterable technique (ESM/VSM/EVSM)
    this.superSample = 0;
    this.blur = false;
    this.blurKernelSize = 4.0;
    this.blurTextureSize = 256;

    // VSM bias
    this.epsilonVSM = 0.0008;

    // depth offset (shadow acne / peter panning)
    this.bias = 0.005;


    // Impact on shadow aliasing by better coverage
    // algo for shadow
    //'Variance Shadow Map (VSM)': 'VSM',
    //'Exponential Variance Shadow Map (EVSM)': 'EVSM',
    //'Exponential Shadow Map (ESM)': 'ESM',
    //'Shadow Map': 'NONE',
    //'Shadow Map Percentage Close Filtering (PCF)': 'PCF'
    // nice overview here
    // http://developer.download.nvidia.com/presentations/2008/GDC/GDC08_SoftShadowMapping.pdf
    // ALGO alllowing filtering
    //
    // ESM http://research.edm.uhasselt.be/tmertens/papers/gi_08_esm.pdf
    // http://pixelstoomany.wordpress.com/2008/06/12/a-conceptually-simpler-way-to-derive-exponential-shadow-maps-sample-code/
    // VSM: http://www.punkuser.net/vsm/
    // http://lousodrome.net/blog/light/tag/evsm
    this.algorithm = 'PCF';

    // Exponential techniques variales
    this.exponent = 40;
    this.exponent1 = 10;

    // defaut shader generator name for shadow casting
    this.shadowCastShaderGeneratorName = 'ShadowCast';

    // if url options override url options
    MACROUTILS.objectMix( this, options );
};

ShadowSettings.kernelSizeList = kernelSizeList;

ShadowSettings.prototype = {

    setCastsShadowDrawTraversalMask: function ( mask ) {
        this.castsShadowDrawTraversalMask = mask;
    },
    getCastsShadowDrawTraversalMask: function () {
        return this.castsDrawShadowTraversalMask;
    },

    setCastsShadowBoundsTraversalMask: function ( mask ) {
        this.castsShadowBoundsTraversalMask = mask;
    },
    getCastsShadowBoundsTraversalMask: function () {
        return this.castsShadowBoundsTraversalMask;
    },

    setLight: function ( light ) {
        this.light = light;
    },
    getLight: function () {
        return this.light;
    },

    setTextureSize: function ( textureSize ) {
        this.textureSize = textureSize;
    },
    getTextureSize: function () {
        return this.textureSize;
    },
    setTextureType: function ( tt ) {
        this.textureType = tt;
    },
    getTextureType: function () {
        return this.textureType;
    },
    setTextureFormat: function ( tf ) {
        this.textureFormat = tf;
    },
    getTextureFormat: function () {
        return this.textureFormat;
    },
    setAlgorithm: function ( alg ) {
        this.algorithm = alg;
    },
    getAlgorithm: function () {
        return this.algorithm;
    },
    setShadowCastShaderGeneratorName: function ( n ) {
        this.shadowCastShaderGeneratorName = n;
    },
    getShadowCastShaderGeneratorName: function () {
        return this.shadowCastShaderGeneratorName;
    }

};

module.exports = ShadowSettings;
