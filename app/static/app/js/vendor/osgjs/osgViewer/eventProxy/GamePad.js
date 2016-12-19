'use strict';
var Notify = require( 'osg/notify' );


var GamePad = function ( viewer ) {
    this._viewer = viewer;
    this._type = 'GamePad';
    this._enable = true;
    this._gamepadIndex = -1;
};

GamePad.prototype = {

    setEnable: function ( bool ) {
        this._enable = bool;
    },

    getEnable: function () {
        return this._enable;
    },

    init: function ( /*args*/) {},

    isValid: function () {
        if ( !this._enable )
            return false;

        var manipulator = this._viewer.getManipulator();
        if ( !manipulator )
            return false;

        var constrollerList = manipulator.getControllerList();
        if ( !constrollerList[ this._type ] )
            return false;

        return true;
    },

    getManipulatorController: function () {
        return this._viewer.getManipulator().getControllerList()[ this._type ];
    },

    gamepadPoll: function () {
        if ( !navigator.getGamepads )
            return null;
        var gamepads = navigator.getGamepads();
        var gamepad = gamepads[ this._gamepadIndex ];
        if ( gamepad )
            return gamepad;

        for ( var i = 0, nb = gamepads.length; i < nb; ++i ) {
            var gm = gamepads[ i ];
            // https://code.google.com/p/chromium/issues/detail?id=413805
            if ( gm && gm.id && gm.id.indexOf( 'Unknown Gamepad' ) === -1 ) {
                this._gamepadIndex = i;
                this.onGamepadConnect( gm );
                return gm;
            }
        }
        if ( this._gamepadIndex >= 0 ) {
            this._gamepadIndex = -1;
            this.onGamepadConnect();
        }
        return null;
    },

    onGamepadConnect: function ( gamepad ) {
        Notify.log( 'Detected new gamepad!', gamepad );
    },

    onGamepadDisconnect: function () {
        Notify.log( 'Gamepad disconnected' );
    },

    // Called in each frame
    update: function () {
        // we poll instead

        if ( !this.isValid() )
            return;

        var gamepad = this.gamepadPoll();
        if ( !gamepad )
            return;

        var manipulatorAdapter = this.getManipulatorController();
        //manipulatorAdapter.setEventProxy(this);
        if ( manipulatorAdapter.update ) {
            manipulatorAdapter.update( gamepad );
        }
    }
};
module.exports = GamePad;
