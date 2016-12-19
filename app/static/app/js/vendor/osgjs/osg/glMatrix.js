'use strict';

var mth = require( 'osg/math' );
var glm = require( 'gl-matrix' );
var config = require( '../config.js' );
glm.glMatrix.setMatrixArrayType( config.ArrayType );
glm.glMatrix.EPSILON = 1e-9;


var vec2 = glm.vec2;
var vec3 = glm.vec3;
var vec4 = glm.vec4;
var mat4 = glm.mat4;
var quat = glm.quat;

// osg vec3 additions

vec3.create32 = function () {
    return new Float32Array( 3 );
};

vec3.create64 = function () {
    return new Float64Array( 3 );
};

vec3.fromValues32 = function ( a, b, c ) {
    var out = new Float32Array( 3 );
    out[ 0 ] = a;
    out[ 1 ] = b;
    out[ 2 ] = c;
    return out;
};

vec3.fromValues64 = function ( a, b, c ) {
    var out = new Float64Array( 3 );
    out[ 0 ] = a;
    out[ 1 ] = b;
    out[ 2 ] = c;
    return out;
};

vec3.init = function ( out ) {
    return vec3.set( out, 0.0, 0.0, 0.0 );
};

vec3.transformMat4R = function ( out, v, m ) {
    out[ 0 ] = m[ 0 ] * v[ 0 ] + m[ 1 ] * v[ 1 ] + m[ 2 ] * v[ 2 ];
    out[ 1 ] = m[ 4 ] * v[ 0 ] + m[ 5 ] * v[ 1 ] + m[ 6 ] * v[ 2 ];
    out[ 2 ] = m[ 8 ] * v[ 0 ] + m[ 9 ] * v[ 1 ] + m[ 10 ] * v[ 2 ];
};

vec3.valid = function ( a ) {
    if ( mth.isNaN( a[ 0 ] ) ) return false;
    if ( mth.isNaN( a[ 1 ] ) ) return false;
    if ( mth.isNaN( a[ 2 ] ) ) return false;
    return true;
};
vec3.neg = vec3.negate;
vec3.ZERO = vec3.create();
vec3.ONE = vec3.fromValues( 1.0, 1.0, 1.0 );
vec3.INFINITY = vec3.fromValues( Infinity, Infinity, Infinity );
vec3.NEGATIVE_INFINITY = vec3.fromValues( -Infinity, -Infinity, -Infinity );

// osg vec2 additions

vec2.create32 = function () {
    return new Float32Array( 2 );
};

vec2.create64 = function () {
    return new Float64Array( 2 );
};

vec2.fromValues32 = function ( a, b ) {
    var out = new Float32Array( 2 );
    out[ 0 ] = a;
    out[ 1 ] = b;
    return out;
};

vec2.fromValues64 = function ( a, b ) {
    var out = new Float64Array( 2 );
    out[ 0 ] = a;
    out[ 1 ] = b;
    return out;
};

vec2.init = function ( out ) {
    return vec2.set( out, 0.0, 0.0 );
};

vec2.valid = function ( a ) {
    if ( mth.isNaN( a[ 0 ] ) ) return false;
    if ( mth.isNaN( a[ 1 ] ) ) return false;
    return true;
};

vec2.ZERO = vec2.create();
vec2.ONE = vec2.fromValues( 1.0, 1.0 );
vec2.INFINITY = vec2.fromValues( Infinity, Infinity );
vec2.NEGATIVE_INFINITY = vec2.fromValues( -Infinity, -Infinity );

// osg vec4 additions

vec4.create32 = function () {
    return new Float32Array( 4 );
};

vec4.create64 = function () {
    return new Float64Array( 4 );
};

vec4.fromValues32 = function ( a, b, c, d ) {
    var out = new Float32Array( 4 );
    out[ 0 ] = a;
    out[ 1 ] = b;
    out[ 2 ] = c;
    out[ 3 ] = d;
    return out;
};

vec4.fromValues64 = function ( a, b, c, d ) {
    var out = new Float64Array( 4 );
    out[ 0 ] = a;
    out[ 1 ] = b;
    out[ 2 ] = c;
    out[ 3 ] = d;
    return out;
};

vec4.init = function ( out ) {
    return vec4.set( out, 0.0, 0.0, 0.0, 0.0 );
};

vec4.valid = function ( a ) {
    if ( mth.isNaN( a[ 0 ] ) ) return false;
    if ( mth.isNaN( a[ 1 ] ) ) return false;
    if ( mth.isNaN( a[ 2 ] ) ) return false;
    if ( mth.isNaN( a[ 3 ] ) ) return false;
    return true;
};
vec4.neg = vec4.negate;
vec4.ZERO = vec4.create();
vec4.ONE = vec4.fromValues( 1.0, 1.0, 1.0, 1.0 );
vec4.INFINITY = vec4.fromValues( Infinity, Infinity, Infinity, Infinity );
vec4.NEGATIVE_INFINITY = vec4.fromValues( -Infinity, -Infinity, -Infinity, -Infinity );


// quat

quat.IDENTITY = quat.create();

quat.zeroRotation = function ( q ) {
    return q[ 0 ] === 0.0 && q[ 1 ] === 0.0 && q[ 2 ] === 0.0 && q[ 3 ] === 1.0;
};

quat.create32 = function () {
    var out = new Float32Array( 4 );
    out[ 3 ] = 1.0;
    return out;
};

quat.create64 = function () {
    var out = new Float64Array( 4 );
    out[ 3 ] = 1.0;
    return out;
};

quat.fromValues32 = vec4.fromValues32;
quat.fromValues64 = vec4.fromValues64;
quat.init = quat.identity;

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
quat.nlerp = function ( out, a, b, t ) {
    var ax = a[ 0 ],
        ay = a[ 1 ],
        az = a[ 2 ],
        aw = a[ 3 ],
        bx = b[ 0 ],
        by = b[ 1 ],
        bz = b[ 2 ],
        bw = b[ 3 ];
    var dot = ax * bx + ay * by + az * bz + aw * bw;
    var at = 1.0 - t;
    var outx, outy, outz, outw;
    // shortest path
    if ( dot < 0.0 ) {

        // negates directly b in the 4 equation
        // this.neg( b, r );
        outx = ax * at - bx * t;
        outy = ay * at - by * t;
        outz = az * at - bz * t;
        outw = aw * at - bw * t;

    } else {
        outx = ax * at + bx * t;
        outy = ay * at + by * t;
        outz = az * at + bz * t;
        outw = aw * at + bw * t;
    }

    var invLen = 1.0 / Math.sqrt( outx * outx + outy * outy + outz * outz + outw * outw );
    out[ 0 ] = outx * invLen;
    out[ 1 ] = outy * invLen;
    out[ 2 ] = outz * invLen;
    out[ 3 ] = outw * invLen;
    return out;
};

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
// slerp see glMatrix implementation


// mat4 additions
mat4.IDENTITY = mat4.create();

mat4.create32 = function () {
    var out = new Float32Array( 16 );
    out[ 0 ] = out[ 5 ] = out[ 10 ] = out[ 15 ] = 1.0;
    return out;
};

mat4.create64 = function () {
    var out = new Float64Array( 16 );
    out[ 0 ] = out[ 5 ] = out[ 10 ] = out[ 15 ] = 1.0;
    return out;
};

mat4.setTranslation = function ( out, a ) {
    out[ 12 ] = a[ 0 ];
    out[ 13 ] = a[ 1 ];
    out[ 14 ] = a[ 2 ];
    return out;
};

mat4.getFrustum = function ( out, matrix ) {
    var right = 0.0;
    var left = 0.0;
    var top = 0.0;
    var bottom = 0.0;
    var zNear, zFar;

    if ( matrix[ 0 * 4 + 3 ] !== 0.0 || matrix[ 1 * 4 + 3 ] !== 0.0 || matrix[ 2 * 4 + 3 ] !== -1.0 || matrix[ 3 * 4 + 3 ] !== 0.0 ) {
        return false;
    }

    // note: near and far must be used inside this method instead of zNear and zFar
    // because zNear and zFar are references and they may point to the same variable.
    var tempNear = matrix[ 3 * 4 + 2 ] / ( matrix[ 2 * 4 + 2 ] - 1.0 );
    var tempFar = matrix[ 3 * 4 + 2 ] / ( 1.0 + matrix[ 2 * 4 + 2 ] );

    left = tempNear * ( matrix[ 2 * 4 ] - 1.0 ) / matrix[ 0 ];
    right = tempNear * ( 1.0 + matrix[ 2 * 4 ] ) / matrix[ 0 ];

    top = tempNear * ( 1.0 + matrix[ 2 * 4 + 1 ] ) / matrix[ 1 * 4 + 1 ];
    bottom = tempNear * ( matrix[ 2 * 4 + 1 ] - 1.0 ) / matrix[ 1 * 4 + 1 ];

    zNear = tempNear;
    zFar = tempFar;

    out.left = left;
    out.right = right;
    out.top = top;
    out.bottom = bottom;
    out.zNear = zNear;
    out.zFar = zFar;

    return true;
};

mat4.getPerspective = ( function () {
    var c = {
        right: 0,
        left: 0,
        top: 0,
        bottom: 0,
        zNear: 0,
        zFar: 0
    };
    return function ( out, matrix ) {
        // get frustum and compute results
        var r = mat4.getFrustum( c, matrix );
        if ( r ) {
            out.fovy = 180 / Math.PI * ( Math.atan( c.top / c.zNear ) - Math.atan( c.bottom / c.zNear ) );
            out.aspectRatio = ( c.right - c.left ) / ( c.top - c.bottom );
        }
        out.zNear = c.zNear;
        out.zFar = c.zFar;
        return out;
    };
} )();

mat4.getLookAt = ( function () {
    var inv = mat4.create();
    var v1 = vec3.create();
    var v2 = vec3.fromValues( 0.0, 1.0, 0.0 );
    var v3 = vec3.fromValues( 0.0, 0.0, -1.0 );

    return function ( eye, center, up, matrix, distance ) {

        var d = distance !== undefined ? distance : 1.0;
        mat4.invert( inv, matrix );
        vec3.transformMat4( eye, v1, inv );
        vec3.transformMat4R( up, v2, matrix );
        vec3.transformMat4R( center, v3, matrix );
        vec3.normalize( center, center );
        vec3.add( center, vec3.scale( v1, center, d ), eye );
    };
} )();

mat4.getFrustumPlanes = ( function () {

    var mvp = mat4.create();

    return function ( out, projection, view, withNearFar ) {
        mat4.mul( mvp, projection, view );

        var computeNearFar = !!withNearFar;

        // Right clipping plane.
        var right = out[ 0 ];
        right[ 0 ] = mvp[ 3 ] - mvp[ 0 ];
        right[ 1 ] = mvp[ 7 ] - mvp[ 4 ];
        right[ 2 ] = mvp[ 11 ] - mvp[ 8 ];
        right[ 3 ] = mvp[ 15 ] - mvp[ 12 ];

        // Left clipping plane.
        var left = out[ 1 ];
        left[ 0 ] = mvp[ 3 ] + mvp[ 0 ];
        left[ 1 ] = mvp[ 7 ] + mvp[ 4 ];
        left[ 2 ] = mvp[ 11 ] + mvp[ 8 ];
        left[ 3 ] = mvp[ 15 ] + mvp[ 12 ];

        // Bottom clipping plane.
        var bottom = out[ 2 ];
        bottom[ 0 ] = mvp[ 3 ] + mvp[ 1 ];
        bottom[ 1 ] = mvp[ 7 ] + mvp[ 5 ];
        bottom[ 2 ] = mvp[ 11 ] + mvp[ 9 ];
        bottom[ 3 ] = mvp[ 15 ] + mvp[ 13 ];

        // Top clipping plane.
        var top = out[ 3 ];
        top[ 0 ] = mvp[ 3 ] - mvp[ 1 ];
        top[ 1 ] = mvp[ 7 ] - mvp[ 5 ];
        top[ 2 ] = mvp[ 11 ] - mvp[ 9 ];
        top[ 3 ] = mvp[ 15 ] - mvp[ 13 ];

        var nbPlanes = 4;
        if ( computeNearFar ) {
            nbPlanes = 6;
            // Far clipping plane.
            var far = out[ 4 ];
            far[ 0 ] = mvp[ 3 ] - mvp[ 2 ];
            far[ 1 ] = mvp[ 7 ] - mvp[ 6 ];
            far[ 2 ] = mvp[ 11 ] - mvp[ 10 ];
            far[ 3 ] = mvp[ 15 ] - mvp[ 14 ];

            // Near clipping plane.
            var near = out[ 5 ];
            near[ 0 ] = mvp[ 3 ] + mvp[ 2 ];
            near[ 1 ] = mvp[ 7 ] + mvp[ 6 ];
            near[ 2 ] = mvp[ 11 ] + mvp[ 10 ];
            near[ 3 ] = mvp[ 15 ] + mvp[ 14 ];
        }

        //Normalize the planes, from osg code
        for ( var i = 0; i < nbPlanes; i++ ) {
            var p = out[ i ];
            // multiply the coefficients of the plane equation with a constant factor so that the equation a^2+b^2+c^2 = 1 holds.
            var inv = 1.0 / Math.sqrt( p[ 0 ] * p[ 0 ] + p[ 1 ] * p[ 1 ] + p[ 2 ] * p[ 2 ] );
            p[ 0 ] *= inv;
            p[ 1 ] *= inv;
            p[ 2 ] *= inv;
            p[ 3 ] *= inv;
        }

    };
} )();

// better precison
// no far clipping artifacts.
// no reason not to use.
// Tightening the Precision of Perspective Rendering
//http://www.geometry.caltech.edu/pubs/UD12.pdf
// drop-in, just remove the one below, and rename this one
mat4.infiniteFrustum = function ( out, left, right, bottom, top, znear ) {
    var X = 2.0 * znear / ( right - left );
    var Y = 2.0 * znear / ( top - bottom );
    var A = ( right + left ) / ( right - left );
    var B = ( top + bottom ) / ( top - bottom );
    var C = -1.0;
    out[ 0 ] = X;
    out[ 1 ] = 0.0;
    out[ 2 ] = 0.0;
    out[ 3 ] = 0.0;

    out[ 4 ] = 0.0;
    out[ 5 ] = Y;
    out[ 6 ] = 0.0;
    out[ 7 ] = 0.0;

    out[ 8 ] = A;
    out[ 9 ] = B;
    out[ 10 ] = C;
    out[ 11 ] = -1.0;

    out[ 12 ] = 0.0;
    out[ 13 ] = 0.0;
    out[ 14 ] = -2.0 * znear;
    out[ 15 ] = 0.0;

    return out;
};

mat4.lookAtDirection = ( function () {
    var s = vec3.create();
    var u = vec3.create();
    var neg = vec3.create();

    return function ( out, eye, eyeDir, up ) {
        var f = eyeDir;
        vec3.cross( s, f, up );
        vec3.normalize( s, s );

        vec3.cross( u, s, f );
        vec3.normalize( u, u );

        // s[0], u[0], -f[0], 0.0,
        // s[1], u[1], -f[1], 0.0,
        // s[2], u[2], -f[2], 0.0,
        // 0,    0,    0,     1.0

        out[ 0 ] = s[ 0 ];
        out[ 1 ] = u[ 0 ];
        out[ 2 ] = -f[ 0 ];
        out[ 3 ] = 0.0;
        out[ 4 ] = s[ 1 ];
        out[ 5 ] = u[ 1 ];
        out[ 6 ] = -f[ 1 ];
        out[ 7 ] = 0.0;
        out[ 8 ] = s[ 2 ];
        out[ 9 ] = u[ 2 ];
        out[ 10 ] = -f[ 2 ];
        out[ 11 ] = 0.0;
        out[ 12 ] = 0;
        out[ 13 ] = 0;
        out[ 14 ] = 0;
        out[ 15 ] = 1.0;

        return mat4.translate( out, out, vec3.neg( neg, eye ) );
    };
} )();

mat4.getScale = ( function () {
    var sx = vec3.create();
    var sy = vec3.create();
    var sz = vec3.create();
    return function ( out, matrix ) {
        sx[ 0 ] = matrix[ 0 ];
        sx[ 1 ] = matrix[ 4 ];
        sx[ 2 ] = matrix[ 8 ];
        sy[ 0 ] = matrix[ 1 ];
        sy[ 1 ] = matrix[ 5 ];
        sy[ 2 ] = matrix[ 9 ];
        sz[ 0 ] = matrix[ 2 ];
        sz[ 1 ] = matrix[ 6 ];
        sz[ 2 ] = matrix[ 10 ];

        out[ 0 ] = vec3.length( sx );
        out[ 1 ] = vec3.length( sy );
        out[ 2 ] = vec3.length( sz );
        return out;
    };
} )();

mat4.getSqrScale = ( function () {
    var sx = vec3.create();
    var sy = vec3.create();
    var sz = vec3.create();
    return function ( out, matrix ) {
        sx[ 0 ] = matrix[ 0 ];
        sx[ 1 ] = matrix[ 4 ];
        sx[ 2 ] = matrix[ 8 ];
        sy[ 0 ] = matrix[ 1 ];
        sy[ 1 ] = matrix[ 5 ];
        sy[ 2 ] = matrix[ 9 ];
        sz[ 0 ] = matrix[ 2 ];
        sz[ 1 ] = matrix[ 6 ];
        sz[ 2 ] = matrix[ 10 ];

        out[ 0 ] = vec3.sqrLen( sx );
        out[ 1 ] = vec3.sqrLen( sy );
        out[ 2 ] = vec3.sqrLen( sz );
        return out;
    };
} )();

var glmRotate = mat4.rotate;
mat4.rotate = function ( out, a, rad, axis ) {
    return glmRotate( out, a, rad, axis ) || mat4.identity( out );
};

var glmFromRotate = mat4.fromRotation;
mat4.fromRotation = function ( out, rad, axis ) {
    return glmFromRotate( out, rad, axis ) || mat4.identity( out );
};

module.exports = glm;
