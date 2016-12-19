'use strict';
var Notify = require( 'osg/notify' );
var vec3 = require( 'osg/glMatrix' ).vec3;
var vec2 = require( 'osg/glMatrix' ).vec2;


var OrbitManipulatorLeapMotionController = function ( manipulator ) {
    this._manipulator = manipulator;
    this.init();
};

var ModeConfig = {
    'rotate': {
        dtx: -1.2 * 1.2,
        dty: -0.9 * 1.2,
        dtz: -0.1,
        delay: 0.05,
        method: 'getRotateInterpolator'
    },
    'pan': {
        dtx: -1.2 * 1.2,
        dty: -0.9 * 1.2,
        delay: 0.05,
        method: 'getPanInterpolator'
    },
    'zoom': {
        dtx: 0.0,
        dty: -0.5,
        delay: 0.05,
        method: 'getZoomInterpolator'
    },
    'zoom-twohands': {
        dtx: -0.05,
        dty: 0.0,
        delay: 0.05,
        method: 'getZoomInterpolator'
    }
};

OrbitManipulatorLeapMotionController.prototype = {
    init: function () {
        this._virtualCursor = vec2.fromValues( 0.0, 0.0 );
        this._targetPosition = vec2.fromValues( 0.0, 0.0 );
        this._previousFrame = undefined;
        this._displacement = vec2.fromValues( 0.0, 0.0 );
        this._top = vec2.fromValues( 0.0, 1.0 );
        this._motion = vec2.fromValues( 0.0, 0.0 );
        this._delay = 0.05;
        this._threshold = 0.08;
        this._directionDotThreshold = 0.5;
        this._mode = 'rotate';
    },

    update: function ( frame ) {
        if ( !this._previousFrame ) {
            this._previousFrame = frame;
        }

        // no fingers ? return
        if ( frame.fingers.length === 0 ) {
            return;
        }

        var deltaFrame = this._previousFrame.translation( frame );

        this._previousFrame = frame;

        if ( frame.hands.length === 0 ) {
            return;
        }

        // filter noise
        if ( Math.abs( deltaFrame[ 0 ] ) < this._threshold &&
            Math.abs( deltaFrame[ 1 ] ) < this._threshold ) {
            return;
        }

        var mode = this._mode;
        var dist = 0;

        // scale is when there two hands with but with two hand with more than 1 fingers
        if ( frame.gestures.length > 0 ) {
            for ( var i = 0; i < frame.gestures.length; i++ ) {
                var gesture = frame.gestures[ i ];
                if ( gesture.type === 'circle' ) {
                    this._manipulator.computeHomePosition();
                    return;
                }
            }
        }

        if ( frame.hands.length === 1 ) {
            if ( frame.hands[ 0 ].fingers.length >= 3 ) {
                mode = 'zoom';
                dist = frame.hands[ 0 ].palmPosition[ 1 ] / 10.0;
                dist = Math.max( dist - 4, 0.01 );

            } else if ( frame.hands[ 0 ].fingers.length > 1 ) {
                mode = 'pan';
            } else {
                // by default onw hand moving means rotation
                mode = 'rotate';
            }
        } else if ( frame.hands.length === 2 ) {
            var d0 = Math.abs( vec3.dot( frame.hands[ 0 ].palmNormal, this._top ) ),
                d1 = Math.abs( vec3.dot( frame.hands[ 1 ].palmNormal, this._top ) );

            // two hands : zoom
            if ( d0 < this._directionDotThreshold && d1 < this._directionDotThreshold ) {
                mode = 'zoom-twohands';
            } else {
                // if hands flat do nothing
                mode = undefined;
                this._handsDistanceOld = undefined;
            }
        }
        var zoom = this._manipulator.getZoomInterpolator();

        if ( mode === undefined ) {
            return;
        }
        // change mode reset counter and skip this frame
        if ( mode !== this._mode ) {
            Notify.info( 'Switch to mode ' + mode );

            this._motion[ 0 ] = 0;
            this._motion[ 1 ] = 0;
            this._mode = mode;

            if ( mode === 'zoom' || mode === 'zoom-twohands' ) {
                if ( zoom.isReset() ) {
                    zoom.setStart( 1.0 );
                    zoom.set( 0.0 );
                }
            }
            return;
        }

        var dtx, dty, dtz;
        dtx = ModeConfig[ mode ].dtx;
        dty = ModeConfig[ mode ].dty;
        dtz = ModeConfig[ mode ].dtz;

        this._motion[ 0 ] += deltaFrame[ 0 ] * dtx;
        this._motion[ 1 ] += deltaFrame[ 1 ] * dty;

        var delay = ModeConfig[ mode ].delay;

        // we use the mode enum to get the good method
        var method = ModeConfig[ mode ].method;
        this._manipulator[ method ]().setDelay( delay );

        if ( mode === 'zoom' ) {
            Notify.log( dist );
            zoom.setTarget( dist );
        } else if ( mode === 'zoom-twohands' ) { // two hands zoom
            // distance between two hands
            var handsDistance = vec3.distance( frame.hands[ 1 ].palmPosition, frame.hands[ 0 ].palmPosition );

            if ( this._handsDistanceOld !== undefined ) {
                // compare distance with lastframe and zoom if they get nearer, unzoom if they separate
                var vel = dtx * ( handsDistance - this._handsDistanceOld );

                dist = zoom._target;
                dist[ 0 ] += vel;
            }
            this._handsDistanceOld = handsDistance;
        } else {
            if ( mode === 'rotate' ) {
                dist = zoom._target[ 0 ];
                dist += deltaFrame[ 2 ] * dtz;
                dist = Math.max( dist, 0.01 );
                zoom.setTarget( dist );
            }
            this._manipulator[ method ]().addTarget( this._motion[ 0 ], this._motion[ 1 ] );
        }

        this._motion[ 1 ] = this._motion[ 0 ] = 0;
    }
};
module.exports = OrbitManipulatorLeapMotionController;
