'use strict';
var glm = require( 'osg/glMatrix' );
var vec4 = glm.vec4;

/** @class Vec4 Operations */
var Vec4 = {

    create: vec4.create,
    createAndSet: vec4.fromValues,

    init: function ( a ) {
        return vec4.set( a, 0.0, 0.0, 0.0, 0.0 );
    },

    set: function ( a, b, c, d, r ) {
        return vec4.set( r, a, b, c, d );
    },

    dot: vec4.dot,

    copy: function ( a, r ) {
        return vec4.copy( r, a );
    },

    sub: function ( a, b, r ) {
        return vec4.sub( r, a, b );
    },

    mult: function ( a, b, r ) {
        r[ 0 ] = a[ 0 ] * b;
        r[ 1 ] = a[ 1 ] * b;
        r[ 2 ] = a[ 2 ] * b;
        r[ 3 ] = a[ 3 ] * b;
        return r;
    },

    add: function ( a, b, r ) {
        return vec4.add( r, a, b );
    },

    neg: function ( a, r ) {
        return vec4.negate( r, a );
    },

    lerp: function ( t, a, b, r ) {
        return vec4.lerp( r, a, b, t );
    }
};

module.exports = Vec4;
