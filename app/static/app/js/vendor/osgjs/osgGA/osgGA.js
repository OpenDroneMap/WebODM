'use strict';
var Hammer = require( 'hammer' );
var CADManipulator = require( 'osgGA/CADManipulator' );
var CADManipulatorStandardMouseKeyboardController = require( 'osgGA/CADManipulatorStandardMouseKeyboardController' );
var CADManipulatorHammerController = require( 'osgGA/CADManipulatorHammerController' );
var FirstPersonManipulator = require( 'osgGA/FirstPersonManipulator' );
var FirstPersonManipulatorDeviceOrientationController = require( 'osgGA/FirstPersonManipulatorDeviceOrientationController' );
var FirstPersonManipulatorHammerController = require( 'osgGA/FirstPersonManipulatorHammerController' );
var FirstPersonManipulatorStandardMouseKeyboardController = require( 'osgGA/FirstPersonManipulatorStandardMouseKeyboardController' );
var FirstPersonManipulatorWebVRController = require( 'osgGA/FirstPersonManipulatorWebVRController' );
var Manipulator = require( 'osgGA/Manipulator' );
var OrbitManipulator = require( 'osgGA/OrbitManipulator' );
var OrbitManipulatorDeviceOrientationController = require( 'osgGA/OrbitManipulatorDeviceOrientationController' );
var OrbitManipulatorGamePadController = require( 'osgGA/OrbitManipulatorGamePadController' );
var OrbitManipulatorHammerController = require( 'osgGA/OrbitManipulatorHammerController' );
var OrbitManipulatorLeapMotionController = require( 'osgGA/OrbitManipulatorLeapMotionController' );
var OrbitManipulatorStandardMouseKeyboardController = require( 'osgGA/OrbitManipulatorStandardMouseKeyboardController' );
var OrbitManipulatorWebVRController = require( 'osgGA/OrbitManipulatorWebVRController' );
var SwitchManipulator = require( 'osgGA/SwitchManipulator' );
var OrbitManipulatorEnums = require( 'osgGA/orbitManipulatorEnums' );


var osgGA = {};

Hammer.NO_MOUSEEVENTS = true; // disable hammer js mouse events

osgGA.CADManipulator = CADManipulator;
osgGA.getCADManipulatorStandardMouseKeyboardController = function () {
    return CADManipulatorStandardMouseKeyboardController;
};
osgGA.getCADManipulatorHammerController = function () {
    return CADManipulatorHammerController;
};
osgGA.FirstPersonManipulator = FirstPersonManipulator;
osgGA.getFirstPersonDeviceOrientationController = function () {
    return FirstPersonManipulatorDeviceOrientationController;
};
osgGA.getFirstPersonManipulatorHammerController = function () {
    return FirstPersonManipulatorHammerController;
};
osgGA.getFirstPersonStandardMouseKeyboardControllerClass = function () {
    return FirstPersonManipulatorStandardMouseKeyboardController;
};
osgGA.getFirstPersonWebVRControllerClass = function () {
    return FirstPersonManipulatorWebVRController;
};
osgGA.Manipulator = Manipulator;
osgGA.OrbitManipulator = OrbitManipulator;
osgGA.getOrbitManipulatorDeviceOrientationController = function () {
    return OrbitManipulatorDeviceOrientationController;
};
osgGA.getOrbitManipulatorGamePadController = function () {
    return OrbitManipulatorGamePadController;
};
osgGA.getOrbitManipulatorHammerController = function () {
    return OrbitManipulatorHammerController;
};
osgGA.getOrbitManipulatorLeapMotionController = function () {
    return OrbitManipulatorLeapMotionController;
};
osgGA.getOrbitManipulatorStandardMouseKeyboardController = function () {
    return OrbitManipulatorStandardMouseKeyboardController;
};
osgGA.getOrbitManipulatorWebVRController = function () {
    return OrbitManipulatorWebVRController;
};

osgGA.SwitchManipulator = SwitchManipulator;

osgGA.OrbitManipulator.Rotate = OrbitManipulatorEnums.ROTATE;
osgGA.OrbitManipulator.Pan = OrbitManipulatorEnums.PAN;
osgGA.OrbitManipulator.Zoom = OrbitManipulatorEnums.ZOOM;

module.exports = osgGA;
