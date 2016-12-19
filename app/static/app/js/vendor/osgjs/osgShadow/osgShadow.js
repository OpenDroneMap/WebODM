'use strict';
var ShadowCastAttribute = require( 'osgShadow/ShadowCastAttribute' );
var ShadowCastCompiler = require( 'osgShadow/ShadowCastCompiler' );
var ShadowCastShaderGenerator = require( 'osgShadow/ShadowCastShaderGenerator' );
var ShadowCasterVisitor = require( 'osgShadow/ShadowCasterVisitor' );
var ShadowFrustumIntersection = require( 'osgShadow/ShadowFrustumIntersection' );
var ShadowMap = require( 'osgShadow/ShadowMap' );
var ShadowReceiveAttribute = require( 'osgShadow/ShadowReceiveAttribute' );
var ShadowSettings = require( 'osgShadow/ShadowSettings' );
var ShadowTechnique = require( 'osgShadow/ShadowTechnique' );
var ShadowTexture = require( 'osgShadow/ShadowTexture' );
var ShadowedScene = require( 'osgShadow/ShadowedScene' );


var osgShadow = {};

osgShadow.ShadowCastAttribute = ShadowCastAttribute;
osgShadow.ShadowCastCompiler = ShadowCastCompiler;
osgShadow.ShadowReceiveAttribute = ShadowReceiveAttribute;
osgShadow.ShadowCasterVisitor = ShadowCasterVisitor;
osgShadow.ShadowFrustumIntersection = ShadowFrustumIntersection;
osgShadow.ShadowMap = ShadowMap;
osgShadow.ShadowedScene = ShadowedScene;
osgShadow.ShadowSettings = ShadowSettings;
osgShadow.ShadowCastShaderGenerator = ShadowCastShaderGenerator;
osgShadow.ShadowTechnique = ShadowTechnique;
osgShadow.ShadowTexture = ShadowTexture;


module.exports = osgShadow;
