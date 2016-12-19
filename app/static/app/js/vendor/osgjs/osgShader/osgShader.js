'use strict';
var Compiler = require( 'osgShader/Compiler' );
var ShaderGenerator = require( 'osgShader/ShaderGenerator' );
var ShaderGeneratorProxy = require( 'osgShader/ShaderGeneratorProxy' );
var ShaderProcessor = require( 'osgShader/ShaderProcessor' );
var nodeFactory = require( 'osgShader/nodeFactory' );
var node = require( 'osgShader/node' );
var utils = require( 'osgShader/utils' );


var lib = {};

lib.Compiler = Compiler;
lib.ShaderGenerator = ShaderGenerator;
lib.ShaderGeneratorProxy = ShaderGeneratorProxy;
lib.ShaderProcessor = ShaderProcessor;
lib.nodeFactory = nodeFactory;
lib.node = node;

lib.utils = utils;


// debug utility: set it to one to have verbose in shaders
lib.debugShaderNode = false;
/*develblock:start*/
lib.debugShaderNode = true;
/*develblock:end*/

module.exports = lib;
