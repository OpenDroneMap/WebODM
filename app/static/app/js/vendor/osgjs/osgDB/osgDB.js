'use strict';
var MACROUTILS = require( 'osg/Utils' );
var Input = require( 'osgDB/Input' );
var ReaderParser = require( 'osgDB/readerParser' );
var DatabasePager = require( 'osgDB/DatabasePager' );
var osgWrappers = require( 'osgWrappers/serializers/osg' );
var osgAnimationWrappers = require( 'osgWrappers/serializers/osgAnimation' );
var osgTextWrappers = require( 'osgWrappers/serializers/osgText' );
var Registry = require( 'osgDB/Registry' );


var osgDB = {};
osgDB.Input = Input;
MACROUTILS.objectMix( osgDB, ReaderParser );
osgDB.DatabasePager = DatabasePager;
osgDB.ObjectWrapper.serializers.osg = osgWrappers;
osgDB.ObjectWrapper.serializers.osgAnimation = osgAnimationWrappers;
osgDB.ObjectWrapper.serializers.osgText = osgTextWrappers;
osgDB.Registry = Registry;
osgDB.requestFile = require( 'osgDB/requestFile' );

var zlib = require( 'osgDB/zlib' );
MACROUTILS.objectMix( osgDB, zlib );

module.exports = osgDB;
