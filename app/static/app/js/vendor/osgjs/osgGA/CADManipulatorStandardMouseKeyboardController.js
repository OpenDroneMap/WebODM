'use strict';
var OrbitManipulator = require( 'osgGA/OrbitManipulator' );

var CADManipulatorStandardMouseKeyboardController = function ( manipulator ) {
    this._manipulator = manipulator;
    this._timer = false;
    this.init();
};

CADManipulatorStandardMouseKeyboardController.prototype = {
    init: function () {
        this.releaseButton();
        this._rotateKey = 65; // a
        this._zoomKey = 83; // s
        this._panKey = 68; // d
        this._mode = undefined;
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
    setDimensionMask: function ( dimMask ) {
        this._dimensionMask = dimMask;
    },

    mousemove: function ( ev ) {
        if ( this._buttonup === true ) {
            return;
        }

        var manipulator = this._manipulator;
        var pos = manipulator.getPositionRelativeToCanvas( ev.clientX, ev.clientY );

        if ( isNaN( pos[ 0 ] ) === false && isNaN( pos[ 1 ] ) === false ) {

            var mode = this.getMode();
            if ( mode === OrbitManipulator.Rotate ) {
                manipulator.getRotateInterpolator().setTarget( pos[ 0 ], pos[ 1 ] );

            } else if ( mode === OrbitManipulator.Pan ) {
                manipulator.getPanInterpolator().setTarget( pos[ 0 ], pos[ 1 ] );

            } else if ( mode === OrbitManipulator.Zoom ) {
                var zoom = manipulator.getZoomInterpolator();
                manipulator.computeIntersections( pos );

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
                    this.setMode( OrbitManipulator.Pan );
                } else if ( ev.ctrlKey ) {
                    this.setMode( OrbitManipulator.Zoom );
                } else {
                    this.setMode( OrbitManipulator.Rotate );
                }
            } else {
                this.setMode( OrbitManipulator.Pan );
            }
        }

        this.pushButton();

        //var pos = this.getPositionRelativeToCanvas( ev );
        var pos = manipulator.getPositionRelativeToCanvas( ev.clientX, ev.clientY );
        manipulator.computeIntersections( pos );

        mode = this.getMode();
        if ( mode === OrbitManipulator.Rotate ) {
            manipulator.getRotateInterpolator().reset();
            manipulator.getRotateInterpolator().set( pos[ 0 ], pos[ 1 ] );
        } else if ( mode === OrbitManipulator.Pan ) {
            manipulator.getPanInterpolator().reset();
            manipulator.getPanInterpolator().set( pos[ 0 ], pos[ 1 ] );
        } else if ( mode === OrbitManipulator.Zoom ) {
            manipulator.getZoomInterpolator().setStart( pos[ 1 ] );
            manipulator.getZoomInterpolator().set( 0.0 );
        }
        ev.preventDefault();
    },
    mouseup: function ( /*ev */) {
        this.releaseButton();
        this.setMode( undefined );
    },
    mousewheel: function ( ev, intDelta /*, deltaX, deltaY */ ) {
        var manipulator = this._manipulator;
        ev.preventDefault();
        var zoomTarget = manipulator.getZoomInterpolator().getTarget()[ 0 ] - intDelta;
        manipulator.getZoomInterpolator().setTarget( zoomTarget );
        var timer;
        if ( this._timer === false ) {
            this._timer = true;
            var that = this;
            clearTimeout( timer );
            timer = setTimeout( function () {
                that._timer = false;
            }, 200 );
            //var pos = this.getPositionRelativeToCanvas( ev );
            var pos = manipulator.getPositionRelativeToCanvas( ev.clientX, ev.clientY );
            manipulator.computeIntersections( pos );
        }
    },

    dblclick: function ( ev ) {
        var manipulator = this._manipulator;
        ev.preventDefault();

        manipulator.getZoomInterpolator().set( 0.0 );
        var zoomTarget = manipulator.getZoomInterpolator().getTarget()[ 0 ] - 10; // Default interval 10
        manipulator.getZoomInterpolator().setTarget( zoomTarget );
        //var pos = this.getPositionRelativeToCanvas( ev );
        var pos = manipulator.getPositionRelativeToCanvas( ev.clientX, ev.clientY );
        manipulator.computeIntersections( pos );
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
            this.getMode() !== OrbitManipulator.Pan ) {
            this.setMode( OrbitManipulator.Pan );
            this._manipulator.getPanInterpolator().reset();
            this.pushButton();
            ev.preventDefault();
        } else if ( ev.keyCode === this._zoomKey &&
            this.getMode() !== OrbitManipulator.Zoom ) {
            this.setMode( OrbitManipulator.Zoom );
            this._manipulator.getZoomInterpolator().reset();
            this.pushButton();
            ev.preventDefault();
        } else if ( ev.keyCode === this._rotateKey &&
            this.getMode() !== OrbitManipulator.Rotate ) {
            this.setMode( OrbitManipulator.Rotate );
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
    },

};

module.exports = CADManipulatorStandardMouseKeyboardController;
