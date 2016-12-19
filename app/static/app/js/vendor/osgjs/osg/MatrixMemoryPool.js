'use strict';
var mat4 = require( 'osg/glMatrix' ).mat4;


/**
 *  Prevents Memory fragmentation, GC heavy usage
 *    using pre-allocated memory segment
 *    allowing reuse of memory
 *  @class MatrixMemoryPool
 */
var MatrixMemoryPool = function () {

    this._stack = [ mat4.create() ];
    this._current = 0;

};


/** @lends MatrixMemoryPool.prototype */
MatrixMemoryPool.prototype = {

    // start reuse the stack
    reset: function () {

        this._current = 0;

    },

    get: function () {

        var m = this._stack[ this._current++ ];

        if ( this._current === this._stack.length ) {

            this._stack.push( mat4.create() );

        }

        return m;

    }

};

module.exports = MatrixMemoryPool;
