// user performance if available or fallback

'use strict';
var now = ( function () {

    var w = window || global;

    // if no window.performance
    if ( w.performance === undefined ) {
        return function () {
            return Date.now();
        };
    }

    var fn = w.performance.now || w.performance.mozNow || w.performance.msNow || w.performance.oNow || w.performance.webkitNow ||
        function () {
            return Date.now();
        };
    return function () {
        return fn.apply( w.performance, arguments );
    };
} )();


var Timer = function () {};

Timer.instance = function () {

    if ( !Timer._instance )
        Timer._instance = new Timer();

    return Timer._instance;
};

Timer.prototype = {

    // delta in seconds
    deltaS: function ( t0, t1 ) {
        return ( t1 - t0 ) / 1000.0;
    },

    // delta in milliseconds
    deltaM: function ( t0, t1 ) {
        return t1 - t0;
    },

    tick: function () {
        return now();
    }


};


module.exports = Timer;
