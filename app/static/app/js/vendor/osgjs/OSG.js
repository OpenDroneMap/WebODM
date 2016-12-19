'use strict';
var osgNameSpace = require( 'osgNameSpace' );
var osg = require( 'osg/osg' );
var osgAnimation = require( 'osgAnimation/osgAnimation' );
var osgDB = require( 'osgDB/osgDB' );
var osgGA = require( 'osgGA/osgGA' );
var osgUtil = require( 'osgUtil/osgUtil' );
var osgViewer = require( 'osgViewer/osgViewer' );
var osgShader = require( 'osgShader/osgShader' );
var osgShadow = require( 'osgShadow/osgShadow' );
var osgText = require( 'osgText/osgText' );
var osgWrappers = require( 'osgWrappers/osgWrappers' );
var osgPlugins = require( 'osgPlugins/osgPlugins' );


var openSceneGraph = osgNameSpace;

openSceneGraph.osg = osg;
openSceneGraph.osgAnimation = osgAnimation;
openSceneGraph.osgDB = osgDB;
openSceneGraph.osgGA = osgGA;
openSceneGraph.osgUtil = osgUtil;
openSceneGraph.osgViewer = osgViewer;
openSceneGraph.osgShader = osgShader;
openSceneGraph.osgShadow = osgShadow;
openSceneGraph.osgText = osgText;
openSceneGraph.osgWrappers = osgWrappers;
openSceneGraph.osgPlugins = osgPlugins;

var namespaces = [ 'osg', 'osgAnimation', 'osgDB', 'osgGA', 'osgUtil', 'osgViewer', 'osgShader', 'osgShadow', 'osgText', 'osgWrappers', 'osgPlugins' ];


// for backward compatibility
openSceneGraph.globalify = function () {
    namespaces.forEach( function ( namespace ) {
        window[ namespace ] = openSceneGraph[ namespace ];
    } );
};

module.exports = openSceneGraph;
