'use strict';

var FirstPersonManipulatorStandardMouseKeyboardController = function ( manipulator ) {
    this._manipulator = manipulator;
    this.init();
};

FirstPersonManipulatorStandardMouseKeyboardController.prototype = {
    init: function () {
        this.releaseButton();
        this._delay = 0.15;
        this._stepFactor = 1.0; // meaning radius*stepFactor to move
    },
    setEventProxy: function ( proxy ) {
        this._eventProxy = proxy;
    },
    setManipulator: function ( manipulator ) {
        this._manipulator = manipulator;

        // we always want to sync speed of controller with manipulator
        this._manipulator.setStepFactor( this._stepFactor );
    },

    pushButton: function () {
        this._buttonup = false;
    },
    releaseButton: function () {
        this._buttonup = true;
    },

    mousedown: function ( ev ) {
        var pos = this._eventProxy.getPositionRelativeToCanvas( ev );
        var manipulator = this._manipulator;
        manipulator.getLookPositionInterpolator().set( pos[ 0 ], pos[ 1 ] );
        this.pushButton();
    },
    mouseup: function ( /*ev */) {
        this.releaseButton();
    },
    mouseout: function ( /*ev */) {
        this.releaseButton();
    },
    mousemove: function ( ev ) {
        if ( this._buttonup === true ) {
            return;
        }

        var pos = this._eventProxy.getPositionRelativeToCanvas( ev );
        this._manipulator.getLookPositionInterpolator().setDelay( this._delay );
        this._manipulator.getLookPositionInterpolator().setTarget( pos[ 0 ], pos[ 1 ] );
    },
    mousewheel: function ( ev, intDelta /*, deltaX, deltaY */ ) {
        ev.preventDefault();
        this._stepFactor = Math.min( Math.max( 0.001, this._stepFactor + intDelta * 0.01 ), 4.0 );
        this._manipulator.setStepFactor( this._stepFactor );
    },

    keydown: function ( event ) {
        var manipulator = this._manipulator;
        if ( event.keyCode === 32 ) {
            manipulator.computeHomePosition();
            event.preventDefault();
        } else if ( event.keyCode === 87 || event.keyCode === 90 || event.keyCode === 38 ) { // w/z/up
            manipulator.getForwardInterpolator().setDelay( this._delay );
            manipulator.getForwardInterpolator().setTarget( 1 );
            event.preventDefault();
            return false;
        } else if ( event.keyCode === 83 || event.keyCode === 40 ) { // S/down
            manipulator.getForwardInterpolator().setDelay( this._delay );
            manipulator.getForwardInterpolator().setTarget( -1 );
            event.preventDefault();
            return false;
        } else if ( event.keyCode === 68 || event.keyCode === 39 ) { // D/right
            manipulator.getSideInterpolator().setDelay( this._delay );
            manipulator.getSideInterpolator().setTarget( 1 );
            event.preventDefault();
            return false;
        } else if ( event.keyCode === 65 || event.keyCode === 81 || event.keyCode === 37 ) { // a/q/left
            manipulator.getSideInterpolator().setDelay( this._delay );
            manipulator.getSideInterpolator().setTarget( -1 );
            event.preventDefault();
            return false;
        }
        return undefined;
    },

    keyup: function ( event ) {
        var manipulator = this._manipulator;
        if ( event.keyCode === 87 || event.keyCode === 90 || event.keyCode === 38 || // w/z/up
            event.keyCode === 83 || event.keyCode === 40 ) { // S/down
            manipulator.getForwardInterpolator().setDelay( this._delay );
            manipulator.getForwardInterpolator().setTarget( 0 );
            return false;
        } else if ( event.keyCode === 68 || event.keyCode === 39 || // D/right
            event.keyCode === 65 || event.keyCode === 81 || event.keyCode === 37 ) { // a/q/left
            manipulator.getSideInterpolator().setDelay( this._delay );
            manipulator.getSideInterpolator().setTarget( 0 );
            return false;
        }
        return undefined;
    }

};

module.exports = FirstPersonManipulatorStandardMouseKeyboardController;
