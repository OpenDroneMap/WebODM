'use strict';
var vec2 = require( 'osg/glMatrix' ).vec2;


var OrbitManipulatorGamePadController = function ( manipulator ) {
    this._manipulator = manipulator;
    this.init();
};

OrbitManipulatorGamePadController.prototype = {
    init: function () {
        this._delay = 0.15;
        this._threshold = 0.08;
        this._mode = 0;
        this._padFactor = 10.0;
        this._zoomFactor = 0.5;
        this._rotateFactor = 5.0;
    },


    addPan: function ( pan, x, y ) {
        pan.setDelay( this._delay );
        pan.addTarget( x * this._padFactor, y * this._padFactor );
    },

    addZoom: function ( zoom, z ) {
        zoom.setDelay( this._delay );
        zoom.addTarget( z * this._zoomFactor );
    },

    addRotate: function ( rotate, x, y ) {
        rotate.setDelay( this._delay );
        //var rotateTarget = rotate.getTarget();
        rotate.addTarget( x * this._rotateFactor, y * this._rotateFactor );
    },

    gamepadaxes: function ( axes ) {

        // Block badly balanced controllers
        var AXIS_THRESHOLD = 0.005;

        //var rotateTarget, panTarget;
        var rotate = this._manipulator.getRotateInterpolator();
        var zoom = this._manipulator.getZoomInterpolator();
        var pan = this._manipulator.getPanInterpolator();
        // Regular gamepads
        if ( axes.length === 4 ) {

            if ( Math.abs( axes[ 0 ] ) > AXIS_THRESHOLD || Math.abs( axes[ 1 ] ) > AXIS_THRESHOLD ) {
                this.addRotate( rotate, -axes[ 0 ], axes[ 1 ] );
            }
            if ( Math.abs( axes[ 3 ] ) > AXIS_THRESHOLD ) {
                this.addZoom( zoom, -axes[ 3 ] );
            }

            //SpaceNavigator & 6-axis controllers
        } else if ( axes.length >= 5 ) {
            //Notify.log(axes);
            if ( Math.abs( axes[ 0 ] ) > AXIS_THRESHOLD || Math.abs( axes[ 1 ] ) > AXIS_THRESHOLD ) {
                this.addPan( pan, -axes[ 0 ], axes[ 1 ] );
            }

            if ( Math.abs( axes[ 2 ] ) > AXIS_THRESHOLD ) {
                this.addZoom( zoom, -axes[ 2 ] );
            }

            if ( Math.abs( axes[ 3 ] ) > AXIS_THRESHOLD || Math.abs( axes[ 4 ] ) > AXIS_THRESHOLD ) {
                this.addRotate( rotate, axes[ 4 ], axes[ 3 ] );
            }
        }

    },

    gamepadbuttondown: function ( event /*, pressed */ ) {
        // Buttons 12 to 15 are the d-pad.
        if ( event.button >= 12 && event.button <= 15 ) {
            var pan = this._manipulator.getPanInterpolator();
            var panTarget = pan.getTarget();
            var delta = {
                12: vec2.fromValues( 0, -1 ),
                13: vec2.fromValues( 0, 1 ),
                14: vec2.fromValues( -1, 0 ),
                15: vec2.fromValues( 1, 0 )
            }[ event.button ];
            pan.setDelay( this._delay );
            pan.setTarget( panTarget[ 0 ] - delta[ 0 ] * 10, panTarget[ 1 ] + delta[ 1 ] * 10 );
        }
    },

    update: function ( gm ) {
        if ( !gm ) {
            return;
        }

        var axis = gm.axes;
        var buttons = gm.buttons;

        this.gamepadaxes( axis );

        // Dummy event wrapper
        var emptyFunc = function () {};
        for ( var i = 0; i < buttons.length; i++ ) {
            if ( buttons[ i ] ) {
                this.gamepadbuttondown( {
                    preventDefault: emptyFunc,
                    gamepad: gm,
                    button: i
                }, !!buttons[ i ] );
            }
        }
    }
};
module.exports = OrbitManipulatorGamePadController;
