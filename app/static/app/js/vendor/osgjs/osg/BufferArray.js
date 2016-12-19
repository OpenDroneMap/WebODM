'use strict';
var MACROUTILS = require( 'osg/Utils' );
var Notify = require( 'osg/notify' );
var Object = require( 'osg/Object' );
var GLObject = require( 'osg/GLObject' );
var Timer = require( 'osg/Timer' );


var getAttributeType = function ( array ) {
    var type;

    if ( array instanceof MACROUTILS.Float32Array ) type = 0x1406;
    if ( array instanceof MACROUTILS.Uint32Array ) type = 0x1405;
    if ( array instanceof MACROUTILS.Uint16Array ) type = 0x1403;
    if ( array instanceof MACROUTILS.Uint8Array ) type = 0x1401;

    return type;
};

/**
 * BufferArray manage vertex / normal / ... array used by webgl.
 * osgjs automatically converts array buffers to Float32Array and
 * element array buffers to Uint16Array if not said explicitly with
 * preserveArrayType variable in constructor.
 * @class BufferArray
 */

var BufferArray = function ( target, elements, itemSize, preserveArrayType ) {

    GLObject.call( this );
    // maybe could inherit from Object
    this._instanceID = Object.getInstanceID();

    this.dirty();

    this._itemSize = itemSize;
    this._target = typeof target === 'string' ? BufferArray[ target ] : target;

    // initialized by setElements
    this._type = undefined;
    this._normalize = false;

    if ( elements !== undefined ) {
        var typedArray = elements;
        if ( !preserveArrayType ) {
            if ( this._target === BufferArray.ELEMENT_ARRAY_BUFFER ) {
                typedArray = elements instanceof MACROUTILS.Uint16Array ? elements : new MACROUTILS.Uint16Array( elements );
            } else {
                typedArray = elements instanceof MACROUTILS.Float32Array ? elements : new MACROUTILS.Float32Array( elements );
            }
        }
        this.setElements( typedArray );
    }
};

BufferArray.ELEMENT_ARRAY_BUFFER = 0x8893;
BufferArray.ARRAY_BUFFER = 0x8892;

// static cache of glBuffers flagged for deletion, which will actually
// be deleted in the correct GL context.
BufferArray._sDeletedGLBufferArrayCache = new window.Map();

// static method to delete Program
BufferArray.deleteGLBufferArray = function ( gl, buffer ) {
    if ( !BufferArray._sDeletedGLBufferArrayCache.has( gl ) )
        BufferArray._sDeletedGLBufferArrayCache.set( gl, [] );
    BufferArray._sDeletedGLBufferArrayCache.get( gl ).push( buffer );
};

// static method to flush all the cached glPrograms which need to be deleted in the GL context specified
BufferArray.flushDeletedGLBufferArrays = function ( gl, availableTime ) {
    // if no time available don't try to flush objects.
    if ( availableTime <= 0.0 ) return availableTime;
    if ( !BufferArray._sDeletedGLBufferArrayCache.has( gl ) ) return availableTime;
    var elapsedTime = 0.0;
    var beginTime = Timer.instance().tick();
    var deleteList = BufferArray._sDeletedGLBufferArrayCache.get( gl );
    var numBuffers = deleteList.length;
    for ( var i = numBuffers - 1; i >= 0 && elapsedTime < availableTime; i-- ) {
        gl.deleteBuffer( deleteList[ i ] );
        deleteList.splice( i, 1 );
        elapsedTime = Timer.instance().deltaS( beginTime, Timer.instance().tick() );
    }
    return availableTime - elapsedTime;
};

BufferArray.flushAllDeletedGLBufferArrays = function ( gl ) {
    if ( !BufferArray._sDeletedGLBufferArrayCache.has( gl ) ) return;
    var deleteList = BufferArray._sDeletedGLBufferArrayCache.get( gl );
    var numBuffers = deleteList.length;
    for ( var i = numBuffers - 1; i >= 0; i-- ) {
        gl.deleteBuffer( deleteList[ i ] );
        deleteList.splice( i, 1 );
    }
};

/** @lends BufferArray.prototype */
BufferArray.prototype = MACROUTILS.objectInherit( GLObject.prototype, {
    getInstanceID: function () {
        return this._instanceID;
    },
    setItemSize: function ( size ) {
        this._itemSize = size;
    },
    isValid: function () {
        if ( this._buffer !== undefined ||
            this._elements !== undefined ) {
            return true;
        }
        return false;
    },

    releaseGLObjects: function () {
        if ( this._buffer !== undefined && this._buffer !== null && this._gl !== undefined ) {
            BufferArray.deleteGLBufferArray( this._gl, this._buffer );
        }
        this._buffer = undefined;
    },

    setNormalize: function ( normalize ) {
        this._normalize = normalize;
    },

    getNormalize: function () {
        return this._normalize;
    },

    bind: function ( gl ) {
        if ( !this._gl ) this.setGraphicContext( gl );
        var target = this._target;
        var buffer = this._buffer;

        if ( buffer ) {
            gl.bindBuffer( target, buffer );
            return;
        }

        if ( !buffer && this._elements.length > 0 ) {
            this._buffer = gl.createBuffer();
            this._numItems = this._elements.length / this._itemSize;
            gl.bindBuffer( target, this._buffer );
        }
    },
    getItemSize: function () {
        return this._itemSize;
    },
    dirty: function () {
        this._dirty = true;
    },
    isDirty: function () {
        return this._dirty;
    },
    compile: function ( gl ) {
        if ( this._dirty ) {
            MACROUTILS.timeStamp( 'osgjs.metrics:bufferData' );
            gl.bufferData( this._target, this._elements, gl.STATIC_DRAW );
            this._dirty = false;
        }
    },
    getElements: function () {
        return this._elements;
    },
    setElements: function ( elements ) {
        this._elements = elements;
        this._type = getAttributeType( elements );
        this._dirty = true;
    },
    getType: function () {
        return this._type;
    }

} );

BufferArray.create = function ( type, elements, itemSize ) {
    Notify.log( 'BufferArray.create is deprecated, use new BufferArray with same arguments instead' );
    return new BufferArray( type, elements, itemSize );
};

module.exports = BufferArray;
