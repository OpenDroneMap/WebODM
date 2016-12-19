'use strict';
var P = require( 'bluebird' );
var MACROUTILS = require( 'osg/Utils' );
var Image = require( 'osg/Image' );


var ImageStream = function ( video ) {
    Image.call( this, video );
    this._canPlayDefered = undefined;
};

ImageStream.PAUSE = 0;
ImageStream.PLAYING = 1;

ImageStream.prototype = MACROUTILS.objectLibraryClass( MACROUTILS.objectInherit( Image.prototype, {

    isDirty: function () {
        return this._status === ImageStream.PLAYING; // video is dirty if playing
    },

    setImage: function ( video ) {
        Image.prototype.setImage.call( this, video );

        this._status = ImageStream.STOP;

        // event at the end of the stream
        video.addEventListener( 'ended', function () {
            if ( !this._imageObject.loop )
                this.stop();
        }.bind( this ), true );

        this.dirty();
    },

    setLooping: function ( bool ) {
        this._imageObject.loop = bool;
    },

    play: function () {
        this._imageObject.play();
        this._status = ImageStream.PLAYING;
    },

    stop: function () {
        this._imageObject.pause();
        this._status = ImageStream.PAUSE;
    },

    whenReady: function () {

        if ( !this._imageObject ) {
            return P.reject();
        }

        if ( !this._canPlayDefered ) {
            this._canPlayDefered = P.defer();
            this._imageObject.addEventListener( 'canplaythrough', this._canPlayDefered.resolve.bind( this._canPlayDefered, this ), true );
        }

        return this._canPlayDefered.promise;
    }


} ), 'osg', 'ImageStream' );

MACROUTILS.setTypeID( ImageStream );

module.exports = ImageStream;
