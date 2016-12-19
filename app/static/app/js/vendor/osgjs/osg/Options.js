'use strict';
var MACROUTILS = require( 'osg/Utils' );

var OptionsDefault = {
    'antialias': true, // activate MSAA
    //'overrideDevicePixelRatio': 1, // if specified override the device pixel ratio
    'fullscreen': true,
    'enableFrustumCulling': false,
    'stats': false, // display canvas with stats for the viewer
    'scrollwheel': true,
    'webgl2': false
};

var Options = function () {

    window.Object.keys( OptionsDefault ).forEach( function ( key ) {
        this[ key ] = OptionsDefault[ key ];
    }.bind( this ) );

};


Options.prototype = {

    extend: function ( options ) {
        MACROUTILS.objectMix( this, options );
        return this;
    },

    get: function ( key ) {
        return this[ key ];
    },

    getBoolean: function ( key ) {
        var val = this.getString( key );
        if ( val ) return ( val !== 'false' && val !== '0' );
        return undefined;
    },

    getNumber: function ( key ) {
        var val = this[ key ];
        if ( val ) return Number( val );
        return undefined;
    },

    getString: function ( key ) {
        var val = this[ key ];
        if ( val !== undefined ) return this[ key ].toString();
        return undefined;
    }

};

module.exports = Options;
