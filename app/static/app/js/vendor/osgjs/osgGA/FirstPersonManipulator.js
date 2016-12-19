'use strict';
var MACROUTILS = require( 'osg/Utils' );
var Manipulator = require( 'osgGA/Manipulator' );
var OrbitManipulator = require( 'osgGA/OrbitManipulator' );
var mat4 = require( 'osg/glMatrix' ).mat4;
var vec2 = require( 'osg/glMatrix' ).vec2;
var vec3 = require( 'osg/glMatrix' ).vec3;
var quat = require( 'osg/glMatrix' ).quat;
var FirstPersonManipulatorDeviceOrientationController = require( 'osgGA/FirstPersonManipulatorDeviceOrientationController' );
var FirstPersonManipulatorHammerController = require( 'osgGA/FirstPersonManipulatorHammerController' );
var FirstPersonManipulatorWebVRController = require( 'osgGA/FirstPersonManipulatorWebVRController' );
var FirstPersonManipulatorStandardMouseKeyboardController = require( 'osgGA/FirstPersonManipulatorStandardMouseKeyboardController' );


/**
 * Authors:
 *  Matt Fontaine <tehqin@gmail.com>
 *  Cedric Pinson <trigrou@gmail.com>
 */

/**
 *  FirstPersonManipulator
 *  @class
 */
var FirstPersonManipulator = function ( boundStrategy ) {
    Manipulator.call( this, boundStrategy );
    this.init();
};

FirstPersonManipulator.AvailableControllerList = [ 'StandardMouseKeyboard', 'WebVR', 'DeviceOrientation', 'Hammer' ];
FirstPersonManipulator.ControllerList = [ 'StandardMouseKeyboard', 'WebVR', 'DeviceOrientation', 'Hammer' ];

FirstPersonManipulator.prototype = MACROUTILS.objectInherit( Manipulator.prototype, {

    computeHomePosition: function ( boundStrategy ) {
        var bs = this.getHomeBound( boundStrategy );
        if ( !bs || !bs.valid() ) return;

        this._distance = this.getHomeDistance( bs );
        var cen = bs.center();
        vec3.scale( this._eye, this._direction, -this._distance );
        vec3.add( this._eye, cen, this._eye );
        this.setTarget( cen );
    },

    init: function () {
        this._direction = vec3.fromValues( 0.0, 1.0, 0.0 );
        this._eye = vec3.fromValues( 0.0, 25.0, 10.0 );
        this._up = vec3.fromValues( 0.0, 0.0, 1.0 );
        this._distance = 1.0;
        this._forward = new OrbitManipulator.Interpolator( 1 );
        this._side = new OrbitManipulator.Interpolator( 1 );
        this._lookPosition = new OrbitManipulator.Interpolator( 2 );

        // direct pan interpolator (not based on auto-move)
        this._pan = new OrbitManipulator.Interpolator( 2 );
        this._zoom = new OrbitManipulator.Interpolator( 1 );

        this._stepFactor = 1.0; // meaning radius*stepFactor to move
        this._angleVertical = 0.0;
        this._angleHorizontal = 0.0;

        // tmp value use for computation
        this._tmpGetTargetDir = vec3.create();

        // vr controls
        this._vrEnable = false;
        this._vrRot = quat.create(); // absolute orientation
        this._vrPos = vec3.create(); // absolute position
        this._vrTrans = vec3.create(); // delta translation since last update

        var self = this;

        this._controllerList = {};
        FirstPersonManipulator.ControllerList.forEach( function ( value ) {
            if ( FirstPersonManipulator[ value ] !== undefined ) {
                self._controllerList[ value ] = new FirstPersonManipulator[ value ]( self );
            }
        } );

    },

    setDelay: function ( dt ) {
        this._forward.setDelay( dt );
        this._side.setDelay( dt );
        this._lookPosition.setDelay( dt );
        this._pan.setDelay( dt );
        this._zoom.setDelay( dt );
    },

    getEyePosition: function ( eye ) {
        eye[ 0 ] = this._eye[ 0 ];
        eye[ 1 ] = this._eye[ 1 ];
        eye[ 2 ] = this._eye[ 2 ];
        return eye;
    },

    setEyePosition: function ( eye ) {
        this._eye[ 0 ] = eye[ 0 ];
        this._eye[ 1 ] = eye[ 1 ];
        this._eye[ 2 ] = eye[ 2 ];
        return this;
    },

    getTarget: function ( pos ) {
        var dir = vec3.scale( this._tmpGetTargetDir, this._direction, this._distance );
        vec3.add( pos, this._eye, dir );
        return pos;
    },

    setTarget: function ( pos ) {
        var dir = this._tmpGetTargetDir;
        vec3.sub( dir, pos, this._eye );
        dir[ 2 ] = 0.0;
        vec3.normalize( dir, dir );
        this._angleHorizontal = Math.acos( dir[ 1 ] );
        if ( dir[ 0 ] < 0.0 ) {
            this._angleHorizontal = -this._angleHorizontal;
        }
        vec3.sub( dir, pos, this._eye );
        vec3.normalize( dir, dir );

        this._angleVertical = -Math.asin( dir[ 2 ] );
        vec3.copy( this._direction, dir );
    },

    getLookPositionInterpolator: function () {
        return this._lookPosition;
    },
    getSideInterpolator: function () {
        return this._side;
    },
    getForwardInterpolator: function () {
        return this._forward;
    },
    getPanInterpolator: function () {
        return this._pan;
    },
    getZoomInterpolator: function () {
        return this._zoom;
    },
    getRotateInterpolator: function () {
        // for compatibility with orbit hammer controllers
        return this._lookPosition;
    },

    computeRotation: ( function () {
        var first = mat4.create();
        var rotMat = mat4.create();

        var right = vec3.fromValues( 1.0, 0.0, 0.0 );
        var upy = vec3.fromValues( 0.0, 1.0, 0.0 );
        var upz = vec3.fromValues( 0.0, 0.0, 1.0 );
        var LIMIT = Math.PI * 0.5;
        return function ( dx, dy ) {
            this._angleVertical += dy * 0.01;
            this._angleHorizontal -= dx * 0.01;
            if ( this._angleVertical > LIMIT ) this._angleVertical = LIMIT;
            else if ( this._angleVertical < -LIMIT ) this._angleVertical = -LIMIT;

            if ( this._vrEnable ) {
                vec3.transformQuat( this._direction, upy, this._vrRot );
                vec3.normalize( this._direction, this._direction );
                vec3.transformQuat( this._up, upz, this._vrRot );

            } else {
                mat4.fromRotation( first, -this._angleVertical, right );
                mat4.fromRotation( rotMat, -this._angleHorizontal, upz );
                mat4.mul( rotMat, rotMat, first );

                vec3.transformMat4( this._direction, upy, rotMat );
                vec3.normalize( this._direction, this._direction );
                vec3.transformMat4( this._up, upz, rotMat );
            }
        };
    } )(),
    reset: function () {
        this.init();
    },
    setDistance: function ( d ) {
        this._distance = d;
    },
    getDistance: function () {
        return this._distance;
    },
    setStepFactor: function ( t ) {
        this._stepFactor = t;
    },

    computePosition: ( function () {
        var vec = vec2.create();

        return function ( dt ) {
            this._forward.update( dt );
            this._side.update( dt );

            // TDOO why check with epsilon ?
            var factor = this._distance < 1e-3 ? 1e-3 : this._distance;

            // see comment in orbitManipulator for fov modulation speed
            var proj = this._camera.getProjectionMatrix();
            var vFov = proj[ 15 ] === 1 ? 1.0 : 2.0 / proj[ 5 ];

            // time based displacement vector
            vec[ 0 ] = this._forward.getCurrent()[ 0 ];
            vec[ 1 ] = this._side.getCurrent()[ 0 ];
            var len2 = vec2.sqrLen( vec );
            if ( len2 > 1.0 ) vec2.scale( vec, vec, 1.0 / Math.sqrt( len2 ) );

            // direct displacement vectors
            var pan = this._pan.update( dt );
            var zoom = this._zoom.update( dt );

            var timeFactor = this._stepFactor * factor * vFov * dt;
            var directFactor = this._stepFactor * factor * vFov * 0.005;

            this.moveForward( vec[ 0 ] * timeFactor - zoom[ 0 ] * directFactor * 20.0 );
            this.strafe( vec[ 1 ] * timeFactor - pan[ 0 ] * directFactor );
            this.strafeVertical( -pan[ 1 ] * directFactor );

            if ( this._vrEnable ) {
                vec3.add( this._eye, this._eye, this._vrTrans );
                // in case setPoseVR skips some frame (possible if tracking is lost temporarily)
                vec3.init( this._vrTrans );
            }
        };
    } )(),


    update: ( function () {
        var tmpTarget = vec3.create();

        return function ( nv ) {

            var dt = nv.getFrameStamp().getDeltaTime();

            var delta = this._lookPosition.update( dt );
            this.computeRotation( -delta[ 0 ] * 0.5, -delta[ 1 ] * 0.5 );
            this.computePosition( dt );

            vec3.add( tmpTarget, this._eye, this._direction );
            mat4.lookAt( this._inverseMatrix, this._eye, tmpTarget, this._up );

            this._vrEnable = false; // setPoseVR is called on each frame
        };
    } )(),

    setPoseVR: function ( q, pos ) {
        this._vrEnable = true;
        quat.copy( this._vrRot, q );
        vec3.sub( this._vrTrans, pos, this._vrPos );
        vec3.copy( this._vrPos, pos );
    },

    moveForward: ( function () {
        var tmp = vec3.create();
        return function ( distance ) {
            vec3.normalize( tmp, this._direction );
            vec3.scale( tmp, tmp, distance );
            vec3.add( this._eye, this._eye, tmp );
        };
    } )(),

    strafe: ( function () {
        var tmp = vec3.create();
        return function ( distance ) {
            vec3.cross( tmp, this._direction, this._up );
            vec3.normalize( tmp, tmp );
            vec3.scale( tmp, tmp, distance );
            vec3.add( this._eye, this._eye, tmp );
        };
    } )(),

    strafeVertical: ( function () {
        var tmp = vec3.create();
        return function ( distance ) {
            vec3.normalize( tmp, this._up );
            vec3.scale( tmp, tmp, distance );
            vec3.add( this._eye, this._eye, tmp );
        };
    } )()

} );

FirstPersonManipulator.DeviceOrientation = FirstPersonManipulatorDeviceOrientationController;
FirstPersonManipulator.Hammer = FirstPersonManipulatorHammerController;
FirstPersonManipulator.WebVR = FirstPersonManipulatorWebVRController;
FirstPersonManipulator.StandardMouseKeyboard = FirstPersonManipulatorStandardMouseKeyboardController;

module.exports = FirstPersonManipulator;
