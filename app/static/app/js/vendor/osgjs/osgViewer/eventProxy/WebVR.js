'use strict';
var Notify = require( 'osg/notify' );
var quat = require( 'osg/glMatrix' ).quat;
var vec3 = require( 'osg/glMatrix' ).vec3;
var mat4 = require( 'osg/glMatrix' ).mat4;
require( 'osgUtil/webvr-1-1' ); // polyfill


var WebVR = function ( viewer ) {
    this._viewer = viewer;

    this._type = 'WebVR';
    this._enable = false;
    this._hmd = undefined;
    this._sensor = undefined;

    this._frameData = undefined;
    this._quat = quat.create();
    this._pos = vec3.create();

    this._worldScale = 1.0;
};

WebVR.prototype = {

    setWorldScale: function ( val ) {
        this._worldScale = val;
    },

    setEnable: function ( bool ) {
        this._enable = bool;
    },

    getEnable: function () {
        return this._enable;
    },

    init: function () {

        if ( !navigator.getVRDisplays )
            return;

        var self = this;
        navigator.getVRDisplays().then( function ( displays ) {
            if ( displays.length > 0 ) {
                self._hmd = displays[ 0 ];
                self._frameData = new window.VRFrameData();
                Notify.log( 'Found a VR display' );
                // currently it's the event proxy webvr that has the responsability of detecting vr devices
                self._viewer.setVRDisplay( self._hmd );
            }
        } );
    },

    getManipulatorController: function () {
        return this._viewer.getManipulator().getControllerList()[ this._type ];
    },

    isValid: function () {
        if ( !this._enable )
            return false;

        var manipulator = this._viewer.getManipulator();
        if ( !manipulator )
            return false;

        if ( !manipulator.getControllerList()[ this._type ] )
            return false;

        if ( !this._hmd )
            return false;

        return true;
    },

    update: ( function () {
        var tempQuat = quat.create();
        var tempPos = vec3.create();

        return function () {

            if ( !this.isValid() )
                return;

            var manipulatorAdapter = this.getManipulatorController();

            // update the manipulator with the rotation of the device
            if ( !manipulatorAdapter.update )
                return;

            if ( !this._hmd.capabilities.hasOrientation && !this._hmd.capabilities.hasPosition )
                return;

            this._hmd.getFrameData( this._frameData );

            var pose = this._frameData.pose;

            if ( !pose )
                return;

            // WebVR up vector is Y
            // OSGJS up vector is Z

            var sitToStand = this._hmd.stageParameters && this._hmd.stageParameters.sittingToStandingTransform;

            var q = pose.orientation;
            if ( q ) {
                if ( sitToStand ) {
                    q = mat4.getRotation( tempQuat, sitToStand );
                    quat.mul( q, q, pose.orientation );
                }

                this._quat[ 0 ] = q[ 0 ];
                this._quat[ 1 ] = -q[ 2 ];
                this._quat[ 2 ] = q[ 1 ];
                this._quat[ 3 ] = q[ 3 ];
            }

            var pos = pose.position;
            if ( pos ) {
                if ( sitToStand ) {
                    pos = vec3.transformMat4( tempPos, pos, sitToStand );
                }
                this._pos[ 0 ] = pos[ 0 ] * this._worldScale;
                this._pos[ 1 ] = -pos[ 2 ] * this._worldScale;
                this._pos[ 2 ] = pos[ 1 ] * this._worldScale;
            }

            manipulatorAdapter.update( this._quat, this._pos );
        };
    } )(),


    getHmd: function () {
        return this._hmd;
    }
};
module.exports = WebVR;
