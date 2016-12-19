'use strict';
var Notify = require( 'osg/notify' );
var PrimitiveSet = require( 'osg/primitiveSet' );


/**
 * DrawElements manage rendering of indexed primitives
 * @class DrawElements
 */
var DrawElements = function ( mode, indices ) {
    this.mode = PrimitiveSet.POINTS;
    if ( mode !== undefined ) {
        if ( typeof ( mode ) === 'string' ) {
            mode = PrimitiveSet[ mode ];
        }
        this.mode = mode;
    }
    this.count = 0;
    this.offset = 0;
    this.indices = indices;
    this.uType = DrawElements.UNSIGNED_SHORT;
    if ( indices !== undefined ) {
        this.setIndices( indices );
    }
};

DrawElements.UNSIGNED_BYTE = 0x1401;
DrawElements.UNSIGNED_SHORT = 0x1403;
DrawElements.UNSIGNED_INT = 0x1405;

/** @lends DrawElements.prototype */
DrawElements.prototype = {
    getMode: function () {
        return this.mode;
    },
    draw: function ( state ) {
        if ( this.count === 0 )
            return;
        state.setIndexArray( this.indices );
        this.drawElements( state );
    },
    drawElements: function ( state ) {
        var gl = state.getGraphicContext();
        gl.drawElements( this.mode, this.count, this.uType, this.offset );
    },
    setIndices: function ( indices ) {
        this.indices = indices;
        var elts = indices.getElements();
        this.count = elts.length;

        var nbBytes = elts.BYTES_PER_ELEMENT;
        if ( nbBytes === 1 ) this.uType = DrawElements.UNSIGNED_BYTE;
        else if ( nbBytes === 2 ) this.uType = DrawElements.UNSIGNED_SHORT;
        else if ( nbBytes === 4 ) this.uType = DrawElements.UNSIGNED_INT;
    },
    getIndices: function () {
        return this.indices;
    },
    setFirst: function ( val ) {
        this.offset = val;
    },
    getFirst: function () {
        return this.offset;
    },
    setCount: function ( val ) {
        this.count = val;
    },
    getCount: function () {
        return this.count;
    },
    getNumIndices: function () {
        return this.indices.getElements().length;
    },
    index: function ( i ) {
        return this.indices.getElements()[ i ];
    }


};

DrawElements.create = function ( mode, indices ) {
    Notify.log( 'DrawElements.create is deprecated, use new DrawElements with same arguments' );
    return new DrawElements( mode, indices );
};

module.exports = DrawElements;
