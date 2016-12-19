'use strict';
var osgMath = require( 'osg/math' );
var OrbitManipulatorEnums = require( 'osgGA/orbitManipulatorEnums' );


var OrbitManipulatorStandardMouseKeyboardController = function ( manipulator ) {
    this._manipulator = manipulator;
    this.init();
};

OrbitManipulatorStandardMouseKeyboardController.prototype = {
    init: function () {
        this.releaseButton();
        this._rotateKey = 65; // a
        this._zoomKey = 83; // s
        this._panKey = 68; // d

        this._mode = undefined;
        this._delay = 0.15;
    },
    getMode: function () {
        return this._mode;
    },
    setMode: function ( mode ) {
        this._mode = mode;
    },
    setEventProxy: function ( proxy ) {
        this._eventProxy = proxy;
    },
    setManipulator: function ( manipulator ) {
        this._manipulator = manipulator;
    },
    mousemove: function ( ev ) {
        if ( this._buttonup === true ) {
            return;
        }
        var pos = this._eventProxy.getPositionRelativeToCanvas( ev );
        var manipulator = this._manipulator;
        if ( osgMath.isNaN( pos[ 0 ] ) === false && osgMath.isNaN( pos[ 1 ] ) === false ) {

            var mode = this.getMode();
            if ( mode === OrbitManipulatorEnums.ROTATE ) {
                manipulator.getRotateInterpolator().setDelay( this._delay );
                manipulator.getRotateInterpolator().setTarget( pos[ 0 ], pos[ 1 ] );

            } else if ( mode === OrbitManipulatorEnums.PAN ) {
                manipulator.getPanInterpolator().setTarget( pos[ 0 ], pos[ 1 ] );

            } else if ( mode === OrbitManipulatorEnums.ZOOM ) {
                var zoom = manipulator.getZoomInterpolator();
                if ( zoom.isReset() ) {
                    zoom.setStart( pos[ 1 ] );
                    zoom.set( 0.0 );
                }
                var dy = pos[ 1 ] - zoom.getStart();
                zoom.setStart( pos[ 1 ] );
                var v = zoom.getTarget()[ 0 ];
                zoom.setTarget( v - dy / 20.0 );
            }
        }

        ev.preventDefault();
    },
    mousedown: function ( ev ) {
        var manipulator = this._manipulator;
        var mode = this.getMode();
        if ( mode === undefined ) {
            if ( ev.button === 0 ) {
                if ( ev.shiftKey ) {
                    this.setMode( OrbitManipulatorEnums.PAN );
                } else if ( ev.ctrlKey ) {
                    this.setMode( OrbitManipulatorEnums.ZOOM );
                } else {
                    this.setMode( OrbitManipulatorEnums.ROTATE );
                }
            } else {
                // For users on Mac machines for who CTRL+LeftClick is naturally converted 
                // into a RightClick in Firefox.
                if ( ev.button === 2 && ev.ctrlKey ) {
                    this.setMode( OrbitManipulatorEnums.ZOOM );
                } else {
                    this.setMode( OrbitManipulatorEnums.PAN );
                }
            }
        }

        this.pushButton();

        var pos = this._eventProxy.getPositionRelativeToCanvas( ev );
        mode = this.getMode();
        if ( mode === OrbitManipulatorEnums.ROTATE ) {
            manipulator.getRotateInterpolator().reset();
            manipulator.getRotateInterpolator().set( pos[ 0 ], pos[ 1 ] );
        } else if ( mode === OrbitManipulatorEnums.PAN ) {
            manipulator.getPanInterpolator().reset();
            manipulator.getPanInterpolator().set( pos[ 0 ], pos[ 1 ] );
        } else if ( mode === OrbitManipulatorEnums.ZOOM ) {
            manipulator.getZoomInterpolator().setStart( pos[ 1 ] );
            manipulator.getZoomInterpolator().set( 0.0 );
        }
        ev.preventDefault();
    },
    mouseup: function ( /*ev */) {
        this.releaseButton();
        this.setMode( undefined );
    },
    mouseout: function ( /*ev */) {
        this.releaseButton();
        this.setMode( undefined );
    },
    mousewheel: function ( ev, intDelta /*, deltaX, deltaY */ ) {
        var manipulator = this._manipulator;
        ev.preventDefault();
        var zoomTarget = manipulator.getZoomInterpolator().getTarget()[ 0 ] - intDelta;
        manipulator.getZoomInterpolator().setTarget( zoomTarget );
    },

    pushButton: function () {
        this._buttonup = false;
    },
    releaseButton: function () {
        this._buttonup = true;
    },

    keydown: function ( ev ) {
        if ( ev.keyCode === 32 ) {
            this._manipulator.computeHomePosition();
            ev.preventDefault();
        } else if ( ev.keyCode === this._panKey &&
            this.getMode() !== OrbitManipulatorEnums.PAN ) {
            this.setMode( OrbitManipulatorEnums.PAN );
            this._manipulator.getPanInterpolator().reset();
            this.pushButton();
            ev.preventDefault();
        } else if ( ev.keyCode === this._zoomKey &&
            this.getMode() !== OrbitManipulatorEnums.ZOOM ) {
            this.setMode( OrbitManipulatorEnums.ZOOM );
            this._manipulator.getZoomInterpolator().reset();
            this.pushButton();
            ev.preventDefault();
        } else if ( ev.keyCode === this._rotateKey &&
            this.getMode() !== OrbitManipulatorEnums.ROTATE ) {
            this.setMode( OrbitManipulatorEnums.ROTATE );
            this._manipulator.getRotateInterpolator().reset();
            this.pushButton();
            ev.preventDefault();
        }

    },

    keyup: function ( ev ) {
        if ( ev.keyCode === this._panKey ) {
            this.mouseup( ev );
        } else if ( ev.keyCode === this._rotateKey ) {
            this.mouseup( ev );
        } else if ( ev.keyCode === this._rotateKey ) {
            this.mouseup( ev );
        }
        this.setMode( undefined );
    }

};
module.exports = OrbitManipulatorStandardMouseKeyboardController;
