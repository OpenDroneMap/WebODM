'use strict';
var mat4 = require( 'osg/glMatrix' ).mat4;
var quat = require( 'osg/glMatrix' ).quat;
var vec3 = require( 'osg/glMatrix' ).vec3;
var channelType = require( 'osgAnimation/channelType' );


var target = {};
target.InvalidTargetID = -1;

// defaultValue is used when no channels affect the value
var createTarget = function ( type, value, defaultValue ) {
    return {
        type: type,
        id: target.InvalidTargetID, // -1 means no id assigned yet
        channels: [],
        value: value,
        defaultValue: defaultValue
    };
};

var createQuatTarget = function ( defaultValue ) {
    return createTarget( channelType.Quat,
        quat.copy( quat.create(), defaultValue ),
        quat.copy( quat.create(), defaultValue ) );
};

var createMatrixTarget = function ( defaultValue ) {
    return createTarget( channelType.Matrix,
        mat4.copy( mat4.create(), defaultValue ),
        mat4.copy( mat4.create(), defaultValue ) );
};

var createVec3Target = function ( defaultValue ) {
    return createTarget( channelType.Vec3,
        vec3.copy( vec3.create(), defaultValue ),
        vec3.copy( vec3.create(), defaultValue ) );
};

var createFloatTarget = function ( defaultValue ) {
    return createTarget( channelType.Float,
        defaultValue,
        defaultValue );
};

target.createQuatTarget = createQuatTarget;
target.createVec3Target = createVec3Target;
target.createFloatTarget = createFloatTarget;
target.createMatrixTarget = createMatrixTarget;

module.exports = target;
