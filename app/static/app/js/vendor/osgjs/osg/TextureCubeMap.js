'use strict';
var MACROUTILS = require( 'osg/Utils' );
var Image = require( 'osg/Image' );
var Notify = require( 'osg/notify' );
var Texture = require( 'osg/Texture' );


/**
 * TextureCubeMap
 * @class TextureCubeMap
 * @inherits Texture
 */
var TextureCubeMap = function () {

    Texture.call( this );
    this._images = {};

    // pre allocated all textures faces slots
    for ( var i = 0; i < 6; i++ ) {
        this._images[ Texture.TEXTURE_CUBE_MAP_POSITIVE_X + i ] = new Image();
    }

};

/** @lends TextureCubeMap.prototype */
TextureCubeMap.prototype = MACROUTILS.objectLibraryClass( MACROUTILS.objectInherit( Texture.prototype, {

    setDefaultParameters: function () {
        Texture.prototype.setDefaultParameters.call( this );
        this._textureTarget = Texture.TEXTURE_CUBE_MAP;

        this._flipY = false;
    },

    cloneType: function () {
        return new TextureCubeMap();
    },

    setImage: function ( imageFace, img, imageFormat ) {

        var face = imageFace;

        if ( typeof face === 'string' )
            face = Texture[ face ];

        this._images[ face ].setImage( img, imageFormat );

        this.setImageFormat( imageFormat );
        this.setTextureSize( this._images[ face ].getWidth(), this._images[ face ].getHeight() );

        this._textureNull = false;
        this.dirty();
    },

    getImage: function ( face ) {
        return this._images[ face ].getImage();
    },

    initCubemapContent: function ( gl ) {

        var internalFormat = this._internalFormat;

        this.applyTexImage2D( gl, gl.TEXTURE_CUBE_MAP_POSITIVE_X, 0, internalFormat, this._textureWidth, this._textureHeight, 0, internalFormat, this._type, null );

        this.applyTexImage2D( gl, gl.TEXTURE_CUBE_MAP_NEGATIVE_X, 0, internalFormat, this._textureWidth, this._textureHeight, 0, internalFormat, this._type, null );

        this.applyTexImage2D( gl, gl.TEXTURE_CUBE_MAP_POSITIVE_Y, 0, internalFormat, this._textureWidth, this._textureHeight, 0, internalFormat, this._type, null );

        this.applyTexImage2D( gl, gl.TEXTURE_CUBE_MAP_NEGATIVE_Y, 0, internalFormat, this._textureWidth, this._textureHeight, 0, internalFormat, this._type, null );

        this.applyTexImage2D( gl, gl.TEXTURE_CUBE_MAP_POSITIVE_Z, 0, internalFormat, this._textureWidth, this._textureHeight, 0, internalFormat, this._type, null );

        this.applyTexImage2D( gl, gl.TEXTURE_CUBE_MAP_NEGATIVE_Z, 0, internalFormat, this._textureWidth, this._textureHeight, 0, internalFormat, this._type, null );

        return true;
    },

    // handle mipmap logic, if images for mipmap are provided or not
    generateMipmap: function ( gl, target ) {

        if ( !this.hasMipmapFilter() ) return;

        // manual mipmap provided
        if ( this._images[ Texture.TEXTURE_CUBE_MAP_POSITIVE_X ].hasMipmap() ) {

            for ( var face = 0; face < 6; face++ ) {
                var faceImage = this._images[ Texture.TEXTURE_CUBE_MAP_POSITIVE_X + face ];
                if ( !faceImage.hasMipmap() ) {
                    Notify.error( 'mipmap not set correctly for TextureCubemap' );
                }

                var internalFormat = this._internalFormat;
                for ( var level = 1; level < faceImage.getMipmap().length; level++ ) {
                    var size = faceImage.getMipmap()[ level ].getWidth();

                    this.applyTexImage2D( gl, gl.TEXTURE_CUBE_MAP_POSITIVE_X + face, level, internalFormat, size, size, 0, internalFormat, this._type, faceImage.getMipmap()[ level ].getImage() );
                }
            }

        } else {

            // automatic mipmap
            gl.generateMipmap( target );
        }

        this._dirtyMipmap = false;
    },

    applyImageTarget: function ( gl, internalFormat, target ) {

        var faceImage = this._images[ target ];

        if ( !faceImage.getImage() ) return 0;

        if ( !faceImage.isReady() ) return 0;

        if ( !faceImage.isDirty() ) return 1;

        this.setTextureSize( faceImage.getWidth(), faceImage.getHeight() );

        faceImage.setDirty( false );

        if ( faceImage.isTypedArray() ) {
            this.applyTexImage2D( gl,
                target,
                0,
                internalFormat,
                this._textureWidth,
                this._textureHeight,
                0,
                internalFormat,
                this._type,
                faceImage.getImage() );
        } else {
            this.applyTexImage2D( gl,
                target,
                0,
                internalFormat,
                internalFormat,
                this._type,
                faceImage.getImage() );
        }

        // release here only if no mipmap
        if ( this._unrefImageDataAfterApply &&
            !( this.hasMipmap() && faceImage.hasMipmap() ) ) {

            faceImage.release();
        }

        return 1;
    },

    initCubemapContentImage: function ( gl ) {

        var internalFormat = this._internalFormat;
        var valid = 0;
        valid += this.applyImageTarget( gl, internalFormat, gl.TEXTURE_CUBE_MAP_POSITIVE_X );
        valid += this.applyImageTarget( gl, internalFormat, gl.TEXTURE_CUBE_MAP_NEGATIVE_X );

        valid += this.applyImageTarget( gl, internalFormat, gl.TEXTURE_CUBE_MAP_POSITIVE_Y );
        valid += this.applyImageTarget( gl, internalFormat, gl.TEXTURE_CUBE_MAP_NEGATIVE_Y );

        valid += this.applyImageTarget( gl, internalFormat, gl.TEXTURE_CUBE_MAP_POSITIVE_Z );
        valid += this.applyImageTarget( gl, internalFormat, gl.TEXTURE_CUBE_MAP_NEGATIVE_Z );

        if ( valid === 6 )
            return true;

        return false;
    },

    apply: function ( state ) {

        var gl = state.getGraphicContext();
        // if need to release the texture
        if ( this._dirtyTextureObject )
            this.releaseGLObjects();

        if ( this._textureObject !== undefined && !this.isDirty() ) {
            this._textureObject.bind( gl );

            // If we have modified the texture via Rtt or texSubImage2D and _need_ updated mipmaps,
            // then we must regenerate the mipmaps explicitely.
            // In all other cases, don't set this flag because it can be costly
            if ( this.isDirtyMipmap() ) {
                this.generateMipmap( gl, this._textureTarget );
            }

        } else if ( this._textureNull ) {

            gl.bindTexture( this._textureTarget, null );

        } else {

            if ( !this._textureObject ) {

                // must be called before init
                this.computeTextureFormat();

                this.init( state );
            }
            this._textureObject.bind( gl );

            var valid;

            // no images it's must be a cubemap filled from rtt
            if ( !this._images[ Texture.TEXTURE_CUBE_MAP_POSITIVE_X ].getImage() ) {

                valid = this.initCubemapContent( gl );

            } else {

                valid = this.initCubemapContentImage( gl );

            }

            if ( valid ) {
                this._dirty = false;
                this.applyFilterParameter( gl, this._textureTarget );
                this.generateMipmap( gl, this._textureTarget );
            }
        } // render to cubemap not yet implemented
    }

} ), 'osg', 'TextureCubeMap' );

MACROUTILS.setTypeID( TextureCubeMap );

module.exports = TextureCubeMap;
