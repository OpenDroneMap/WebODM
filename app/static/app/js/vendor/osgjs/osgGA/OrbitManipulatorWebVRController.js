'use strict';

var OrbitManipulatorWebVRController = function ( manipulator ) {
    this._manipulator = manipulator;
    this.init();
};

OrbitManipulatorWebVRController.prototype = {
    init: function () {},
    update: function ( q, position ) {
        this._manipulator.setPoseVR( q, position );
    }
};

module.exports = OrbitManipulatorWebVRController;
