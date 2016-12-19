'use strict';
var Notify = require( 'osg/notify' );
var MACROUTILS = require( 'osg/Utils' );
var GLObject = require( 'osg/GLObject' );
var StateAttribute = require( 'osg/StateAttribute' );
var Timer = require( 'osg/Timer' );
var WebglCaps = require( 'osg/WebGLCaps' );

/**
 * FrameBufferObject manage fbo / rtt
 * @class FrameBufferObject
 */
var FrameBufferObject = function () {

    GLObject.call( this );
    StateAttribute.call( this );
    this._fbo = undefined;
    this._rbo = undefined;
    this._attachments = [];
    this._dirty = true;

};

FrameBufferObject.COLOR_ATTACHMENT0 = 0x8CE0;
FrameBufferObject.DEPTH_ATTACHMENT = 0x8D00;
FrameBufferObject.DEPTH_COMPONENT16 = 0x81A5;
// static cache of glFrameBuffer flagged for deletion, which will actually
// be deleted in the correct GL context.
FrameBufferObject._sDeletedGLFrameBufferCache = new window.Map();

// static method to delete FrameBuffers
FrameBufferObject.deleteGLFrameBuffer = function ( gl, fb ) {

    if ( !FrameBufferObject._sDeletedGLFrameBufferCache.has( gl ) )
        FrameBufferObject._sDeletedGLFrameBufferCache.set( gl, [] );

    FrameBufferObject._sDeletedGLFrameBufferCache.get( gl ).push( fb );
};

// static method to flush all the cached glFrameBuffers which need to be deleted in the GL context specified
FrameBufferObject.flushDeletedGLFrameBuffers = function ( gl, availableTime ) {

    // if no time available don't try to flush objects.
    if ( availableTime <= 0.0 ) return availableTime;

    if ( !FrameBufferObject._sDeletedGLFrameBufferCache.has( gl ) ) return availableTime;

    var elapsedTime = 0.0;
    var beginTime = Timer.instance().tick();
    var deleteList = FrameBufferObject._sDeletedGLFrameBufferCache.get( gl );
    var numBuffers = deleteList.length;

    for ( var i = numBuffers - 1; i >= 0 && elapsedTime < availableTime; i-- ) {
        gl.deleteFramebuffer( deleteList[ i ] );
        deleteList.splice( i, 1 );
        elapsedTime = Timer.instance().deltaS( beginTime, Timer.instance().tick() );
    }

    return availableTime - elapsedTime;
};

FrameBufferObject.flushAllDeletedGLFrameBuffers = function ( gl ) {

    if ( !FrameBufferObject._sDeletedGLFrameBufferCache.has( gl ) ) return;

    var deleteList = FrameBufferObject._sDeletedGLFrameBufferCache.get( gl );
    var numBuffers = deleteList.length;

    for ( var i = numBuffers - 1; i >= 0; i-- ) {
        gl.deleteFramebuffer( deleteList[ i ] );
        deleteList.splice( i, 1 );
    }
};


// static cache of glRenderBuffer flagged for deletion, which will actually
// be deleted in the correct GL context.
FrameBufferObject._sDeletedGLRenderBufferCache = new window.Map();

// static method to delete RenderBuffers
FrameBufferObject.deleteGLRenderBuffer = function ( gl, fb ) {

    if ( !FrameBufferObject._sDeletedGLRenderBufferCache.has( gl ) )
        FrameBufferObject._sDeletedGLRenderBufferCache.set( gl, [] );

    FrameBufferObject._sDeletedGLRenderBufferCache.get( gl ).push( fb );
};


// static method to flush all the cached glRenderBuffers which need to be deleted in the GL context specified
FrameBufferObject.flushDeletedGLRenderBuffers = function ( gl, availableTime ) {

    // if no time available don't try to flush objects.
    if ( availableTime <= 0.0 ) return availableTime;

    if ( !FrameBufferObject._sDeletedGLRenderBufferCache.has( gl ) ) return availableTime;

    var elapsedTime = 0.0;
    var beginTime = Timer.instance().tick();
    var deleteList = FrameBufferObject._sDeletedGLRenderBufferCache.get( gl );
    var numBuffers = deleteList.length;

    for ( var i = numBuffers - 1; i >= 0 && elapsedTime < availableTime; i-- ) {
        gl.deleteRenderbuffer( deleteList[ i ] );
        deleteList.splice( i, 1 );
        elapsedTime = Timer.instance().deltaS( beginTime, Timer.instance().tick() );
    }

    return availableTime - elapsedTime;
};

FrameBufferObject.flushAllDeletedGLRenderBuffers = function ( gl ) {

    if ( !FrameBufferObject._sDeletedGLRenderBufferCache.has( gl ) ) return;

    var deleteList = FrameBufferObject._sDeletedGLRenderBufferCache.get( gl );
    var numBuffers = deleteList.length;

    for ( var i = numBuffers - 1; i >= 0; i-- ) {
        gl.deleteRenderbuffer( deleteList[ i ] );
        deleteList.splice( i, 1 );
    }
};

/** @lends FrameBufferObject.prototype */
FrameBufferObject.prototype = MACROUTILS.objectInherit( GLObject.prototype, MACROUTILS.objectInherit( StateAttribute.prototype, {

    attributeType: 'FrameBufferObject',

    cloneType: function () {
        return new FrameBufferObject();
    },

    dirty: function () {
        this._dirty = true;
    },

    isDirty: function () {
        return this._dirty;
    },

    setAttachment: function ( attachment ) {
        this._attachments.push( attachment );
    },

    releaseGLObjects: function () {

        if ( this._fbo !== undefined && this._gl !== undefined ) {
            FrameBufferObject.deleteGLFrameBuffer( this._gl, this._fbo );
        }
        this._fbo = undefined;

        if ( this._rbo !== undefined && this._gl !== undefined ) {
            FrameBufferObject.deleteGLRenderBuffer( this._gl, this._rbo );
        }
        this._rbo = undefined;

    },

    _reportFrameBufferError: function ( code ) {
        switch ( code ) {
        case 0x8CD6:
            Notify.debug( 'FRAMEBUFFER_INCOMPLETE_ATTACHMENT' );
            break;
        case 0x8CD7:
            Notify.debug( 'FRAMEBUFFER_INCOMPLETE_MISSING_ATTACHMENT' );
            break;
        case 0x8CD9:
            Notify.debug( 'FRAMEBUFFER_INCOMPLETE_DIMENSIONS' );
            break;
        case 0x8CDD:
            Notify.debug( 'FRAMEBUFFER_UNSUPPORTED' );
            break;
        default:
            Notify.debug( 'FRAMEBUFFER unknown error ' + code.toString( 16 ) );
        }
    },

    reset: function () {
        this.releaseGLObjects();
        this._attachments = [];
    },

    getFrameBufferObject: function () {
        return this._fbo;
    },

    createFrameBufferObject: function ( state ) {
        this.setGraphicContext( state.getGraphicContext() );
        this._fbo = this._gl.createFramebuffer();
    },

    createRenderBuffer: function ( format, width, height ) {
        var gl = this._gl;
        var renderBuffer = gl.createRenderbuffer();
        gl.bindRenderbuffer( gl.RENDERBUFFER, renderBuffer );
        gl.renderbufferStorage( gl.RENDERBUFFER, format, width, height );

        return renderBuffer;
    },

    framebufferRenderBuffer: function ( attachment, renderBuffer ) {

        var gl = this._gl;
        gl.bindRenderbuffer( gl.RENDERBUFFER, renderBuffer );
        gl.framebufferRenderbuffer( gl.FRAMEBUFFER, attachment, gl.RENDERBUFFER, renderBuffer );

        /* develblock:start */
        // only visible with webgl-insector enabled
        if ( gl.rawgl !== undefined ) {
            Notify.log( 'FBO: renderBuffer: ' + this._fbo.trackedObject.defaultName );
        }
        /* develblock:end */
    },

    framebufferTexture2D: function ( state, attachment, textureTarget, texture ) {

        var gl = this._gl;

        // apply on unit 1 to init it
        // make sure we do bind it whatever state stack
        // texture is cached
        state.applyTextureAttribute( 1, texture );

        if ( texture.isDirty() || !texture.getTextureObject() ) {
            // image wasn't ready, texture not allocated due to lack of gpu MEM
            return false;
        }

        gl.framebufferTexture2D( gl.FRAMEBUFFER, attachment, textureTarget, texture.getTextureObject().id(), 0 );

        /* develblock:start */
        // only visible with webgl-insector enabled
        // allow trace debug (fb<->texture link)
        if ( gl.rawgl !== undefined ) {
            Notify.log( 'FBO: texture: ' + texture.getName() + ' : ' + texture.getTextureObject().id().trackedObject.defaultName + ' fbo: ' + this._fbo.trackedObject.defaultName );
        }
        /* develblock:end */

        return true;
    },

    bindFrameBufferObject: function () {
        var gl = this._gl;
        gl.bindFramebuffer( gl.FRAMEBUFFER, this._fbo );
    },

    checkStatus: function () {

        var gl = this._gl;
        var status = gl.checkFramebufferStatus( gl.FRAMEBUFFER );
        if ( status !== 0x8CD5 ) {
            this._reportFrameBufferError( status );
        }

    },

    _checkAllowedSize: function ( w, h ) {

        var maxSize = WebglCaps.instance().getWebGLParameter( 'MAX_RENDERBUFFER_SIZE' );

        if ( w === 0 || h === 0 || h > maxSize || w > maxSize ) {
            Notify.error( 'width (' + w + ') or height (' + w + ') makes frame buffer not bindable. Max RenderBuffer is "' + maxSize + '"' );
            return false;
        }

        return true;

    },

    apply: function ( state ) {

        if ( !this._gl ) this.setGraphicContext( state.getGraphicContext() );
        var gl = this._gl;

        var attachments = this._attachments;

        // if the fbo is created manually, we want to just bind it
        if ( attachments.length > 0 || this._fbo ) {

            if ( this.isDirty() ) {

                if ( !this._fbo )
                    this.createFrameBufferObject( state );

                this.bindFrameBufferObject();

                var hasRenderBuffer = false;

                for ( var i = 0, l = attachments.length; i < l; ++i ) {

                    var attachment = attachments[ i ];

                    // render buffer
                    if ( !attachment.texture ) {

                        if ( !this._checkAllowedSize( attachment.width, attachment.height ) ) {
                            this.releaseGLObjects();
                            return;
                        }

                        this._rbo = this.createRenderBuffer( attachment.format, attachment.width, attachment.height );
                        this.framebufferRenderBuffer( attachment.attachment, this._rbo );
                        hasRenderBuffer = true;

                    } else {

                        // use texture
                        var texture = attachment.texture;

                        if ( !this._checkAllowedSize( texture.getWidth(), texture.getHeight() ) ) {
                            this.releaseGLObjects();
                            return;
                        }

                        if ( !this.framebufferTexture2D( state, attachment.attachment, attachment.textureTarget, texture ) ) {
                            this.releaseGLObjects();
                            return;

                        }


                    }

                }

                this.checkStatus();

                // set it to null only if used renderbuffer
                if ( hasRenderBuffer )
                    gl.bindRenderbuffer( gl.RENDERBUFFER, null );

                this._dirty = false;

            } else {

                gl.bindFramebuffer( gl.FRAMEBUFFER, this._fbo );

                if ( Notify.reportWebGLError === true )
                    this.checkStatus();

            }

        } else {
            gl.bindFramebuffer( gl.FRAMEBUFFER, null );
        }
    }
} ) );


module.exports = FrameBufferObject;
