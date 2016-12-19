'use strict';
var osgMath = require( 'osg/math' );
var glm = require( 'osg/glMatrix' );
var vec3 = glm.vec3;

/** @class Vec3 Operations */
var Vec3 = {

    create: vec3.create,
    createAndSet: vec3.fromValues,

    init: function ( a ) {
        return vec3.set( a, 0.0, 0.0, 0.0 );
    },

    set: function ( a, b, c, r ) {
        return vec3.set( r, a, b, c );
    },

    copy: function ( a, r ) {
        return vec3.copy( r, a );
    },

    cross: function ( a, b, r ) {
        return vec3.cross( r, a, b );
    },

    valid: function ( a ) {
        if ( osgMath.isNaN( a[ 0 ] ) ) return false;
        if ( osgMath.isNaN( a[ 1 ] ) ) return false;
        if ( osgMath.isNaN( a[ 2 ] ) ) return false;
        return true;
    },

    mult: function ( a, b, r ) {
        r[ 0 ] = a[ 0 ] * b;
        r[ 1 ] = a[ 1 ] * b;
        r[ 2 ] = a[ 2 ] * b;
        return r;
    },

    length2: vec3.sqrLen,
    length: vec3.len,

    distance2: function ( a, b ) {
        return vec3.sqrDist( b, a );
    },

    distance: function ( a, b ) {
        return vec3.dist( b, a );
    },

    normalize: function ( a, r ) {
        return vec3.normalize( r, a );
    },

    dot: vec3.dot,

    sub: function ( a, b, r ) {
        return vec3.sub( r, a, b );
    },

    add: function ( a, b, r ) {
        return vec3.add( r, a, b );
    },

    neg: function ( a, r ) {
        return vec3.negate( r, a );
    },

    lerp: function ( t, a, b, r ) {
        return vec3.lerp( r, a, b, t );
    },

    equal: function ( a, b ) {
        return vec3.exactEquals( a, b );
    }
};

Vec3.zero = Vec3.create();
Vec3.one = Vec3.createAndSet( 1.0, 1.0, 1.0 );
Vec3.infinity = Vec3.createAndSet( Infinity, Infinity, Infinity );
Vec3.negativeInfinity = Vec3.createAndSet( -Infinity, -Infinity, -Infinity );

module.exports = Vec3;
