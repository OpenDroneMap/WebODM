'use strict';
var Notify = require( 'osg/notify' );
var PrimitiveSet = require( 'osg/primitiveSet' );


/**
 * DrawArrays manage rendering primitives
 * @class DrawArrays
 */
var DrawArrays = function ( mode, first, count ) {
    this.mode = mode;
    if ( mode !== undefined ) {
        if ( typeof ( mode ) === 'string' ) {
            mode = PrimitiveSet[ mode ];
        }
        this.mode = mode;
    }
    this.first = first;
    this.count = count;
};

/** @lends DrawArrays.prototype */
DrawArrays.prototype = {
    draw: function ( state ) {
        if ( this.count === 0 )
            return;
        var gl = state.getGraphicContext();
        gl.drawArrays( this.mode, this.first, this.count );
    },
    getMode: function () {
        return this.mode;
    },
    setCount: function ( count ) {
        this.count = count;
    },
    getCount: function () {
        return this.count;
    },
    setFirst: function ( first ) {
        this.first = first;
    },
    getFirst: function () {
        return this.first;
    },
    getNumIndices: function () {
        return this.count;
    },
    index: function ( i ) {
        return this.first + i;
    }

};
DrawArrays.create = function ( mode, first, count ) {
    Notify.log( 'DrawArrays.create is deprecated, use new DrawArrays with same arguments' );
    var d = new DrawArrays( mode, first, count );
    return d;
};

module.exports = DrawArrays;
