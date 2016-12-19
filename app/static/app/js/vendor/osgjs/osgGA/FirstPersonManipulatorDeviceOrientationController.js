'use strict';
var quat = require( 'osg/glMatrix' ).quat;
var vec3 = require( 'osg/glMatrix' ).vec3;

var degtorad = Math.PI / 180.0; // Degree-to-Radian conversion

var makeRotateFromEuler = function ( q, x, y, z, order ) {

    // http://www.mathworks.com/matlabcentral/fileexchange/
    // 20696-function-to-convert-between-dcm-euler-angles-quaternions-and-euler-vectors/
    // content/SpinCalc.m

    var c1 = Math.cos( x / 2 );
    var c2 = Math.cos( y / 2 );
    var c3 = Math.cos( z / 2 );
    var s1 = Math.sin( x / 2 );
    var s2 = Math.sin( y / 2 );
    var s3 = Math.sin( z / 2 );

    if ( order === 'XYZ' ) {

        q[ 0 ] = s1 * c2 * c3 + c1 * s2 * s3;
        q[ 1 ] = c1 * s2 * c3 - s1 * c2 * s3;
        q[ 2 ] = c1 * c2 * s3 + s1 * s2 * c3;
        q[ 3 ] = c1 * c2 * c3 - s1 * s2 * s3;

    } else if ( order === 'YXZ' ) {

        q[ 0 ] = s1 * c2 * c3 + c1 * s2 * s3;
        q[ 1 ] = c1 * s2 * c3 - s1 * c2 * s3;
        q[ 2 ] = c1 * c2 * s3 - s1 * s2 * c3;
        q[ 3 ] = c1 * c2 * c3 + s1 * s2 * s3;

    } else if ( order === 'ZXY' ) {

        q[ 0 ] = s1 * c2 * c3 - c1 * s2 * s3;
        q[ 1 ] = c1 * s2 * c3 + s1 * c2 * s3;
        q[ 2 ] = c1 * c2 * s3 + s1 * s2 * c3;
        q[ 3 ] = c1 * c2 * c3 - s1 * s2 * s3;

    } else if ( order === 'ZYX' ) {

        q[ 0 ] = s1 * c2 * c3 - c1 * s2 * s3;
        q[ 1 ] = c1 * s2 * c3 + s1 * c2 * s3;
        q[ 2 ] = c1 * c2 * s3 - s1 * s2 * c3;
        q[ 3 ] = c1 * c2 * c3 + s1 * s2 * s3;

    } else if ( order === 'YZX' ) {

        q[ 0 ] = s1 * c2 * c3 + c1 * s2 * s3;
        q[ 1 ] = c1 * s2 * c3 + s1 * c2 * s3;
        q[ 2 ] = c1 * c2 * s3 - s1 * s2 * c3;
        q[ 3 ] = c1 * c2 * c3 - s1 * s2 * s3;

    } else if ( order === 'XZY' ) {

        q[ 0 ] = s1 * c2 * c3 - c1 * s2 * s3;
        q[ 1 ] = c1 * s2 * c3 - s1 * c2 * s3;
        q[ 2 ] = c1 * c2 * s3 + s1 * s2 * c3;
        q[ 3 ] = c1 * c2 * c3 + s1 * s2 * s3;

    }
    return q;
};


var FirstPersonManipulatorDeviceOrientationController = function ( manipulator ) {
    this._manipulator = manipulator;
    this.init();
};

FirstPersonManipulatorDeviceOrientationController.computeQuaternion = ( function () {

    var screenTransform = quat.create();
    var worldTransform = quat.fromValues( -Math.sqrt( 0.5 ), 0.0, 0.0, Math.sqrt( 0.5 ) ); // - PI/2 around the x-axis

    // but on ios alpha is relative to the first question:
    //
    // http://www.html5rocks.com/en/tutorials/device/orientation/
    // For most browsers, alpha returns the compass heading, so when the device is pointed
    // north, alpha is zero. With Mobile Safari, alpha is based on the direction the
    // device was pointing when device orientation was first requested. The compass
    // heading is available in the webkitCompassHeading parameter.

    return function ( q, deviceOrientation, screenOrientation ) {

        var alpha = deviceOrientation.alpha * degtorad;
        var beta = deviceOrientation.beta * degtorad;
        var gamma = deviceOrientation.gamma * degtorad;

        // If the user goes in landscape mode, he rotates his device with a certain angle
        // around the Z axis counterclockwise and the DeviceOrientation contains this
        // rotation To compensate this, we apply a rotation of the same angle in the
        // opposite way

        var screenAngle = screenOrientation * degtorad;

        // alpha is heading -> X
        // beta             -> Z Up
        // Gamma            -> Y view direction
        makeRotateFromEuler( q, beta, alpha, -gamma, 'YXZ' );
        // equivalent to
        // var rotateX = mat4.fromRotation( mat4.create(), beta,[ 1,0,0 ] );
        // var rotateY = mat4.fromRotation( mat4.create(), alpha,[ 0,1,0 ] );
        // var rotateZ = mat4.fromRotation( mat4.create(), -gamma,[ 0,0,1 ] );
        // var result = mat4.create();
        // mat4.mul( result, rotateY, rotateX );
        // mat4.mul( result, result, rotateZ );
        // mat4.getRotation( q, result );

        var minusHalfAngle = -screenAngle / 2.0;
        screenTransform[ 1 ] = Math.sin( minusHalfAngle );
        screenTransform[ 3 ] = Math.cos( minusHalfAngle );

        quat.mul( q, q, screenTransform );
        quat.mul( q, q, worldTransform );

        var yTemp = q[ 1 ];
        q[ 1 ] = -q[ 2 ];
        q[ 2 ] = yTemp;

        return q;
    };

} )();

FirstPersonManipulatorDeviceOrientationController.prototype = {

    init: function () {
        this._stepFactor = 1.0; // meaning radius*stepFactor to move
        this._quat = quat.create();
        this._pos = vec3.create();
    },

    update: function ( deviceOrientation, screenOrientation ) {

        FirstPersonManipulatorDeviceOrientationController.computeQuaternion( this._quat, deviceOrientation, screenOrientation );
        this._manipulator.setPoseVR( this._quat, this._pos );
    }

};

module.exports = FirstPersonManipulatorDeviceOrientationController;
