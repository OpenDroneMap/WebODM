'use strict';
var osg = require( 'osgWrappers/serializers/osg' );
var osgAnimation = require( 'osgWrappers/serializers/osgAnimation' );
var osgText = require( 'osgWrappers/serializers/osgText' );

var osgWrappers = {};

osgWrappers.osg = osg;
osgWrappers.osgAnimation = osgAnimation;
osgWrappers.osgText = osgText;

module.exports = osgWrappers;
