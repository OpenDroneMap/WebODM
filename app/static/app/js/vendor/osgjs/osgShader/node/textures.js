'use strict';
var MACROUTILS = require( 'osg/Utils' );
var utils = require( 'osgShader/utils' );
var Node = require( 'osgShader/node/Node' );

var NodeTextures = function () {
    Node.call( this );
};

NodeTextures.prototype = MACROUTILS.objectInherit( Node.prototype, {

    type: 'TextureAbstractNode',

    // functionName is here to simplify all texture base functions
    // it's possible later it will have to move into another class
    // if base class needs to be more generic. But right now it simplify
    // all simple class to fetch texture ( seed above )
    functionName: 'noTextureFunction',

    validInputs: [ 'sampler', 'uv' ],
    validOutputs: [ 'color' ],

    computeShader: function () {

        return utils.callFunction( this.functionName,
            this._outputs.color, [
                this._inputs.sampler,
                this._inputs.uv.getVariable() + '.xy'
            ] );
    },

    globalFunctionDeclaration: function () {
        return '#pragma include "textures.glsl"';
    }

} );



var TextureRGB = function () {
    NodeTextures.call( this );
};

TextureRGB.prototype = MACROUTILS.objectInherit( NodeTextures.prototype, {

    type: 'TextureRGB',
    functionName: 'textureRGB'

} );



var TextureRGBA = function () {
    TextureRGB.call( this );
};

TextureRGBA.prototype = MACROUTILS.objectInherit( TextureRGB.prototype, {

    type: 'TextureRGBA',
    functionName: 'textureRGBA'

} );


var TextureAlpha = function () {
    TextureRGB.call( this );
};

TextureAlpha.prototype = MACROUTILS.objectInherit( TextureRGB.prototype, {

    type: 'TextureAlpha',
    functionName: 'textureAlpha'

} );



var TextureIntensity = function () {
    TextureRGB.call( this );
};

TextureIntensity.prototype = MACROUTILS.objectInherit( TextureRGB.prototype, {

    type: 'TextureIntensity',
    functionName: 'textureIntensity'

} );

module.exports = {
    NodeTextures: NodeTextures,
    TextureRGB: TextureRGB,
    TextureRGBA: TextureRGBA,
    TextureAlpha: TextureAlpha,
    TextureIntensity: TextureIntensity
};
