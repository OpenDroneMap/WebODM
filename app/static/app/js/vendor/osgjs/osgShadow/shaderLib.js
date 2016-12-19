'use strict';
var shadowsCastFrag = require( 'osgShadow/shaders/shadowsCastFrag.glsl' );
var shadowsReceive = require( 'osgShadow/shaders/shadowsReceive.glsl' );
var shadowsReceiveMain = require( 'osgShadow/shaders/shadowsReceiveMain.glsl' );
var shadowLinearSoft = require( 'osgShadow/shaders/shadowLinearSoft.glsl' );
var pcf = require( 'osgShadow/shaders/pcf.glsl' );
var bandPCF = require( 'osgShadow/shaders/bandPCF.glsl' );
var tapPCF = require( 'osgShadow/shaders/tapPCF.glsl' );
var hash = require( 'osgShadow/shaders/hash.glsl' );
var arrayPoisson = require( 'osgShadow/shaders/arrayPoisson.glsl' );
var poissonPCF = require( 'osgShadow/shaders/poissonPCF.glsl' );
var esm = require( 'osgShadow/shaders/esm.glsl' );
var vsm = require( 'osgShadow/shaders/vsm.glsl' );
var evsm = require( 'osgShadow/shaders/evsm.glsl' );

module.exports = {
    'shadowsCastFrag.glsl': shadowsCastFrag,
    'shadowsReceive.glsl': shadowsReceive,
    'shadowsReceiveMain.glsl': shadowsReceiveMain,
    'shadowLinearSoft.glsl': shadowLinearSoft,
    'pcf.glsl': pcf,
    'bandPCF.glsl': bandPCF,
    'tapPCF.glsl': tapPCF,
    'hash.glsl': hash,
    'arrayPoisson.glsl': arrayPoisson,
    'poissonPCF.glsl': poissonPCF,
    'esm.glsl': esm,
    'vsm.glsl': vsm,
    'evsm.glsl': evsm
};
