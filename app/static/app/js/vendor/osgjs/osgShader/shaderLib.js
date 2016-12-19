'use strict';
var functions = require( 'osgShader/node/functions.glsl' );
var lights = require( 'osgShader/node/lights.glsl' );
var skinning = require( 'osgShader/node/skinning.glsl' );
var textures = require( 'osgShader/node/textures.glsl' );
var colorEncode = require( 'osgShader/node/colorEncode.glsl' );
var noise = require( 'osgShader/node/noise.glsl' );
var billboard = require( 'osgShader/node/billboard.glsl' );
module.exports = {
    'functions.glsl': functions,
    'lights.glsl': lights,
    'skinning.glsl': skinning,
    'textures.glsl': textures,
    'colorEncode.glsl': colorEncode,
    'noise.glsl': noise,
    'billboard.glsl': billboard
};
