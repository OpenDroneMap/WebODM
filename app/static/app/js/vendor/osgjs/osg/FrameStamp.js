'use strict';

var FrameStamp = function () {
    this._frame = 0;
    this._startSimulation = 0.0;
    this._currentSimulation = 0.0;
    this._deltaTime = 0.0; // last time elapsed since the next traversal
};

FrameStamp.prototype = {
    setReferenceTime: function ( s ) {
        this._startSimulation = s;
    },
    getReferenceTime: function () {
        return this._startSimulation;
    },
    setSimulationTime: function ( s ) {
        this._currentSimulation = s;
    },
    getSimulationTime: function () {
        return this._currentSimulation;
    },
    setDeltaTime: function ( d ) {
        this._deltaTime = d;
    },
    getDeltaTime: function () {
        return this._deltaTime;
    },
    setFrameNumber: function ( n ) {
        this._frame = n;
    },
    getFrameNumber: function () {
        return this._frame;
    }
};

module.exports = FrameStamp;
