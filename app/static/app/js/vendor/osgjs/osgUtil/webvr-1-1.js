// Copyright 2016 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

// Installs a shim that emulates functionality from the WebVR '1.1' spec if the
// browser only exposes WebVR '1.0'.
'use strict';

var mat4 = require( 'osg/glMatrix' ).mat4;

if ( 'getVRDisplays' in navigator ) {

    // A lot of Chrome builds to date don't have depthNear and depthFar, even
    // though they're in the WebVR 1.0 spec. They're more necessary in 1.1.
    if ( !( 'depthNear' in window.VRDisplay.prototype ) ) {
        window.VRDisplay.prototype.depthNear = 0.01;
    }

    if ( !( 'depthFar' in window.VRDisplay.prototype ) ) {
        window.VRDisplay.prototype.depthFar = 10000.0;
    }

    // If the browser has a WebVR implementation but does not include the 1.1
    // functionality patch it with JS.
    if ( !( 'VRFrameData' in window ) ) {
        window.VRFrameData = function () {
            this.leftProjectionMatrix = new Float32Array( 16 );
            this.leftViewMatrix = new Float32Array( 16 );
            this.rightProjectionMatrix = new Float32Array( 16 );
            this.rightViewMatrix = new Float32Array( 16 );
            this.pose = null;
        };

        window.VRDisplay.prototype.getFrameData = ( function () {

            var defaultOrientation = new Float32Array( [ 0, 0, 0, 1 ] );
            var defaultPosition = new Float32Array( [ 0, 0, 0 ] );

            function updateEyeMatrices( projection, view, pose, parameters, vrDisplay ) {
                mat4.perspectiveFromFieldOfView( projection, parameters.fieldOfView, vrDisplay.depthNear, vrDisplay.depthFar );

                var orientation = pose.orientation;
                var position = pose.position;
                if ( !orientation ) {
                    orientation = defaultOrientation;
                }
                if ( !position ) {
                    position = defaultPosition;
                }

                mat4.fromRotationTranslation( view, orientation, position );
                mat4.translate( view, view, parameters.offset );
                mat4.invert( view, view );
            }

            return function ( frameData ) {
                var pose = this.getPose();
                if ( !pose )
                    return false;

                frameData.pose = pose;
                frameData.timestamp = pose.timestamp;

                updateEyeMatrices(
                    frameData.leftProjectionMatrix, frameData.leftViewMatrix,
                    pose, this.getEyeParameters( 'left' ), this );
                updateEyeMatrices(
                    frameData.rightProjectionMatrix, frameData.rightViewMatrix,
                    pose, this.getEyeParameters( 'right' ), this );

                return true;
            };
        } )();
    }
}
