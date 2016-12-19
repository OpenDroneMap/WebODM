'use strict';
var Channel = require( 'osgAnimation/channel' );


// create Animation data
// Animation {
//     channels: [],
//     duration: 0.0;
//     name: string
// },

var animationCount = 0;

// assume that iniChannel has been called
// on each channel
var createAnimation = function ( channels, name ) {

    var min = Infinity;
    var max = -Infinity;
    for ( var i = 0; i < channels.length; i++ ) {
        min = Math.min( min, channels[ i ].start );
        max = Math.max( max, channels[ i ].end );
    }

    var duration = max - min;
    var animationName = name || ( 'animation' + animationCount.toString() );
    animationCount++;
    return {
        channels: channels,
        duration: duration,
        name: animationName,
        start: min
    };
};

// create instance Animation data. An instance animation
// contains instance channels instead of original channels
// Animation {
//     channels: [],
//     duration: 0.0;
//     start: 0.0, // used to know when an animation has been started
//     name: string
// },
var createInstanceAnimation = function ( animation ) {

    var channels = [];
    for ( var i = 0; i < animation.channels.length; i++ ) {
        var channel = Channel.createInstanceChannel( animation.channels[ i ] );
        channels.push( channel );
    }

    return {
        channels: channels,
        duration: animation.duration,
        start: 0.0,
        name: animation.name,
        firstKeyTime: animation.start
    };
};


var Animation = function () {};

Animation.createAnimation = createAnimation;
Animation.createInstanceAnimation = createInstanceAnimation;

module.exports = Animation;
