'use strict';
var MACROUTILS = require( 'osg/Utils' );
var Transform = require( 'osg/Transform' );
var CullSettings = require( 'osg/CullSettings' );
var mat4 = require( 'osg/glMatrix' ).mat4;
var Texture = require( 'osg/Texture' );
var TransformEnums = require( 'osg/transformEnums' );
var vec4 = require( 'osg/glMatrix' ).vec4;


/**
 * Camera - is a subclass of Transform which represents encapsulates the settings of a Camera.
 * @class Camera
 * @inherits Transform CullSettings
 */
var Camera = function () {
    Transform.call( this );
    CullSettings.call( this );

    this.viewport = undefined;
    this._graphicContext = undefined;
    this.setClearColor( vec4.fromValues( 0, 0, 0, 1.0 ) );
    this.setClearDepth( 1.0 );

    /*jshint bitwise: false */
    this.setClearMask( Camera.COLOR_BUFFER_BIT | Camera.DEPTH_BUFFER_BIT );
    /*jshint bitwise: true */

    this.setViewMatrix( mat4.create() );
    this.setProjectionMatrix( mat4.create() );
    this.renderOrder = Camera.NESTED_RENDER;
    this.renderOrderNum = 0;

    this._view = undefined;
    this._renderer = undefined;
    this._attachments = {};
};

Camera.PRE_RENDER = 0;
Camera.NESTED_RENDER = 1;
Camera.POST_RENDER = 2;

Camera.COLOR_BUFFER_BIT = 0x00004000;
Camera.DEPTH_BUFFER_BIT = 0x00000100;
Camera.STENCIL_BUFFER_BIT = 0x00000400;

/** @lends Camera.prototype */
Camera.prototype = MACROUTILS.objectLibraryClass( MACROUTILS.objectInherit(
    CullSettings.prototype,
    MACROUTILS.objectInherit( Transform.prototype, {
        // at which view this camera is attached
        getView: function () {
            return this._view;
        },

        setView: function ( view ) {
            this._view = view;
        },

        getRenderer: function () {
            return this._renderer;
        },

        setRenderer: function ( renderer ) {
            this._renderer = renderer;
        },

        // Set the final draw callback for custom operations
        // to be done after the drawing of
        // the camera's subgraph and pre render stages.
        setFinalDrawCallback: function ( cb ) {

            this._finalDrawCallback = cb;

        },

        getFinalDrawCallback: function () {

            return this._finalDrawCallback;

        },

        // Set the initial draw callback for custom operations
        // to be done before the drawing of
        // the camera's subgraph and pre render stages.
        setInitialDrawCallback: function ( cb ) {

            this._initialDrawCallback = cb;

        },

        getInitialDrawCallback: function () {

            return this._initialDrawCallback;

        },


        getAttachments: function () {
            return this._attachments;
        },

        setGraphicContext: function ( gc ) {
            this._graphicContext = gc;
        },
        getGraphicContext: function () {
            return this._graphicContext;
        },
        setClearDepth: function ( depth ) {
            this.clearDepth = depth;
        },
        getClearDepth: function () {
            return this.clearDepth;
        },

        setClearMask: function ( mask ) {
            this.clearMask = mask;
        },
        getClearMask: function () {
            return this.clearMask;
        },

        setClearColor: function ( color ) {
            this.clearColor = color;
        },
        getClearColor: function () {
            return this.clearColor;
        },

        setViewport: function ( vp ) {
            this.viewport = vp;
            this.getOrCreateStateSet().setAttributeAndModes( vp );
        },
        getViewport: function () {
            return this.viewport;
        },


        setViewMatrix: function ( matrix ) {
            this.modelviewMatrix = matrix;
        },
        setViewMatrixAsLookAt: function ( eye, center, up ) {
            mat4.lookAt( this.getViewMatrix(), eye, center, up );
        },
        setProjectionMatrix: function ( matrix ) {
            this.projectionMatrix = matrix;
        },

        /** Set to an orthographic projection. See OpenGL glOrtho for documentation further details.*/
        setProjectionMatrixAsOrtho: function ( left, right,
            bottom, top,
            zNear, zFar ) {
            mat4.ortho( this.getProjectionMatrix(), left, right, bottom, top, zNear, zFar );
        },
        isRenderToTextureCamera: function () {
            return window.Object.keys( this._attachments ).length > 0;
        },

        getViewMatrix: function () {
            return this.modelviewMatrix;
        },
        getProjectionMatrix: function () {
            return this.projectionMatrix;
        },
        getRenderOrder: function () {
            return this.renderOrder;
        },
        setRenderOrder: function ( order, orderNum ) {
            this.renderOrder = order;
            this.renderOrderNum = orderNum;
        },

        detachAll: function () {
            this._attachments = {};

            if ( this.frameBufferObject ) {
                this.frameBufferObject.dirty();
            }
        },

        // TODO: fix in case of shared fbo
        // TODO: fix adding a resize case
        resetAttachments: function () {


            if ( this.frameBufferObject ) {

                this.frameBufferObject.reset();
                // remove framebuffer
                this.frameBufferObject = 0;
            }

            // removes camera attachement
            this._attachments = {};

        },

        attachTexture: function ( bufferComponent, texture, textureTarget ) {
            if ( this.frameBufferObject ) {
                this.frameBufferObject.dirty();
            }

            // because before the argument was level and the spec says
            // it must always be 0 ! is valid for 0 or undefined
            if ( !textureTarget ) {
                textureTarget = Texture.TEXTURE_2D;
            }

            this._attachments[ bufferComponent ] = {
                'attachment': bufferComponent,
                'texture': texture,
                'textureTarget': textureTarget
            };
        },

        attachRenderBuffer: function ( bufferComponent, internalFormat ) {
            if ( this.frameBufferObject ) {
                this.frameBufferObject.dirty();
            }
            this._attachments[ bufferComponent ] = {
                'format': internalFormat,
                'attachment': bufferComponent
            };
        },

        computeLocalToWorldMatrix: function ( matrix /*,nodeVisitor*/ ) {
            if ( this.referenceFrame === TransformEnums.RELATIVE_RF ) {
                mat4.mul( matrix, matrix, this.modelviewMatrix );
            } else { // absolute
                mat4.copy( matrix, this.modelviewMatrix );
            }
            return true;
        },

        computeWorldToLocalMatrix: ( function () {
            var minverse = mat4.create();
            return function ( matrix /*, nodeVisitor */ ) {
                mat4.invert( minverse, this.modelviewMatrix );
                if ( this.referenceFrame === TransformEnums.RELATIVE_RF ) {
                    mat4.mul( matrix, minverse, matrix );
                } else {
                    mat4.copy( matrix, minverse );
                }
                return true;
            };
        } )()

    } ) ), 'osg', 'Camera' );

MACROUTILS.setTypeID( Camera );

module.exports = Camera;
