'use strict';
var Notify = require( 'osg/notify' );


var OrbitManipulatorHammerController = function ( manipulator ) {
    this._manipulator = manipulator;
    this.init();
};

OrbitManipulatorHammerController.prototype = {
    init: function () {
        this._panFactorX = 1.0;
        this._panFactorY = -this._panFactorX;

        this._rotateFactorX = 0.6;
        this._rotateFactorY = -this._rotateFactorX;
        this._zoomFactor = 5.0;

        this._lastScale = 0;
        this._nbPointerLast = 0; // to check if we the number of pointers has changed
        this._delay = 0.15;
    },
    setEventProxy: function ( proxy ) {
        if ( proxy === undefined || ( proxy !== undefined && proxy === this._eventProxy ) ) {
            return;
        }
        this._eventProxy = proxy;
        var self = this;
        var hammer = proxy;
        var computeTouches = function ( event ) {
            if ( event.pointers !== undefined )
                return event.pointers.length;
            return 1; // mouse
        };

        var dragCB = function ( ev ) {
            return 'touches ' + computeTouches( ev ) + ' distance ' + ev.distance + ' x ' + ev.deltaX + ' y ' + ev.deltaY;
        };
        // Set a minimal thresold on pinch event, to be detected after pan
        hammer.get( 'pinch' ).set( {
            threshold: 0.1
        } );
        // Let the pan be detected with two fingers.
        hammer.get( 'pan' ).set( {
            threshold: 0,
            pointers: 0
        } );
        hammer.get( 'pinch' ).recognizeWith( hammer.get( 'pan' ) );

        this._cbPanStart = function ( event ) {
            var manipulator = self._manipulator;
            if ( !manipulator || self._transformStarted || event.pointerType === 'mouse' ) {
                return;
            }
            var gesture = event;
            self._dragStarted = true;
            self._nbPointerLast = computeTouches( gesture );

            if ( self._nbPointerLast === 2 ) {
                manipulator.getPanInterpolator().reset();
                manipulator.getPanInterpolator().set( event.center.x * self._panFactorX, event.center.y * self._panFactorY );
            } else {
                manipulator.getRotateInterpolator().reset();
                manipulator.getRotateInterpolator().set( event.center.x * self._rotateFactorX, event.center.y * self._rotateFactorY );
            }
            Notify.debug( 'drag start, ' + dragCB( gesture ) );
        };

        this._cbPanMove = function ( event ) {
            var manipulator = self._manipulator;
            if ( !manipulator || !self._dragStarted || event.pointerType === 'mouse' ) {
                return;
            }
            var gesture = event;
            var nbPointers = computeTouches( gesture );
            // prevent sudden big changes in the event.center variables
            if ( self._nbPointerLast !== nbPointers ) {
                if ( nbPointers === 2 ) manipulator.getPanInterpolator().reset();
                else manipulator.getRotateInterpolator().reset();
                self._nbPointerLast = nbPointers;
            }

            if ( nbPointers === 2 ) {
                manipulator.getPanInterpolator().setTarget( event.center.x * self._panFactorX, event.center.y * self._panFactorY );
                Notify.debug( 'pan, ' + dragCB( gesture ) );
            } else {
                manipulator.getRotateInterpolator().setDelay( self._delay );
                manipulator.getRotateInterpolator().setTarget( event.center.x * self._rotateFactorX, event.center.y * self._rotateFactorY );
                Notify.debug( 'rotate, ' + dragCB( gesture ) );
            }
        };

        this._cbPanEnd = function ( event ) {
            var manipulator = self._manipulator;
            if ( !manipulator || !self._dragStarted || event.pointerType === 'mouse' ) {
                return;
            }
            self._dragStarted = false;
            var gesture = event;
            Notify.debug( 'drag end, ' + dragCB( gesture ) );
        };

        this._cbPinchStart = function ( event ) {
            var manipulator = self._manipulator;
            if ( !manipulator || event.pointerType === 'mouse' ) {
                return;
            }
            self._transformStarted = true;
            var gesture = event;

            self._lastScale = gesture.scale;
            manipulator.getZoomInterpolator().reset();
            manipulator.getZoomInterpolator().set( self._lastScale );
            event.preventDefault();
            Notify.debug( 'zoom start, ' + dragCB( gesture ) );
        };

        this._cbPinchEnd = function ( event ) {
            if ( event.pointerType === 'mouse' ) {
                return;
            }
            self._transformStarted = false;
            Notify.debug( 'zoom end, ' + dragCB( event ) );
        };

        this._cbPinchInOut = function ( event ) {
            var manipulator = self._manipulator;
            if ( !manipulator || !self._transformStarted || event.pointerType === 'mouse' ) {
                return;
            }
            var gesture = event;
            // make the dezoom faster
            var zoomFactor = gesture.scale > self._lastScale ? self._zoomFactor : self._zoomFactor * 4.0;
            var scale = ( gesture.scale - self._lastScale ) * zoomFactor;
            self._lastScale = gesture.scale;

            manipulator.getZoomInterpolator().setTarget( manipulator.getZoomInterpolator().getTarget()[ 0 ] - scale );
            Notify.debug( 'zoom, ' + dragCB( gesture ) );
        };

        hammer.on( 'panstart ', this._cbPanStart );
        hammer.on( 'panmove', this._cbPanMove );
        hammer.on( 'panend', this._cbPanEnd );
        hammer.on( 'pinchstart', this._cbPinchStart );
        hammer.on( 'pinchend', this._cbPinchEnd );
        hammer.on( 'pinchin pinchout', this._cbPinchInOut );
    },
    removeEventProxy: function ( proxy ) {
        if ( !proxy || !this._eventProxy )
            return;
        proxy.off( 'panstart ', this._cbPanStart );
        proxy.off( 'panmove', this._cbPanMove );
        proxy.off( 'panend', this._cbPanEnd );
        proxy.off( 'pinchstart', this._cbPinchStart );
        proxy.off( 'pinchend', this._cbPinchEnd );
        proxy.off( 'pinchin pinchout', this._cbPinchInOut );
    },
    setManipulator: function ( manipulator ) {
        this._manipulator = manipulator;
    }
};
module.exports = OrbitManipulatorHammerController;
