'use strict';
var GamePad = require( 'osgViewer/eventProxy/GamePad' );
var HammerOsg = require( 'osgViewer/eventProxy/Hammer' );
var LeapMotion = require( 'osgViewer/eventProxy/LeapMotion' );
var StandardMouseKeyboard = require( 'osgViewer/eventProxy/StandardMouseKeyboard' );
var WebVR = require( 'osgViewer/eventProxy/WebVR' );
var DeviceOrientation = require( 'osgViewer/eventProxy/DeviceOrientation' );

module.exports = {
    GamePad: GamePad,
    Hammer: HammerOsg,
    LeapMotion: LeapMotion,
    StandardMouseKeyboard: StandardMouseKeyboard,
    WebVR: WebVR,
    DeviceOrientation: DeviceOrientation
};
