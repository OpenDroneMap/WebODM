'use strict';
var osgMath = require( 'osg/math' );
var glm = require( 'osg/glMatrix' );
var vec2 = glm.vec2;

/** @class Vec2 Operations */
var Vec2 = {

    create: vec2.create,
    createAndSet: vec2.fromValues,

    copy: function ( a, r ) {
        return vec2.copy( r, a );
    },

    set: function ( a, b, r ) {
        return vec2.set( r, a, b );
    },

    valid: function ( a ) {
        if ( osgMath.isNaN( a[ 0 ] ) ) return false;
        if ( osgMath.isNaN( a[ 1 ] ) ) return false;
        return true;
    },

    mult: function ( a, b, r ) {
        r[ 0 ] = a[ 0 ] * b;
        r[ 1 ] = a[ 1 ] * b;
        return r;
    },

    length2: vec2.sqrLen,
    length: vec2.len,

    distance2: function ( a, b ) {
        return vec2.sqrDist( b, a );
    },

    distance: function ( a, b ) {
        return vec2.dist( b, a );
    },

    normalize: function ( a, r ) {
        return vec2.normalize( r, a );
    },

    dot: vec2.dot,

    sub: function ( a, b, r ) {
        return vec2.sub( r, a, b );
    },

    add: function ( a, b, r ) {
        return vec2.add( r, a, b );
    },

    neg: function ( a, r ) {
        return vec2.negate( r, a );
    },

    lerp: function ( t, a, b, r ) {
        return vec2.lerp( r, a, b, t );
    }

};

module.exports = Vec2;
