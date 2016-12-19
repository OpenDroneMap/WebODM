'use strict';
var vec3 = require( 'osg/glMatrix' ).vec3;
var Vec4 = require( 'osg/Vec4' );
var config = require( '../../config' );

var ArrayType = config.ArrayType;


var Msqrt = Math.sqrt;
var Mcos = Math.cos;
var Msin = Math.sin;

var Quat = {

    create: function () {
        var out = new ArrayType( 4 );
        out[ 0 ] = 0.0;
        out[ 1 ] = 0.0;
        out[ 2 ] = 0.0;
        out[ 3 ] = 1.0;
        return out;
    },

    createAndSet: Vec4.createAndSet,

    makeIdentity: function ( element ) {
        return Quat.init( element );
    },

    init: function ( element ) {
        element[ 0 ] = 0.0;
        element[ 1 ] = 0.0;
        element[ 2 ] = 0.0;
        element[ 3 ] = 1.0;
        return element;
    },

    // reuse Vec4 methods
    copy: Vec4.copy,
    set: Vec4.set,
    sub: Vec4.sub,
    add: Vec4.add,
    dot: Vec4.dot,
    neg: Vec4.neg,
    lerp: Vec4.lerp,

    length2: function ( a ) {
        return a[ 0 ] * a[ 0 ] + a[ 1 ] * a[ 1 ] + a[ 2 ] * a[ 2 ] + a[ 3 ] * a[ 3 ];
    },

    zeroRotation: function ( q ) {
        return q[ 0 ] === 0.0 && q[ 1 ] === 0.0 && q[ 2 ] === 0.0 && q[ 3 ] === 1.0;
    },

    length: function ( a ) {
        return Math.sqrt( a[ 0 ] * a[ 0 ] + a[ 1 ] * a[ 1 ] + a[ 2 ] * a[ 2 ] + a[ 3 ] * a[ 3 ] );
    },

    makeRotate: function ( angle, x, y, z, result ) {
        var epsilon = 0.0000001;
        var length = Msqrt( x * x + y * y + z * z );
        if ( length < epsilon ) {
            return this.init( result );
        }

        var inversenorm = 1.0 / length;
        var coshalfangle = Mcos( 0.5 * angle );
        var sinhalfangle = Msin( 0.5 * angle );

        result[ 0 ] = x * sinhalfangle * inversenorm;
        result[ 1 ] = y * sinhalfangle * inversenorm;
        result[ 2 ] = z * sinhalfangle * inversenorm;
        result[ 3 ] = coshalfangle;
        return result;
    },

    // http://physicsforgames.blogspot.fr/2010/02/quaternions.html
    // called quatBlend
    //
    // NLERP is supposed to be
    // - Commutative,
    // - NOT Constant velocity
    // - Torque minimal
    //
    // a and be must be normalized
    // (otherwise they're not rotation...)
    // t must be between 0 and 1
    nlerp: function ( t, a, b, r ) {
        var dot = this.dot( a, b );
        var at = 1.0 - t;

        // shortest path
        if ( dot < 0.0 ) {

            // negates directly b in the 4 equation
            // this.neg( b, r );
            r[ 0 ] = a[ 0 ] * at - b[ 0 ] * t;
            r[ 1 ] = a[ 1 ] * at - b[ 1 ] * t;
            r[ 2 ] = a[ 2 ] * at - b[ 2 ] * t;
            r[ 3 ] = a[ 3 ] * at - b[ 3 ] * t;

        } else {
            r[ 0 ] = a[ 0 ] * at + b[ 0 ] * t;
            r[ 1 ] = a[ 1 ] * at + b[ 1 ] * t;
            r[ 2 ] = a[ 2 ] * at + b[ 2 ] * t;
            r[ 3 ] = a[ 3 ] * at + b[ 3 ] * t;
        }

        return this.normalize( r, r );
    },

    //
    // MUST READ on SLERP, NLERP, LOG-LERP
    // http://number-none.com/product/Understanding%20Slerp,%20Then%20Not%20Using%20It/
    // with a slerp implementation (robust)
    //
    // MUST READ Howto enhance lerp, slerp and q normalize
    // http://number-none.com/product/Hacking%20Quaternions/
    //
    // MUST READ The book:
    // Essential Mathematics for Games and Interactive Applications page
    // ( from 10.6.1 Linear Interpolation to 10.6.3 Performance Improvements )
    //
    //  SLERP is:
    // - NOT commutative
    // - constant velocity
    // - torque minimal
    //
    // so not to be used when blending multiple non ordered rotations
    // (as in multiple animation)
    //
    slerp: ( function () {

        var epsilon = 0.00001;
        // a and be must be normalized
        // (otherwise they're not rotation...)
        // t must be between 0 and 1
        return function ( t, a, b, r ) {

            var cos = this.dot( a, b );
            var invTB = 1.0;

            // shortest path
            if ( cos < 0.0 ) {
                invTB = -1.0;
                cos = -cos;
            }

            var ta, tb;
            if ( cos > 1.0 - epsilon ) {
                // negligible rotation: optimize by just a lerp
                // a line rather than a rotation.
                ta = 1.0 - t;
                tb = t;

            } else {

                var sin = Math.sqrt( 1.0 - cos * cos );

                // which one is better ?

                // Atan2:
                //  sin != 0 && cos !f= 0
                //  Atan2 returns the angle between -π and π radians (equivalent to -180 and 180 degrees)
                var angle = Math.atan2( sin, cos );
                // Acos:
                // need clamp(-1,1) on input Cos to avoid NaN but we make it lerp anyway
                // acos returns the angle between 0 and π radians (equivalent to 0 and 180 degrees)
                //var angle = Math.acos( cos ); / / 0 <= omega <= Pi( see man acos )

                var oneOverSin = 1.0 / sin;
                ta = Math.sin( ( 1.0 - t ) * angle ) * oneOverSin;
                tb = Math.sin( t * angle ) * oneOverSin;
            }

            tb *= invTB;

            r[ 0 ] = a[ 0 ] * ta + b[ 0 ] * tb;
            r[ 1 ] = a[ 1 ] * ta + b[ 1 ] * tb;
            r[ 2 ] = a[ 2 ] * ta + b[ 2 ] * tb;
            r[ 3 ] = a[ 3 ] * ta + b[ 3 ] * tb;
            return r;
        };

    } )(),

    transformVec3: function ( q, a, result ) {
        var x = a[ 0 ];
        var y = a[ 1 ];
        var z = a[ 2 ];
        var qx = q[ 0 ];
        var qy = q[ 1 ];
        var qz = q[ 2 ];
        var qw = q[ 3 ];
        // calculate quat * vec
        var ix = qw * x + qy * z - qz * y;
        var iy = qw * y + qz * x - qx * z;
        var iz = qw * z + qx * y - qy * x;
        var iw = -qx * x - qy * y - qz * z;

        // calculate result * inverse quat
        result[ 0 ] = ix * qw + iw * -qx + iy * -qz - iz * -qy;
        result[ 1 ] = iy * qw + iw * -qy + iz * -qx - ix * -qz;
        result[ 2 ] = iz * qw + iw * -qz + ix * -qy - iy * -qx;
        return result;
    },

    normalize: function ( q, qr ) {
        var div = 1.0 / this.length( q );
        qr[ 0 ] = q[ 0 ] * div;
        qr[ 1 ] = q[ 1 ] * div;
        qr[ 2 ] = q[ 2 ] * div;
        qr[ 3 ] = q[ 3 ] * div;
        return qr;
    },

    // conjugate
    // we suppose to have unit quaternion
    conj: function ( a, result ) {
        result[ 0 ] = -a[ 0 ];
        result[ 1 ] = -a[ 1 ];
        result[ 2 ] = -a[ 2 ];
        result[ 3 ] = a[ 3 ];
        return result;
    },

    // only if you don't have unit quaternion
    // otherwise use conjugate
    inverse: function ( a, result ) {
        var div = 1.0 / this.length2( a );
        this.conj( a, result );
        result[ 0 ] *= div;
        result[ 1 ] *= div;
        result[ 2 ] *= div;
        result[ 3 ] *= div;
        return result;
    },

    // we suppose to have unit quaternion
    // multiply 2 quaternions
    mult: function ( a, b, result ) {
        var ax = a[ 0 ];
        var ay = a[ 1 ];
        var az = a[ 2 ];
        var aw = a[ 3 ];

        var bx = b[ 0 ];
        var by = b[ 1 ];
        var bz = b[ 2 ];
        var bw = b[ 3 ];

        result[ 0 ] = ax * bw + ay * bz - az * by + aw * bx;
        result[ 1 ] = -ax * bz + ay * bw + az * bx + aw * by;
        result[ 2 ] = ax * by - ay * bx + az * bw + aw * bz;
        result[ 3 ] = -ax * bx - ay * by - az * bz + aw * bw;
        return result;
    },

    div: function ( a, b, result ) {
        var d = 1.0 / b;
        result[ 0 ] = a[ 0 ] * d;
        result[ 1 ] = a[ 1 ] * d;
        result[ 2 ] = a[ 2 ] * d;
        result[ 3 ] = a[ 3 ] * d;
        return result;
    },

    exp: function ( a, res ) {
        var r = Math.sqrt( a[ 0 ] * a[ 0 ] + a[ 1 ] * a[ 1 ] + a[ 2 ] * a[ 2 ] );
        var et = Math.exp( a[ 3 ] );
        var s = 0;
        if ( r > 0.00001 ) {
            s = et * Math.sin( r ) / r;
        }

        res[ 0 ] = s * a[ 0 ];
        res[ 1 ] = s * a[ 1 ];
        res[ 2 ] = s * a[ 2 ];
        res[ 3 ] = et * Math.cos( r );
        return res;
    },

    ln: function ( a, res ) {
        var n = a[ 0 ] * a[ 0 ] + a[ 1 ] * a[ 1 ] + a[ 2 ] * a[ 2 ];
        var r = Math.sqrt( n );
        var t = 0;
        if ( r > 0.00001 ) {
            t = Math.atan2( r, a[ 3 ] ) / r;
        }

        n += a[ 3 ] * a[ 3 ];
        res[ 0 ] = t * a[ 0 ];
        res[ 1 ] = t * a[ 1 ];
        res[ 2 ] = t * a[ 2 ];
        res[ 3 ] = 0.5 * Math.log( n );
        return res;
    },


    //http://theory.org/software/qfa/writeup/node12.html
    //http://www.ece.uwaterloo.ca/~dwharder/C++/CQOST/src/
    //http://willperone.net/Code/quaternion.php

    // a is computeTangent(q1-1,q1,q2)
    // b is computeTangent(q2-1,q2,q2+1)
    squad: function ( t, q1, a, b, q2, r ) {
        var r1 = this.slerp( t, q1, q2 );
        var r2 = this.slerp( t, a, b );
        return this.slerp( 2.0 * t * ( 1.0 - t ), r1, r2, r );
    },

    // qcur is current
    // q0 is qcur-1
    // q2 is qcur+1
    // compute tangent in of q1
    computeTangent: function ( q0, qcur, q2, r ) {

        // first step
        var invq = this.inv( qcur );
        var qa = this.create();
        var qb = this.create();

        this.mult( q2, invq, qa );
        this.ln( qa, qa );

        this.mult( q0, invq, qb );
        this.ln( qb, qb );

        this.add( qa, qb, qa );
        this.div( qa, -4.0, qa );
        this.exp( qa, qb );
        return this.mult( qb, qcur, r );
    },

    makeRotateFromTo: function ( from, to, out ) {
        // Now let's get into the real stuff
        // Use "dot product plus one" as test as it can be re-used later on
        var dotProdPlus1 = 1.0 + vec3.dot( from, to );

        // Check for degenerate case of full u-turn. Use epsilon for detection
        if ( dotProdPlus1 < 1e-7 ) {

            // Get an orthogonal vector of the given vector
            // in a plane with maximum vector coordinates.
            // Then use it as quaternion axis with pi angle
            // Trick is to realize one value at least is >0.6 for a normalized vector.
            var x = from[ 0 ];
            var y = from[ 1 ];
            var z = from[ 2 ];
            var norm;
            if ( Math.abs( x ) < 0.6 ) {
                norm = Math.sqrt( 1.0 - x * x );
                out[ 1 ] = z / norm;
                out[ 2 ] = -y / norm;
                out[ 0 ] = out[ 3 ] = 0.0;
            } else if ( Math.abs( y ) < 0.6 ) {
                norm = Math.sqrt( 1.0 - y * y );
                out[ 0 ] = -z / norm;
                out[ 2 ] = x / norm;
                out[ 1 ] = out[ 3 ] = 0.0;
            } else {
                norm = Math.sqrt( 1.0 - z * z );
                out[ 0 ] = y / norm;
                out[ 1 ] = -x / norm;
                out[ 2 ] = out[ 3 ] = 0.0;
            }
        } else {
            // Find the shortest angle quaternion that transforms normalized vectors
            // into one other. Formula is still valid when vectors are colinear

            var s = Math.sqrt( 0.5 * dotProdPlus1 );
            vec3.cross( out, from, to );
            var f = 0.5 / s;
            out[ 0 ] *= f;
            out[ 1 ] *= f;
            out[ 2 ] *= f;
            out[ 3 ] = s;
        }
        return out;
    }

};

Quat.identity = Quat.create();

module.exports = Quat;
