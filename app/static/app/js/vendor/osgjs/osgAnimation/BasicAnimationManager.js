'use strict';
var Notify = require( 'osg/notify' );
var MACROUTILS = require( 'osg/Utils' );
var BaseObject = require( 'osg/Object' );
var quat = require( 'osg/glMatrix' ).quat;
var vec3 = require( 'osg/glMatrix' ).vec3;
var mat4 = require( 'osg/glMatrix' ).mat4;
var Channel = require( 'osgAnimation/channel' );
var Animation = require( 'osgAnimation/animation' );
var Interpolator = require( 'osgAnimation/interpolator' );
var CollectAnimationUpdateCallbackVisitor = require( 'osgAnimation/CollectAnimationUpdateCallbackVisitor' );
var Target = require( 'osgAnimation/target' );
var UpdateMorph = require( 'osgAnimation/UpdateMorph' );


var Float = {
    lerp: function ( a, b, t ) {
        return a + ( b - a ) * t;
    },
    init: function () {
        return 0.0;
    },
    copy: function ( src ) {
        return src;
    },
    create: function () {
        return 0.0;
    }
};

var TypeToSize = [];
TypeToSize[ Channel.ChannelType.Float ] = 1;
TypeToSize[ Channel.ChannelType.FloatCubicBezier ] = 1;
TypeToSize[ Channel.ChannelType.Vec3 ] = 3;
TypeToSize[ Channel.ChannelType.Vec3CubicBezier ] = 3;
TypeToSize[ Channel.ChannelType.Quat ] = 4;
TypeToSize[ Channel.ChannelType.QuatSlerp ] = 4;
TypeToSize[ Channel.ChannelType.Matrix ] = 16;


var ResultType = [];
ResultType.length = Channel.ChannelType.Count;
ResultType[ Channel.ChannelType.Vec3 ] = vec3;
ResultType[ Channel.ChannelType.Quat ] = quat;
ResultType[ Channel.ChannelType.QuatSlerp ] = quat;
ResultType[ Channel.ChannelType.Float ] = Float;
ResultType[ Channel.ChannelType.FloatCubicBezier ] = Float;
ResultType[ Channel.ChannelType.Vec3CubicBezier ] = vec3;
ResultType[ Channel.ChannelType.Matrix ] = mat4;

/**
 *  BasicAnimationManager
 *  @class BasicAnimationManager
 */
var BasicAnimationManager = function () {
    BaseObject.call( this );

    this._simulationTime = 0.0;
    this._pauseTime = 0.0;
    this._timeFactor = 1.0;
    this._startTime = 0.0;

    // contains a map with instance animations
    this._instanceAnimations = {};

    // animations to start
    this._startAnimations = {};

    // target contains an array of all target for this manager
    // index in the array is used as ID
    // see Animation.createTarget
    // [
    //     { id: 0,
    //       channels: [],
    //       value: 0.0,
    //       defaultValue: 0.0,
    //       type
    //     },
    //     ...
    // ];
    this._targets = [];
    this._targetsMap = {};

    // target id with active lists
    // [
    //   vec3: [ targetID0, targetID1 ]
    //   Quat: [ targetID2, targetID3,  ... ]
    //   Float: [ ... ]
    // ]
    this._targetsByTypes = [];
    this._targetsByTypes.length = Channel.ChannelType.Count;
    for ( var i = 0, ni = this._targetsByTypes.length; i < ni; i++ ) {
        this._targetsByTypes[ i ] = [];
    }

    // current playing animations
    this._activeAnimations = {};
    this._activeAnimationList = [];

    // current actives channels by types
    //   [ chanel0, channel1, ... ] // vec3 type
    //   [ chanel2, channel3, ... ] // Quat type
    //   [ chanel5, channel6, ... ] // Float type
    this._activeChannelsByTypes = [];
    this._activeChannelsByTypes.length = Channel.ChannelType.Count;
    for ( var j = 0, nj = this._activeChannelsByTypes.length; j < nj; j++ ) {
        this._activeChannelsByTypes[ j ] = [];
    }

    // assign all target/channel in animationCallback
    // then they can read it directly
    // animation callback to update
    this._animationsUpdateCallback = {};
    this._animationsUpdateCallbackArray = [];

    // queue of animations to register
    this._animationsToRegister = [];

    //Pause status (true / false)
    this._pause = false;

    this._dirty = false;

    this._seekTime = -1;
};

BasicAnimationManager.prototype = MACROUTILS.objectInherit( BaseObject.prototype, {

    init: function ( animations ) {

        // reset all
        this._simulationTime = 0.0;
        this._pauseTime = 0.0;
        this._timeFactor = 1.0;
        this._startTime = 0.0;

        // contains a map with instance animations
        this._instanceAnimations = {};

        // animations to start
        this._startAnimations = {};

        this._resetTargets();

        this._activeAnimations = {};
        this._activeAnimationList.length = 0;

        for ( var i = 0, ni = this._activeChannelsByTypes.length; i < ni; i++ )
            this._activeChannelsByTypes[ i ].length = 0;

        this._animationsUpdateCallback = {};
        this._animationsUpdateCallbackArray.length = 0;

        this._pause = false;
        this._seekTime = -1;

        // add animations
        this.addAnimations( animations );
    },


    // push all animations into the queue
    addAnimations: function ( animations ) {

        var instanceAnimationList = this._addAnimation( animations );

        // qeue them to assign target
        Array.prototype.push.apply( this._animationsToRegister, instanceAnimationList );
        this._dirty = true;
        this._registerAnimations();
    },


    update: function ( node, nv ) {

        if ( this._dirty ) {
            this._findAnimationUpdateCallback( node );
            this._registerTargetFoundInAnimationCallback();
            this._registerAnimations();
        }

        var t = nv.getFrameStamp().getSimulationTime();

        if ( this._seekTime !== -1 )
            this._pauseTime = -this._seekTime + this._startTime + t;
        this._seekTime = -1;

        if ( !this._pause ) { // Not in pause
            this._simulationTime = this._startTime + ( t - this._pauseTime );
        } else {
            this._pauseTime = ( t - this._simulationTime + this._startTime );
        }

        this.updateManager( this._simulationTime * this._timeFactor );
        return true;
    },

    updateManager: function ( t ) {


        // adds active animations / channels requested
        //
        this._processStartAnimation( t );

        var l = Channel.ChannelType.Count;
        // update all actives channels by type
        //
        for ( var i = 0; i < l; i++ ) {
            var activeChannelType = this._activeChannelsByTypes[ i ];
            this._updateChannelsType( t, activeChannelType, Interpolator[ i ] );
        }

        // update targets
        //
        for ( var j = 0; j < l; j++ ) {
            var targetType = this._targetsByTypes[ j ];
            this._updateTargetType( targetType, ResultType[ j ] );
        }


        // update all animation callback
        // expect to have UpdateMatrixTransform
        for ( var k = 0, nk = this._animationsUpdateCallbackArray.length; k < nk; k++ ) {
            var animCallback = this._animationsUpdateCallbackArray[ k ];
            animCallback.computeChannels();
        }

        // check animation finished
        this._removeFinishedAnimation( t );
    },

    togglePause: function () { //Pause the manager's time
        this._pause = !this._pause;
        // if we resume an animation we don't want to move forward the animation
        if ( !this._pause )
            this._seekTime = this._simulationTime;
    },

    getSimulationTime: function () {
        return this._simulationTime;
    },

    setSimulationTime: function ( t ) {
        this._simulationTime = t;
    },

    setSeekTime: function ( t ) {
        this._simulationTime = t;
        this._seekTime = t;
    },

    stopAnimation: function ( name ) {
        var activeAnimationList = this._activeAnimationList;
        for ( var i = 0, nbAnim = activeAnimationList.length; i < nbAnim; ++i ) {
            if ( activeAnimationList[ i ].name === name ) {
                this._removeActiveChannels( this._instanceAnimations[ name ] );
                this._activeAnimations[ name ] = undefined;
                activeAnimationList.splice( i, 1 );
                return;
            }
        }
    },

    stopAllAnimation: function () {
        var activeAnimationList = this._activeAnimationList;
        for ( var i = 0, nbAnim = activeAnimationList.length; i < nbAnim; ++i ) {
            var name = activeAnimationList[ i ].name;
            this._removeActiveChannels( this._instanceAnimations[ name ] );
            this._activeAnimations[ name ] = undefined;
        }
        activeAnimationList.length = 0;
    },

    setTimeFactor: function ( timeFactor ) {
        var tf = timeFactor / this._timeFactor;
        this._startTime += ( this._simulationTime - this._simulationTime * tf ) / tf;

        this._timeFactor = timeFactor;

        if ( this._pause )
            this._simulationTime += ( this._simulationTime - this._simulationTime * tf ) / tf;
    },

    getTimeFactor: function () {
        return this._timeFactor;
    },

    isPlaying: function ( name ) {
        if ( this._activeAnimations[ name ] ) return true;
        return false;
    },

    // play animation using object as config
    // {
    //     name: string,
    //     priority: 0,
    //     weight: 1.0,
    //     loop: true / false
    // }
    playAnimationObject: function ( obj ) {

        var anim = this._instanceAnimations[ obj.name ];
        if ( !anim ) {
            Notify.info( 'no animation ' + obj.name + ' found' );
            return;
        }

        if ( this.isPlaying( obj.name ) ) return;

        anim.priority = ( obj.priority === undefined ) ? 0 : obj.priority;
        anim.weight = ( obj.weight === undefined ) ? 1.0 : obj.weight;
        anim.loop = ( obj.loop === undefined ) ? true : obj.loop;

        this._startAnimations[ anim.name ] = anim;
    },

    // if first argument is an object
    // playAnimationObject is called instead
    playAnimation: function ( name, loop, priority, weight ) {

        var animationObject;
        if ( typeof name === 'object' )
            animationObject = name;
        else {
            animationObject = {
                name: name,
                priority: priority,
                weight: weight,
                loop: loop
            };
        }

        return this.playAnimationObject( animationObject );
    },

    getAnimations: function () {
        return this._instanceAnimations;
    },


    _registerAnimations: function () {

        if ( !this._targets.length ) return;

        for ( var i = 0, ni = this._animationsToRegister.length; i < ni; i++ ) {
            var instanceAnimation = this._animationsToRegister[ i ];
            this._registerInstanceAnimation( instanceAnimation );
        }

        this._animationsToRegister.length = 0;
        this._dirty = false;
    },

    // Register animation
    //
    // Register animation list all target from channel in the animations and associate
    // target found in the scenegraph. If no target are registered animation cant be
    // registered. In this case animation will be pending and resolved after a visitor
    // extract target.
    _registerInstanceAnimation: function ( instanceAnimation ) {

        var instanceChannels = instanceAnimation.channels;
        for ( var i = 0, ni = instanceChannels.length; i < ni; i++ ) {
            var instanceChannel = instanceChannels[ i ];
            var targetName = instanceChannel.channel.target;
            var name = instanceChannel.channel.name;
            var uniqueTargetName = targetName + '.' + name;

            // disply a warning if animation has a channel but not target found in the
            // scene graph. We could probably optimize and removes those channels, but
            // it must be a user decision in case the user plugin different scene
            // graph together and target would appear later in the scenegraph
            if ( !this._targetMap[ uniqueTargetName ] ) {
                Notify.warn( 'registerInstanceAnimation did not find targetName (' + uniqueTargetName + ') in the scene graph' );
                continue;
            }

            instanceChannel.targetID = this._targetMap[ uniqueTargetName ].id;
        }
        return true;
    },

    _findAnimationUpdateCallback: function ( node ) {
        var collector = new CollectAnimationUpdateCallbackVisitor();
        node.accept( collector );
        this._animationsUpdateCallback = collector.getAnimationUpdateCallbackMap();
    },

    // assignTargetToAnimationCallback
    //
    // check all animationUpdateCallback collected and try to
    // assign the channel instance registered in the manager. If a
    // animationUpdateCallback contains channels not known by the
    // manager we skip it.  It means that it should be called
    // after the animations has been registered into the animation
    // manager
    _registerTargetFoundInAnimationCallback: function () {

        this._resetTargets();

        var targetID = 0;
        var targetMap = this._targetMap;
        var targets = this._targets;

        var registerTarget = function ( uniqueTargetName, target, name ) {
            if ( !targetMap[ uniqueTargetName ] ) {
                targetMap[ uniqueTargetName ] = target;
                // assign an id that will be an index into a array
                target.id = targetID++;
                targets.push( target );

                var type = target.type; // split by type
                this._targetsByTypes[ type ].push( target );
            } else {
                // detect differents target instance with same
                // unique target name. It's a problem
                if ( target !== targetMap[ uniqueTargetName ] )
                    Notify.warn( 'detected differents target instance with the same name (' + name + ')' );
            }
        }.bind( this );


        var target;
        var name;
        var uniqueTargetName;

        var animationCallbackMap = this._animationsUpdateCallback;
        var keys = window.Object.keys( animationCallbackMap );
        for ( var i = 0, ni = keys.length; i < ni; i++ ) {
            var key = keys[ i ];
            var animationCallback = animationCallbackMap[ key ];

            // handle UpdateBone and UpdateMatrixTransform but not stateSet
            if ( animationCallback.getStackedTransforms && animationCallback.getStackedTransforms().length ) {
                this._animationsUpdateCallbackArray.push( animationCallback );

                var stackedTransforms = animationCallback.getStackedTransforms();
                for ( var j = 0, nj = stackedTransforms.length; j < nj; j++ ) {
                    var stackedTransform = stackedTransforms[ j ];
                    target = stackedTransform.getTarget();
                    name = stackedTransform.getName();
                    uniqueTargetName = animationCallback.getName() + '.' + name;

                    registerTarget( uniqueTargetName, target, name );
                }
            } else if ( animationCallback instanceof UpdateMorph ) {
                for ( var t = 0, numTarget = animationCallback.getNumTarget(); t < numTarget; t++ ) {
                    name = animationCallback.getTargetName( t );
                    uniqueTargetName = name + '.' + t;
                    target = animationCallback.getTarget( t );

                    registerTarget( uniqueTargetName, target, name );
                }
            }
        }
    },

    _addAnimation: function ( animations ) {

        var instanceAnimationList = [];
        for ( var i = 0, ni = animations.length; i < ni; i++ ) {

            var animation = animations[ i ];
            var animationName = animation.name;

            if ( this._instanceAnimations[ animationName ] )
                continue;

            var instanceAnimation = Animation.createInstanceAnimation( animation );
            this._instanceAnimations[ animationName ] = instanceAnimation;
            instanceAnimationList.push( instanceAnimation );
        }

        return instanceAnimationList;
    },

    // add channels from instance animation to the active channels list
    _addActiveChannels: function ( t, instanceAnimation ) {

        var instanceChannels = instanceAnimation.channels;
        for ( var i = 0, ni = instanceChannels.length; i < ni; i++ ) {
            var instanceChannel = instanceChannels[ i ];
            var type = instanceChannel.channel.type;
            instanceChannel.t = t; // reset time
            instanceChannel.instanceAnimation = instanceAnimation; // link with parent animation
            var targetID = instanceChannel.targetID;

            if ( targetID === Target.InvalidTargetID ) continue;

            this._activeChannelsByTypes[ type ].push( instanceChannel );
            this._targets[ targetID ].channels.push( instanceChannel );
        }

    },

    _removeActiveChannels: function ( instanceAnimation ) {

        var instanceChannels = instanceAnimation.channels;
        for ( var i = 0, ni = instanceChannels.length; i < ni; i++ ) {
            var instanceChannel = instanceChannels[ i ];
            var type = instanceChannel.channel.type;
            var targetID = instanceChannel.targetID;

            if ( targetID === Target.InvalidTargetID ) continue;

            // remove channel instance from targetID channel list
            var targetChannelsList = this._targets[ targetID ].channels;
            var index = targetChannelsList.indexOf( instanceChannel );
            targetChannelsList.splice( index, 1 );

            // remove channel from active channels
            var channelTypeList = this._activeChannelsByTypes[ type ];
            var channelIndex = channelTypeList.indexOf( instanceChannel );
            channelTypeList.splice( channelIndex, 1 );
        }

    },

    // blend value from each channels for each target
    // or copy default value if not updated by an active animation
    _updateTargetType: function ( targetList, operatorType ) {

        for ( var i = 0, ni = targetList.length; i < ni; i++ ) {

            var target = targetList[ i ];
            var affectedChannels = target.channels;
            var nbChannels = affectedChannels.length;
            // note operatorType operations doesn't always operate on arrays (float)
            // so we can't simply assume that target.value is an array so we need
            // to write "target.value = ..."

            if ( nbChannels === 0 ) { // no blending ?
                target.value = operatorType.copy( target.defaultValue, target.value );

            } else if ( nbChannels === 1 ) {
                target.value = operatorType.copy( affectedChannels[ 0 ].value, target.value );

            } else {

                // blend between multiple channels
                target.value = operatorType.init( target.value );
                var accumulatedWeight = 0.0;

                // it's the same as targetOut = (v0 * w0 + v1 * w1 + ...) / (w0 + w1 + ...)
                for ( var j = 0, nj = affectedChannels.length; j < nj; j++ ) {

                    var achannel = affectedChannels[ j ];
                    var weight = achannel.weight;
                    accumulatedWeight += weight;
                    // avoid divide by zero and useless lerp
                    if ( accumulatedWeight === 0.0 || weight === 0.0 )
                        continue;

                    var ratio = weight / accumulatedWeight;
                    target.value = operatorType.lerp( target.value, target.value, achannel.value, ratio );
                }
            }
        }
    },

    _updateChannelsType: function ( t, channels, interpolator ) {

        for ( var i = 0, ni = channels.length; i < ni; i++ ) {
            var channel = channels[ i ];
            var instanceAnimation = channel.instanceAnimation;
            var loop = instanceAnimation.loop;

            var tLocal = t - channel.t;

            // handle loop, careful in case animation is one frame
            if ( loop && instanceAnimation.duration > 0.0 ) tLocal = tLocal % instanceAnimation.duration;

            interpolator( tLocal + instanceAnimation.firstKeyTime, channel );
        }
    },

    _removeFinishedAnimation: function ( t ) {

        var activeAnimationList = this._activeAnimationList;

        var i = 0;
        while ( i < activeAnimationList.length ) {
            var instanceAnimation = activeAnimationList[ i ];
            var name = instanceAnimation.name;

            if ( t > instanceAnimation.end && instanceAnimation.loop === false ) {
                this._removeActiveChannels( instanceAnimation );
                this._activeAnimations[ name ] = undefined;
                activeAnimationList.splice( i, 1 );
            } else {
                i++;
            }
        }
    },

    _addActiveAnimation: function ( t, cmd ) {

        this._activeAnimations[ cmd.name ] = cmd; // set animation in the list of active one

        var instanceAnimation = this._instanceAnimations[ cmd.name ];
        instanceAnimation.start = t;
        instanceAnimation.end = t + instanceAnimation.duration;
        this._addActiveChannels( t, instanceAnimation );

        // keep track of instance animation active in a list
        this._activeAnimationList.push( instanceAnimation );
    },

    // execute start animations events
    // during the updateManager
    _processStartAnimation: function ( t ) {

        // dont really start animation if we dont have yet targets
        if ( !this._targets.length ) return;

        var animations = this._startAnimations;
        var keys = window.Object.keys( animations );
        for ( var i = 0, ni = keys.length; i < ni; i++ ) {
            var key = keys[ i ];
            var cmd = animations[ key ];
            var name = cmd.name;

            if ( this.isPlaying( name ) )
                continue;

            this._addActiveAnimation( t, cmd );
        }

        if ( keys.length ) this._startAnimations = {};
    },

    _resetTargets: function () {

        this._targetMap = {};
        this._targets.length = 0;

        for ( var i = 0, ni = this._targetsByTypes.length; i < ni; i++ ) {
            this._targetsByTypes[ i ].length = 0;
        }

    },

    resetAllStackedTransforms: function () {
        var anims = this._animationsUpdateCallbackArray;
        for ( var i = 0, nbAnims = anims.length; i < nbAnims; i++ ) {
            var stacked = anims[ i ].getStackedTransforms();
            for ( var j = 0, nbStacked = stacked.length; j < nbStacked; j++ ) {
                stacked[ j ].resetToDefaultValue();
            }

            // computeChannels is not mandatory here as the following frame will call
            // this function anyway
            anims[ i ].computeChannels();
        }
    },

    setAnimationLerpEndStart: function ( anim, lerpDuration ) {
        var channels = anim.channels;
        if ( anim.originalDuration === undefined )
            anim.originalDuration = anim.duration;

        anim.duration = anim.originalDuration + lerpDuration;

        var firstKey = anim.firstKeyTime;
        var animDuration = anim.originalDuration;

        for ( var i = 0, nbChannels = channels.length; i < nbChannels; ++i ) {
            var ch = channels[ i ].channel;

            // compare first and last key and detect if we can loop the channel or not
            // it uses an arbitrary epsilon
            if ( Math.abs( ch.start - firstKey ) > 0.01 || Math.abs( ch.duration - animDuration ) > 0.01 )
                continue;

            // update channel end time
            if ( ch.originalEnd === undefined )
                ch.originalEnd = ch.end;

            ch.end = ch.originalEnd + lerpDuration;

            // add or remove additonal key and time

            var sizeElt = TypeToSize[ ch.type ];
            var size = ch.times.buffer.byteLength / 4;

            // no lerp between end and start
            if ( lerpDuration === 0.0 ) {

                ch.keys = new Float32Array( ch.keys.buffer, 0, ( size - 1 ) * sizeElt );
                ch.times = new Float32Array( ch.times.buffer, 0, size - 1 );

            } else {

                // take full size of buffer (with additional keys)
                ch.keys = new Float32Array( ch.keys.buffer, 0, size * sizeElt );
                // copy first key
                var idLast = ( size - 1 ) * sizeElt;
                for ( var j = 0; j < sizeElt; ++j )
                    ch.keys[ idLast + j ] = ch.keys[ j ];

                ch.times = new Float32Array( ch.times.buffer, 0, size );
                ch.times[ size - 1 ] = ch.times[ size - 2 ] + lerpDuration;
            }
        }
    }

} );

BasicAnimationManager.TypeToSize = TypeToSize;

module.exports = BasicAnimationManager;
