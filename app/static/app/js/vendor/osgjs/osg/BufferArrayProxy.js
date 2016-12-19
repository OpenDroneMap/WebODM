'use strict';
var BufferArray = require( 'osg/BufferArray' );


var BufferArrayProxy = function ( bufferArray ) {

    this._initialBufferArray = undefined;
    this._bufferArray = undefined;
    if ( bufferArray ) {
        this.setBufferArray( bufferArray );
        this.setInitialBufferArray( bufferArray );
    }

};

var prototype = {
    setInitialBufferArray: function ( bufferArray ) {
        this._initialBufferArray = bufferArray;
    },
    getInitialBufferArray: function () {
        return this._initialBufferArray;
    },
    setBufferArray: function ( bufferArray ) {
        this._bufferArray = bufferArray.getBufferArray ? bufferArray.getBufferArray() : bufferArray;
    },
    getBufferArray: function () {
        return this._bufferArray;
    }
};

// adds original method of BufferArray prototype for the proxy for convenient usage
var keys = window.Object.keys( BufferArray.prototype );
keys.forEach( function ( methodName ) {
    prototype[ methodName ] = function () {
        return BufferArray.prototype[ methodName ].apply( this._bufferArray, arguments );
    };
} );

BufferArrayProxy.prototype = prototype;
module.exports = BufferArrayProxy;
