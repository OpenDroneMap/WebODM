'use strict';
var Renderer = require( 'osgViewer/Renderer' );
var View = require( 'osgViewer/View' );
var Viewer = require( 'osgViewer/Viewer' );
var EventProxy = require( 'osgViewer/eventProxy/eventProxy' );
var Scene = require( 'osgViewer/Scene' );


var osgViewer = {};

osgViewer.Renderer = Renderer;
osgViewer.View = View;
osgViewer.Viewer = Viewer;
osgViewer.EventProxy = EventProxy;
osgViewer.Scene = Scene;

module.exports = osgViewer;
