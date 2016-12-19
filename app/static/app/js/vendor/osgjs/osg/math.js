'use strict';

var clamp = function ( x, min, max ) {
    // http://jsperf.com/math-clamp
    // http://jsperf.com/clamping-methods/2
    return Math.min( max, Math.max( min, x ) );
};

var smoothStep = function ( edge0, edge1, x ) {
    var t = clamp( ( x - edge0 ) / ( edge1 - edge0 ), 0.0, 1.0 );
    return t * t * ( 3.0 - 2.0 * t );
};

// native isNaN is slow (e.g: https://jsperf.com/isnan-performance/2)
// note : native isNaN will return true for undefined but
// this function assume that x is a number
var fastIsNaN = function ( x ) {
    return x !== x;
};

module.exports = {
    clamp: clamp,
    smoothStep: smoothStep,
    isNaN: fastIsNaN
};
