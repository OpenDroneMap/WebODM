'use strict';
var MACROUTILS = require( 'osg/Utils' );
var vec3 = require( 'osg/glMatrix' ).vec3;
var vec4 = require( 'osg/glMatrix' ).vec4;
var mat4 = require( 'osg/glMatrix' ).mat4;
var AutoTransform = require( 'osg/AutoTransform' );
var MatrixTransform = require( 'osg/MatrixTransform' );
var Shape = require( 'osg/shape' );
var Texture = require( 'osg/Texture' );
var BlendFunc = require( 'osg/BlendFunc' );
var quat = require( 'osg/glMatrix' ).quat;
var NodeVisitor = require( 'osg/NodeVisitor' );
var Node = require( 'osg/Node' );
/**
 *  @class Text: Text 2D using a Canvas2D as a texture for a textured quad.
 *  Notes: The OSGjs Text has been implemented like OSG osgText::Text as much as possible. However there are some
 *  things that should be noted:
 *  - This Text is far more simple than OSG ones, it only supports basic functionality.
 *  - In contrast to OSG, Text inherits from AutoTransform in osgjs.
 *  - Supported fonts are not the same in HTML than in OSG/C++.
 *  - Vertical layout is not supported right now.
 *  - BaseLine alignments are not supported, instead they are converted to supported ones if parsing a osgjs file.
 *  - Set the color in the range [ 0 - 1 ], as if you were working with OSG.
 *  - Texts are generated as a canvas 2D texture sticked in a quad. The size of the texture is the next power of two of the current size of the
 *    text so the bigger is your characterSize, the more memory it will consume.
 */
var Text = function ( text ) {
    AutoTransform.call( this );
    // create a canvas element
    this._canvas = document.createElement( 'canvas' );
    this._context = this._canvas.getContext( '2d' );
    this._matrixTransform = new MatrixTransform();
    this.addChild( this._matrixTransform );
    this._text = '';
    if ( text !== undefined ) this._text = text;
    this._font = 'monospace';
    // Vec4 value to load/return
    this._color = vec4.fromValues( 0.0, 0.0, 0.0, 1.0 );
    // This determines the text color, it can take a hex value or rgba value (e.g. rgba(255,0,0,0.5))
    this._fillStyle = 'rgba( 0, 0, 0, 1 )';
    // This determines the alignment of text, e.g. left, center, right
    this._context.textAlign = 'center';
    this._textX = undefined;
    // This determines the baseline of the text, e.g. top, middle, bottom
    this._context.baseLine = 'middle';
    this._textY = undefined;
    // Size of the textured quad in meters.
    this._characterSize = 1;
    this._characterSizeMode = Text.OBJECT_COORDS;
    // Font resolution
    this._fontSize = 32;
    this._geometry = undefined;
    this._autoRotateToScreen = false;
    this._position = vec3.create();
    this._layout = Text.LEFT_TO_RIGHT;
    this._alignment = Text.CENTER_CENTER;
    // NPOT textures
    this._forcePowerOfTwo = false;
    // Lazy initialization
    this._texture = new Texture();
    this.drawText();
    this._dirty = false;

    // We need to keep track of modelView Matrix
    this._previousModelView = mat4.create();
};

// CharacterSizeMode
Text.OBJECT_COORDS = 0;
Text.SCREEN_COORDS = 1;
Text.OBJECT_COORDS_WITH_MAXIMUM_SCREEN_SIZE_CAPPED_BY_FONT_HEIGHT = 2;

// Layout enum
Text.LEFT_TO_RIGHT = 'ltr';
Text.RIGHT_TO_LEFT = 'rtl';

// Alignment enum
Text.LEFT_TOP = 0;
Text.LEFT_CENTER = 1;
Text.LEFT_BOTTOM = 2;

Text.CENTER_TOP = 3;
Text.CENTER_CENTER = 4;
Text.CENTER_BOTTOM = 5;

Text.RIGHT_TOP = 6;
Text.RIGHT_CENTER = 7;
Text.RIGHT_BOTTOM = 8;

/** @lends Text.prototype */
Text.prototype = MACROUTILS.objectLibraryClass( MACROUTILS.objectInherit( AutoTransform.prototype, {

    drawText: function () {
        if ( this._geometry !== undefined ) {
            this._matrixTransform.removeChild( this._geometry );
            // The text could be dynamic, so we need to remove GL objects
            this._geometry.releaseGLObjects();
        }
        if ( !this._text ) return;
        this.setTextProperties();
        this._canvas.width = this._context.measureText( this._text ).width;
        this._canvas.height = this._fontSize * 2;
        // For devices not supporting NPOT textures
        if ( this._forcePowerOfTwo ) {
            this._canvas.width = this._nextPowerOfTwo( this._canvas.width );
            this._canvas.height = this._nextPowerOfTwo( this._canvas.height );
        }
        // We need to set the text properties again, as the canvas size cold change.
        this.setTextProperties();
        this._context.clearRect( 0, 0, this._canvas.width, this._canvas.height );
        this._context.fillText( this._text, this._textX, this._textY );
        // Right now we set the pivot point to center, to assure the bounding box is correct when rendering billboards.
        // TODO: Possibility to set different pivot point so we can have missing alignments.
        var aspectRatio = this._canvas.width / this._canvas.height;
        var quadWidth = this._characterSize * aspectRatio;
        this._geometry = Shape.createTexturedQuadGeometry( -quadWidth / 2, -this._characterSize / 2, 0, quadWidth, 0, 0, 0, this._characterSize, 0 );
        // create a texture to attach the canvas2D
        this._texture.setTextureSize( this._canvas.width, this._canvas.height );
        this._texture.setMinFilter( 'LINEAR' );
        this._texture.setMagFilter( 'LINEAR' );
        this._texture.setImage( this._canvas );
        // Transparency stuff
        var stateset = this._geometry.getOrCreateStateSet();
        stateset.setTextureAttributeAndModes( 0, this._texture );
        stateset.setRenderingHint( 'TRANSPARENT_BIN' );
        stateset.setAttributeAndModes( new BlendFunc( BlendFunc.ONE, BlendFunc.ONE_MINUS_SRC_ALPHA ) );
        this._matrixTransform.addChild( this._geometry );
        this.dirtyBound();
    },

    setText: function ( text ) {
        this._text = text;
        // Canvas size could change so we need to make it dirty.
        this._dirty = true;
    },

    getText: function () {
        return this._text;
    },

    setFont: function ( font ) {
        this._font = font;
        this._dirty = true;
    },

    setColor: function ( color ) {
        this._color = color;
        // Convert color to html range
        this._fillStyle = 'rgba(' + Math.round( color[ 0 ] * 255 ) + ',' + Math.round( color[ 1 ] * 255 ) + ',' + Math.round( color[ 2 ] * 255 ) + ',' + color[ 3 ] + ')';
        this._context.fillStyle = this._fillStyle;
        // Canvas size does not change so we don't need to redo the quad.
        this._context.fillText( this._text, this._textX, this._textY );
    },

    getColor: function () {
        return this._color;
    },

    setCharacterSize: function ( size ) {
        this._characterSize = size;
        if ( this._characterSizeMode !== Text.OBJECT_COORDS ) {
            mat4.fromScaling( this._matrixTransform.getMatrix(), [ this._characterSize, this._characterSize, this._characterSize ] );
            if ( this._characterSizeMode === Text.OBJECT_COORDS_WITH_MAXIMUM_SCREEN_SIZE_CAPPED_BY_FONT_HEIGHT )
                this.setMaximumScale( this._characterSize );
        }
        this._dirty = true;
    },

    getCharacterSize: function () {
        return this._characterSize;
    },

    setCharacterSizeMode: function ( mode ) {
        this._characterSizeMode = mode;
        if ( this._characterSizeMode !== Text.OBJECT_COORDS ) {
            mat4.fromScaling( this._matrixTransform.getMatrix(), [ this._characterSize, this._characterSize, this._characterSize ] );
            this.setAutoScaleToScreen( true );
            this.setMaximumScale( Number.MAX_VALUE );
            if ( this._characterSizeMode === Text.OBJECT_COORDS_WITH_MAXIMUM_SCREEN_SIZE_CAPPED_BY_FONT_HEIGHT )
                this.setMaximumScale( this._characterSize );
        } else {
            this._matrixTransform.setMatrix( mat4.create() );
            this.setAutoScaleToScreen( false );
        }
        this._dirty = true;
    },

    getCharacterSizeMode: function () {
        return this._characterSizeMode;
    },

    setFontResolution: function ( resolution ) {
        this._fontSize = resolution;
        this._dirty = true;
    },

    getFontResolution: function () {
        return this._fontSize;
    },

    setPosition: function ( position ) {
        this._position = position;
        mat4.fromTranslation( this.getMatrix(), position );
    },

    getPosition: function () {
        return this._position;
    },

    setTextProperties: function () {
        this._context.fillStyle = this._fillStyle;
        this._setAlignmentValues( this._alignment );
        this._context.font = this._fontSize + 'px ' + this._font;
        this._context.direction = this._layout;
    },

    setAutoRotateToScreen: function ( value ) {
        AutoTransform.prototype.setAutoRotateToScreen.call( this, value );
        this._dirty = true;
    },

    getAutoRotateToScreen: function () {
        return this._autoRotateToScreen;
    },

    setLayout: function ( layout ) {
        if ( typeof layout === 'string' ) {
            this._layout = Text[ layout ];
        } else {
            this._layout = layout;
        }
        this._dirty = true;
    },
    getLayout: function () {
        return this._layout;
    },
    setAlignment: function ( alignment ) {
        if ( typeof alignment === 'string' ) {
            this._alignment = Text[ alignment ];
        } else {
            this._alignment = alignment;
        }
        this._dirty = true;
    },
    getAlignment: function () {
        return this._alignment;
    },

    accept: ( function () {

        return function ( visitor ) {
            if ( this._dirty ) {
                this.drawText();
                this._dirty = false;
            }
            if ( visitor.getVisitorType() === NodeVisitor.CULL_VISITOR ) {

                var width = visitor.getViewport().width();
                var height = visitor.getViewport().height();
                var projMat = visitor.getCurrentProjectionMatrix();
                var modelViewMat = visitor.getCurrentModelViewMatrix();
                var position = this._position;
                var doUpdate = this._firstTimeToInitEyePoint;

                if ( !this._firstTimeToInitEyePoint ) {
                    if ( !mat4.exactEquals( modelViewMat, this._previousModelView ) ) {
                        doUpdate = true;
                    } else if ( width !== this._previousWidth || height !== this._previousHeight ) {
                        doUpdate = true;
                    } else if ( !mat4.exactEquals( projMat, this._previousProjection ) ) {
                        doUpdate = true;
                    } else if ( !vec3.exactEquals( position, this._previousPosition ) ) {
                        doUpdate = true;
                    }
                }
                this._firstTimeToInitEyePoint = false;
                if ( doUpdate ) {
                    if ( this._autoScaleToScreen ) {
                        var viewport = visitor.getViewport();
                        var psvector = this.computePixelSizeVector( viewport, projMat, modelViewMat );
                        var v = vec4.fromValues( this._position[ 0 ], this._position[ 1 ], this._position[ 2 ], 1.0 );
                        var pixelSize = vec4.dot( v, psvector );
                        pixelSize = 0.48 / pixelSize;
                        var size = 1.0 / pixelSize;
                        if ( this._autoScaleTransitionWidthRatio > 0.0 ) {
                            var c, b, a;
                            if ( this._minimumScale > 0.0 ) {
                                var j = this._minimumScale;
                                var i = ( this._maximumScale < Number.MAX_VALUE ) ?
                                    this._minimumScale + ( this._maximumScale - this._minimumScale ) * this._autoScaleTransitionWidthRatio :
                                    this._minimumScale * ( 1.0 + this._autoScaleTransitionWidthRatio );
                                c = 1.0 / ( 4.0 * ( i - j ) );
                                b = 1.0 - 2.0 * c * i;
                                a = j + b * b / ( 4.0 * c );
                                var k = -b / ( 2.0 * c );
                                if ( size < k ) size = this._minimumScale;
                                else if ( size < i ) size = a + b * size + c * ( size * size );
                            }
                            if ( this._maximumScale < Number.MAX_VALUE ) {
                                var n = this._maximumScale;
                                var m = ( this._minimumScale > 0.0 ) ?
                                    this._maximumScale + ( this._minimumScale - this._maximumScale ) * this._autoScaleTransitionWidthRatio :
                                    this._maximumScale * ( 1.0 - this._autoScaleTransitionWidthRatio );
                                c = 1.0 / ( 4.0 * ( m - n ) );
                                b = 1.0 - 2.0 * c * m;
                                a = n + b * b / ( 4.0 * c );
                                var p = -b / ( 2.0 * c );

                                if ( size > p ) size = this._maximumScale;
                                else if ( size > m ) size = a + b * size + c * ( size * size );
                            }
                        }
                        this.setScale( size );
                    }
                    if ( this._autoRotateToScreen ) {
                        var rotation = quat.create();
                        var modelView = visitor.getCurrentModelViewMatrix();
                        mat4.getRotation( rotation, modelView );
                        this.setRotation( quat.invert( rotation, rotation ) );
                    }
                    this._previousWidth = width;
                    this._previousHeight = height;
                    vec3.copy( this._previousPosition, position );
                    mat4.copy( this._previousProjection, projMat );
                    mat4.copy( this._previousModelView, modelViewMat );
                }
            }

            Node.prototype.accept.call( this, visitor );
        };
    } )(),
    _setAlignmentValues: function ( alignment ) {
        // Convert the OSG Api to js API
        switch ( alignment ) {
        case Text.LEFT_TOP:
            this._context.textAlign = 'left';
            this._textX = 0;
            this._context.textBaseline = 'top';
            this._textY = 0;
            break;
        case Text.LEFT_CENTER:
            this._context.textAlign = 'left';
            this._textX = 0;
            this._context.textBaseline = 'middle';
            this._textY = this._canvas.height / 2;
            break;
        case Text.LEFT_BOTTOM:
            this._context.textAlign = 'left';
            this._textX = 0;
            this._context.textBaseline = 'bottom';
            this._textY = this._canvas.height;
            break;
        case Text.CENTER_TOP:
            this._context.textAlign = 'center';
            this._textX = this._canvas.width / 2;
            this._context.textBaseline = 'top';
            this._textY = 0;
            break;
        case Text.CENTER_CENTER:
            this._context.textAlign = 'center';
            this._textX = this._canvas.width / 2;
            this._context.textBaseline = 'middle';
            this._textY = this._canvas.height / 2;
            break;
        case Text.CENTER_BOTTOM:
            this._context.textAlign = 'center';
            this._textX = this._canvas.width / 2;
            this._context.textBaseline = 'bottom';
            this._textY = this._canvas.height;
            break;
        case Text.RIGHT_TOP:
            this._context.textAlign = 'right';
            this._textX = this._canvas.width;
            this._context.textBaseline = 'top';
            this._textY = 0;
            break;
        case Text.RIGHT_CENTER:
            this._context.textAlign = 'right';
            this._textX = this._canvas.width;
            this._context.textBaseline = 'middle';
            this._textY = this._canvas.height / 2;
            break;
        case Text.RIGHT_BOTTOM:
            this._context.textAlign = 'right';
            this._textX = this._canvas.width;
            this._context.textBaseline = 'bottom';
            this._textY = this._canvas.height;
            break;
        }
    },
    setForcePowerOfTwo: function ( value ) {
        this._forcePowerOfTwo = value;
    },
    getForcePowerOfTwo: function () {
        return this._forcePowerOfTwo;
    },
    _nextPowerOfTwo: function ( value ) {
        var v = value;
        v--;
        v |= v >> 1;
        v |= v >> 2;
        v |= v >> 4;
        v |= v >> 8;
        v |= v >> 16;
        v++;
        return v;
    }
} ), 'osgText', 'Text' );

module.exports = Text;
