'use strict';
var vec3 = require( 'osg/glMatrix' ).vec3;
var quat = require( 'osg/glMatrix' ).quat;

var Target = require( 'osgAnimation/target' );
var channelType = require( 'osgAnimation/channelType' );


var Channel = {};

// channel {
//     keys: [],
//     times: [],
//     type: enum,
//     target: targetName
// }
// init a channel with extra field
// start, end, duration
var initChannel = function ( type, keys, times, targetName, channelName, channel ) {
    var start = times[ 0 ];
    var end = times[ times.length - 1 ];
    channel.start = start;
    channel.keys = keys;
    channel.end = end;
    channel.times = times;
    channel.type = type;
    channel.duration = end - start;
    channel.target = targetName;
    channel.name = channelName;
    return channel;
};

var createVec3Channel = function ( keys, times, targetName, channelName, chan ) {
    return initChannel( channelType.Vec3, keys, times, targetName, channelName, chan || {} );
};

var createFloatChannel = function ( keys, times, targetName, channelName, chan ) {
    return initChannel( channelType.Float, keys, times, targetName, channelName, chan || {} );
};

var createQuatChannel = function ( keys, times, targetName, channelName, chan ) {
    return initChannel( channelType.Quat, keys, times, targetName, channelName, chan || {} );
};

var createQuatSlerpChannel = function ( keys, times, targetName, channelName, chan ) {
    return initChannel( channelType.QuatSlerp, keys, times, targetName, channelName, chan || {} );
};

var createFloatCubicBezierChannel = function ( keys, times, targetName, channelName, chan ) {
    return initChannel( channelType.FloatCubicBezier, keys, times, targetName, channelName, chan || {} );
};

var createVec3CubicBezierChannel = function ( keys, times, targetName, channelName, chan ) {
    return initChannel( channelType.Vec3CubicBezier, keys, times, targetName, channelName, chan || {} );
};


// channel contains {
//     keys: [],
//     times: [],
//     start: 0.0,
//     end: 1.0,
// }
// return {
//     channel: channel,
//     value: vec3.create(),
//     targetID: int,
//     key: 0,
//     t: 0, //global start time
// }

var Float = {
    create: function () {
        return 0;
    }
};
var Vec3 = {
    create: function () {
        return vec3.create32();
    }
};
var Quat = {
    create: function () {
        return quat.create32();
    }
};


var createInstanceChannelType = function ( operator, channel ) {
    return {
        channel: channel,
        value: operator.create(),
        targetID: Target.InvalidTargetID,
        weight: 1.0,
        key: 0,
        start: 0.0,
        end: 0.0
    };
};

var createInstanceVec3Channel = function ( channel ) {
    return createInstanceChannelType( Vec3, channel );
};

var createInstanceQuatChannel = function ( channel ) {
    return createInstanceChannelType( Quat, channel );
};

var createInstanceFloatChannel = function ( channel ) {
    return createInstanceChannelType( Float, channel );
};

var createInstanceFloatCubicBezierChannel = function ( channel ) {
    return createInstanceChannelType( Float, channel );
};

var createInstanceVec3CubicBezierChannel = function ( channel ) {
    return createInstanceChannelType( Vec3, channel );
};


// create an instance channel from type
var createInstanceChannel = function ( channel ) {
    return Channel[ channel.type ]( channel );
};

// animations instances
/*

 |-----------------| anim0 (channel0_0, channel0_1 )
           |--------------| anim1 (channel1_0, channel1_1, channel1_2 )

 // si triage a cause de la priorité
 // iterate on priority
 // and for animations of the same priority


 // init d'une animation

 // init du manager
 //   createInstanceAnimation pour chaque animations
 //      createInstanceChannels pour chaque animation

 //   initChannelTargetID pour toute les animations du manager
 //      id -> targetName


 // get target for an animation to push on target list ( to blend )
 var targets = {};
 for ( var i = 0 ; i < channels.length; i++ ) {
    var target = channels[i].target;
    targets[target].push( channels[i] );
 }


 // pour l'instant on ignore les pb d'organisation de priorité
 //
 // target X : [
 //      ChannelAnima0_0
 //      ChannelAnima1_0
 // ]

 // target Y : [
 //      ChannelAnima0_1
 //      ChannelAnima1_1
 // ]


 */


// for a target compute each channel contribution
// channel0, value0, w, priority0
// channel1, value1, w, priority0
// channel2, value2, w, priority0


// channel0, value0, w, priority1
// channel1, value1, w, priority1
// channel2, value2, w, priority1

/*

 var value;
 Copy( channels[0].value, value );
 var weight = 0.0;
 var priority = channels[0].priority;
 var priorityWeight = channels[0].weight;

 for ( var i = 1; i < channels.length; i++ ) {

     if ( priority !== channels[i].priority ) {
          weight += priorityWeight * ( 1.0 - weight );
          priorityWeight = 0.0;
          priority = channels[i].priority;
     }

     priorityWeight += weight;
     t = ( 1.0 - weight ) * channels[i].weight / priorityWeight;
     lerp( t, value, channels[i].value );
 }


 // second version

 var value;
 Copy( channels[0].value, value );
 var weight = 0; //channels[0].weight;
 //var priority = channels[0].priority;
 var priorityWeight = 0;

 for ( var i = 0; i < channels.length; i++ ) {

     if ( priority !== channels[i].priority ) {
          weight += priorityWeight * ( 1.0 - weight );
          priorityWeight = 0.0;
          priority = channels[i].priority;
     }

     priorityWeight += weight;
     t = ( 1.0 - weight ) * channels[i].weight / priorityWeight;
     lerp( t, value, channels[i].value );
 }


 */

Channel.createInstanceChannel = createInstanceChannel;
Channel.createInstanceVec3Channel = createInstanceVec3Channel;
Channel.createInstanceQuatChannel = createInstanceQuatChannel;
Channel.createInstanceQuatSlerpChannel = createInstanceQuatChannel;
Channel.createInstanceFloatChannel = createInstanceFloatChannel;
Channel.createInstanceFloatCubicBezierChannel = createInstanceFloatCubicBezierChannel;
Channel.createInstanceVec3CubicBezierChannel = createInstanceVec3CubicBezierChannel;

Channel.createVec3Channel = createVec3Channel;
Channel.createQuatChannel = createQuatChannel;
Channel.createQuatSlerpChannel = createQuatSlerpChannel;
Channel.createFloatChannel = createFloatChannel;
Channel.createFloatCubicBezierChannel = createFloatCubicBezierChannel;
Channel.createVec3CubicBezierChannel = createVec3CubicBezierChannel;

Channel[ channelType.Vec3 ] = createInstanceVec3Channel;
Channel[ channelType.Quat ] = createInstanceQuatChannel;
Channel[ channelType.QuatSlerp ] = createInstanceQuatChannel;
Channel[ channelType.Float ] = createInstanceFloatChannel;
Channel[ channelType.FloatCubicBezier ] = createInstanceFloatCubicBezierChannel;
Channel[ channelType.Vec3CubicBezier ] = createInstanceVec3CubicBezierChannel;

Channel.ChannelType = channelType;


module.exports = Channel;
