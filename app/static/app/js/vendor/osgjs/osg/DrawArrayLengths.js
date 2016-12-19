'use strict';

/**
 * DrawArrayLengths manage rendering primitives
 * @class DrawArrayLengths
 */
var DrawArrayLengths = function ( mode, first, array ) {
    this._mode = mode;
    this._first = first;
    this._arrayLengths = array.slice( 0 );
};

/** @lends DrawArrayLengths.prototype */
DrawArrayLengths.prototype = {
    draw: function ( state ) {
        var gl = state.getGraphicContext();
        var mode = this._mode;
        var first = this._first;
        var array = this._arrayLengths;
        for ( var i = 0, l = array.length; i < l; i++ ) {
            var count = array[ i ];
            gl.drawArrays( mode, first, count );
            first += count;
        }
    },
    getMode: function () {
        return this._mode;
    },
    getNumIndices: function () {
        var count = 0;
        var array = this._arrayLengths;
        for ( var i = 0, l = array.length; i < l; i++ ) {
            count += array[ i ];
        }
        return count;
    },
    getCount: function () {
        return this.getNumIndices();
    },
    getArrayLengths: function () {
        return this._arrayLengths;
    },
    getFirst: function () {
        return this._first;
    },
    setFirst: function ( first ) {
        this._first = first;
    }
};

module.exports = DrawArrayLengths;
