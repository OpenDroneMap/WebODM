'use strict';
var Notify = require( 'osg/notify' );
var osgMath = require( 'osg/math' );
var BoundingBox = require( 'osg/BoundingBox' );
var Plane = require( 'osg/Plane' );
var vec3 = require( 'osg/glMatrix' ).vec3;

var glm = require( 'osg/glMatrix' );

var Mabs = Math.abs;
var NMIN_VALUE = Number.MIN_VALUE;

// call by closur'd variables because Matrix object is not
// resolved yet, a workaround would be to define Matrix such as:
// var Matrix = {};
// Matrix.create = function... ;
// Matrix.func2 = function... ;
var matrixCreate = glm.mat4.create;

/** @class Matrix Operations */
var Matrix = {

    create: glm.mat4.create,
    createAndSet: glm.mat4.fromValues,

    isIdentity: function ( matrix ) {
        return glm.mat4.equals( Matrix.identity, matrix );
    },

    valid: function ( matrix ) {
        for ( var i = 0; i < 16; i++ )
            if ( osgMath.isNaN( matrix[ i ] ) )
                return false;
        return true;
    },

    setRow: function ( matrix, row, v0, v1, v2, v3 ) {
        var rowIndex = row * 4;
        matrix[ rowIndex + 0 ] = v0;
        matrix[ rowIndex + 1 ] = v1;
        matrix[ rowIndex + 2 ] = v2;
        matrix[ rowIndex + 3 ] = v3;
    },

    innerProduct: function ( a, b, r, c ) {
        var rIndex = r * 4;
        return ( ( a[ rIndex + 0 ] * b[ 0 + c ] ) + ( a[ rIndex + 1 ] * b[ 4 + c ] ) + ( a[ rIndex + 2 ] * b[ 8 + c ] ) + ( a[ rIndex + 3 ] * b[ 12 + c ] ) );
    },

    set: function ( matrix, row, col, value ) {
        matrix[ row * 4 + col ] = value;
        return value;
    },

    get: function ( matrix, row, col ) {
        return matrix[ row * 4 + col ];
    },

    makeIdentity: glm.mat4.identity,

    equal: glm.mat4.exactEquals,

    /**
     * @param {Number} x position
     * @param {Number} y position
     * @param {Number} z position
     * @param {Array} matrix to write result
     */
    makeTranslate: function ( x, y, z, matrix ) {
        return glm.mat4.fromTranslation( matrix, vec3.fromValues( x, y, z ) );
    },

    setTrans: function ( matrix, x, y, z ) {
        matrix[ 12 ] = x;
        matrix[ 13 ] = y;
        matrix[ 14 ] = z;
        return matrix;
    },

    getTrans: function ( matrix, result ) {
        return glm.mat4.getTranslation( result, matrix );
    },

    // do a * b and result in a
    preMult: function ( a, b ) {
        return glm.mat4.multiply( a, a, b );
    },

    // do a * b and store the result in b
    // Be aware of the change w.r.t OSG as b holds the result!
    postMult: function ( a, b ) {
        return glm.mat4.multiply( b, a, b );
    },

    /* r = a * b */
    mult: function ( a, b, r ) {
        return glm.mat4.multiply( r, a, b );
    },

    makeLookFromDirection: ( function () {
        var s = vec3.create();
        var u = vec3.create();
        var neg = vec3.create();

        return function ( eye, eyeDir, up, result ) {
            var f = eyeDir;
            vec3.cross( s, f, up );
            vec3.normalize( s, s );

            vec3.cross( u, s, f );
            vec3.normalize( u, u );

            // s[0], u[0], -f[0], 0.0,
            // s[1], u[1], -f[1], 0.0,
            // s[2], u[2], -f[2], 0.0,
            // 0,    0,    0,     1.0

            result[ 0 ] = s[ 0 ];
            result[ 1 ] = u[ 0 ];
            result[ 2 ] = -f[ 0 ];
            result[ 3 ] = 0.0;
            result[ 4 ] = s[ 1 ];
            result[ 5 ] = u[ 1 ];
            result[ 6 ] = -f[ 1 ];
            result[ 7 ] = 0.0;
            result[ 8 ] = s[ 2 ];
            result[ 9 ] = u[ 2 ];
            result[ 10 ] = -f[ 2 ];
            result[ 11 ] = 0.0;
            result[ 12 ] = 0;
            result[ 13 ] = 0;
            result[ 14 ] = 0;
            result[ 15 ] = 1.0;

            Matrix.multTranslate( result, vec3.neg( neg, eye ), result );
            return result;
        };
    } )(),

    makeLookAt: function ( eye, center, up, result ) {
        return glm.mat4.lookAt( result, eye, center, up );
    },

    makeOrtho: function ( left, right, bottom, top, zNear, zFar, result ) {
        return glm.mat4.ortho( result, left, right, bottom, top, zNear, zFar );
    },

    getLookAt: ( function () {
        var inv = matrixCreate();
        var v1 = vec3.create();
        var v2 = vec3.fromValues( 0.0, 1.0, 0.0 );
        var v3 = vec3.fromValues( 0.0, 0.0, -1.0 );

        return function ( matrix, eye, center, up, distance ) {
            if ( distance === undefined ) {
                distance = 1.0;
            }
            var result = Matrix.inverse( matrix, inv );
            if ( !result ) {
                glm.mat4.identity( inv );
            }
            Matrix.transformVec3( inv, v1, eye );
            Matrix.transform3x3( matrix, v2, up );
            Matrix.transform3x3( matrix, v3, center );
            vec3.normalize( center, center );
            vec3.add( center, vec3.scale( v1, center, distance ), eye );
        };
    } )(),

    //getRotate_David_Spillings_Mk1
    getRotate: function ( mat, quatResult ) {
        return glm.mat4.getRotation( quatResult, mat );
    },

    // Matrix M = Matrix M * Matrix Translate
    preMultTranslate: function ( mat, translate ) {
        return glm.mat4.translate( mat, mat, translate );
    },

    postMultTranslate: function ( mat, translate ) {
        return glm.mat4.multiply( mat, glm.mat4.fromTranslation( glm.mat4.create(), translate ), mat );
    },

    // result = Matrix M * Matrix Translate
    multTranslate: function ( mat, translate, result ) {
        return glm.mat4.translate( result, mat, translate );
    },

    makeRotate: function ( angle, x, y, z, result ) {
        var v = vec3.fromValues( x, y, z );
        if ( x === 0.0 && y === 0.0 && z === 0.0 )
            v[ 2 ] = 1.0;
        return glm.mat4.fromRotation( result, angle, v );
    },

    preMultRotate: ( function () {
        var r = matrixCreate();
        return function ( matrix, q ) {
            return glm.mat4.multiply( matrix, matrix, glm.mat4.fromQuat( r, q ) );
        };
    } )(),

    postMultRotate: ( function () {
        var r = matrixCreate();
        return function ( m, q ) {
            return glm.mat4.multiply( m, glm.mat4.fromQuat( r, q ), m );
        };
    } )(),

    transform3x3: function ( m, v, result ) {
        result[ 0 ] = m[ 0 ] * v[ 0 ] + m[ 1 ] * v[ 1 ] + m[ 2 ] * v[ 2 ];
        result[ 1 ] = m[ 4 ] * v[ 0 ] + m[ 5 ] * v[ 1 ] + m[ 6 ] * v[ 2 ];
        result[ 2 ] = m[ 8 ] * v[ 0 ] + m[ 9 ] * v[ 1 ] + m[ 10 ] * v[ 2 ];
        return result;
    },

    transformVec3: function ( matrix, vector, result ) {
        return glm.vec3.transformMat4( result, vector, matrix );
    },

    transformVec4: function ( matrix, vector, result ) {
        return glm.vec4.transformMat4( result, vector, matrix );
    },

    // http://dev.theomader.com/transform-bounding-boxes/
    // https://github.com/erich666/GraphicsGems/blob/master/gems/TransBox.c
    transformBoundingBox: ( function () {
        var tempBbox = new BoundingBox();
        return function ( m, bbIn, bbOut ) {
            if ( bbOut === bbIn ) {
                bbOut = tempBbox;
            }
            var inMin = bbIn.getMin();
            var inMax = bbIn.getMax();

            /* Take care of translation by beginning at T. */
            var outMin = glm.mat4.getTranslation( bbOut.getMin(), m );
            var outMax = vec3.copy( bbOut.getMax(), outMin );

            /* Now find the extreme points by considering the product of the */
            /* min and max with each component of M.  */
            for ( var i = 0; i < 3; ++i ) {
                var i4 = i * 4;
                var mini = inMin[ i ];
                var maxi = inMax[ i ];
                for ( var j = 0; j < 3; ++j ) {
                    var cm = m[ i4 + j ];
                    var a = cm * maxi;
                    var b = cm * mini;
                    if ( a < b ) {
                        outMin[ j ] += a;
                        outMax[ j ] += b;
                    } else {
                        outMin[ j ] += b;
                        outMax[ j ] += a;
                    }
                }
            }

            if ( bbOut === tempBbox ) {
                bbIn.copy( tempBbox );
            }
        };
    } )(),

    transformBoundingSphere: ( function () {
        var scaleVec = vec3.create();
        return function ( matrix, bSphere, bsOut ) {
            if ( !bSphere.valid() ) {
                return bsOut;
            }
            vec3.copy( bsOut._center, bSphere._center );
            bsOut._radius = bSphere._radius;
            var sphCenter = bsOut._center;
            var sphRadius = bsOut._radius;

            Matrix.getScale2( matrix, scaleVec );
            var scale = Math.sqrt( Math.max( Math.max( scaleVec[ 0 ], scaleVec[ 1 ] ), scaleVec[ 2 ] ) );
            sphRadius = sphRadius * scale;
            bsOut._radius = sphRadius;
            Matrix.transformVec3( matrix, sphCenter, sphCenter );

            return bsOut;
        };
    } )(),

    transformVec4PostMult: function ( matrix, vector, result ) {

        var x = vector[ 0 ];
        var y = vector[ 1 ];
        var z = vector[ 2 ];
        var w = vector[ 3 ];

        result[ 0 ] = matrix[ 0 ] * x + matrix[ 1 ] * y + matrix[ 2 ] * z + matrix[ 3 ] * w;
        result[ 1 ] = matrix[ 4 ] * x + matrix[ 5 ] * y + matrix[ 6 ] * z + matrix[ 7 ] * w;
        result[ 2 ] = matrix[ 8 ] * x + matrix[ 9 ] * y + matrix[ 10 ] * z + matrix[ 11 ] * w;
        result[ 3 ] = matrix[ 12 ] * x + matrix[ 13 ] * y + matrix[ 14 ] * z + matrix[ 15 ] * w;

        return result;
    },

    copy: function ( matrix, result ) {
        return glm.mat4.copy( result, matrix );
    },

    inverse: function ( matrix, result ) {
        var r = glm.mat4.invert( result, matrix );
        if ( r === null ) return false;
        return true;
    },

    transpose: function ( mat, dest ) {
        return glm.mat4.transpose( dest, mat );
    },

    getFrustumPlanes: ( function () {

        var mvp = matrixCreate();

        return function ( projection, view, result, withNearFar ) {
            glm.mat4.multiply( mvp, projection, view );

            if ( withNearFar === undefined )
                withNearFar = false;
            // Right clipping plane.
            var right = result[ 0 ];
            right[ 0 ] = mvp[ 3 ] - mvp[ 0 ];
            right[ 1 ] = mvp[ 7 ] - mvp[ 4 ];
            right[ 2 ] = mvp[ 11 ] - mvp[ 8 ];
            right[ 3 ] = mvp[ 15 ] - mvp[ 12 ];

            // Left clipping plane.
            var left = result[ 1 ];
            left[ 0 ] = mvp[ 3 ] + mvp[ 0 ];
            left[ 1 ] = mvp[ 7 ] + mvp[ 4 ];
            left[ 2 ] = mvp[ 11 ] + mvp[ 8 ];
            left[ 3 ] = mvp[ 15 ] + mvp[ 12 ];

            // Bottom clipping plane.
            var bottom = result[ 2 ];
            bottom[ 0 ] = mvp[ 3 ] + mvp[ 1 ];
            bottom[ 1 ] = mvp[ 7 ] + mvp[ 5 ];
            bottom[ 2 ] = mvp[ 11 ] + mvp[ 9 ];
            bottom[ 3 ] = mvp[ 15 ] + mvp[ 13 ];

            // Top clipping plane.
            var top = result[ 3 ];
            top[ 0 ] = mvp[ 3 ] - mvp[ 1 ];
            top[ 1 ] = mvp[ 7 ] - mvp[ 5 ];
            top[ 2 ] = mvp[ 11 ] - mvp[ 9 ];
            top[ 3 ] = mvp[ 15 ] - mvp[ 13 ];

            if ( withNearFar ) {
                // Far clipping plane.
                var far = result[ 4 ];
                far[ 0 ] = mvp[ 3 ] - mvp[ 2 ];
                far[ 1 ] = mvp[ 7 ] - mvp[ 6 ];
                far[ 2 ] = mvp[ 11 ] - mvp[ 10 ];
                far[ 3 ] = mvp[ 15 ] - mvp[ 14 ];

                // Near clipping plane.
                var near = result[ 5 ];
                near[ 0 ] = mvp[ 3 ] + mvp[ 2 ];
                near[ 1 ] = mvp[ 7 ] + mvp[ 6 ];
                near[ 2 ] = mvp[ 11 ] + mvp[ 10 ];
                near[ 3 ] = mvp[ 15 ] + mvp[ 14 ];
            }

            //Normalize the planes
            var j = withNearFar ? 6 : 4;
            for ( var i = 0; i < j; i++ ) {
                Plane.normalizeEquation( result[ i ] );
            }

        };
    } )(),

    makePerspective: function ( fovy, aspect, znear, zfar, result ) {
        return glm.mat4.perspective( result, fovy * Math.PI / 180.0, aspect, znear, zfar );
    },

    getFrustum: function ( matrix, result ) {
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

        result.left = left;
        result.right = right;
        result.top = top;
        result.bottom = bottom;
        result.zNear = zNear;
        result.zFar = zFar;

        return true;
    },

    getPerspective: ( function () {
        var c = {
            'right': 0,
            'left': 0,
            'top': 0,
            'bottom': 0,
            'zNear': 0,
            'zFar': 0
        };
        return function ( matrix, result ) {
            // get frustum and compute results
            var r = Matrix.getFrustum( matrix, c );
            if ( r ) {
                result.fovy = 180 / Math.PI * ( Math.atan( c.top / c.zNear ) - Math.atan( c.bottom / c.zNear ) );
                result.aspectRatio = ( c.right - c.left ) / ( c.top - c.bottom );
            }
            result.zNear = c.zNear;
            result.zFar = c.zFar;
            return result;
        };
    } )(),

    preMultScale: function ( m, scale ) {
        return glm.mat4.scale( m, m, scale );
    },

    postMultScale: function ( m, scale ) {
        return glm.mat4.multiply( m, glm.mat4.fromScaling( glm.mat4.create(), scale ), m );
    },

    makeScale: function ( x, y, z, result ) {
        return glm.mat4.fromScaling( result, [ x, y, z ] );
    },

    getScale: ( function () {
        var sx = vec3.create();
        var sy = vec3.create();
        var sz = vec3.create();
        return function ( matrix, result ) {
            sx[ 0 ] = matrix[ 0 ];
            sx[ 1 ] = matrix[ 4 ];
            sx[ 2 ] = matrix[ 8 ];
            sy[ 0 ] = matrix[ 1 ];
            sy[ 1 ] = matrix[ 5 ];
            sy[ 2 ] = matrix[ 9 ];
            sz[ 0 ] = matrix[ 2 ];
            sz[ 1 ] = matrix[ 6 ];
            sz[ 2 ] = matrix[ 10 ];

            result[ 0 ] = vec3.length( sx );
            result[ 1 ] = vec3.length( sy );
            result[ 2 ] = vec3.length( sz );
            return result;
        };
    } )(),

    getScale2: ( function () {
        var sx = vec3.create();
        var sy = vec3.create();
        var sz = vec3.create();
        return function ( matrix, result ) {
            sx[ 0 ] = matrix[ 0 ];
            sx[ 1 ] = matrix[ 4 ];
            sx[ 2 ] = matrix[ 8 ];
            sy[ 0 ] = matrix[ 1 ];
            sy[ 1 ] = matrix[ 5 ];
            sy[ 2 ] = matrix[ 9 ];
            sz[ 0 ] = matrix[ 2 ];
            sz[ 1 ] = matrix[ 6 ];
            sz[ 2 ] = matrix[ 10 ];

            result[ 0 ] = vec3.sqrLen( sx );
            result[ 1 ] = vec3.sqrLen( sy );
            result[ 2 ] = vec3.sqrLen( sz );
            return result;
        };
    } )(),

    clampProjectionMatrix: function ( projection, znear, zfar, nearFarRatio, resultNearFar ) {
        var epsilon = 1e-6;
        if ( zfar < znear - epsilon ) {
            Notify.log( 'clampProjectionMatrix not applied, invalid depth range, znear = ' + znear + '  zfar = ' + zfar, false, true );
            return false;
        }

        var desiredZnear, desiredZfar;
        if ( zfar < znear + epsilon ) {
            // znear and zfar are too close together and could cause divide by zero problems
            // late on in the clamping code, so move the znear and zfar apart.
            var average = ( znear + zfar ) * 0.5;
            znear = average - epsilon;
            zfar = average + epsilon;
            // OSG_INFO << '_clampProjectionMatrix widening znear and zfar to '<<znear<<' '<<zfar<<std::endl;
        }

        if ( Math.abs( projection[ 3 ] ) < epsilon &&
            Math.abs( projection[ 7 ] ) < epsilon &&
            Math.abs( projection[ 11 ] ) < epsilon ) {
            // OSG_INFO << 'Orthographic matrix before clamping'<<projection<<std::endl;

            var deltaSpan = ( zfar - znear ) * 0.02;
            if ( deltaSpan < 1.0 ) {
                deltaSpan = 1.0;
            }
            desiredZnear = znear - deltaSpan;
            desiredZfar = zfar + deltaSpan;

            // assign the clamped values back to the computed values.
            znear = desiredZnear;
            zfar = desiredZfar;

            projection[ 10 ] = -2.0 / ( desiredZfar - desiredZnear );
            projection[ 14 ] = -( desiredZfar + desiredZnear ) / ( desiredZfar - desiredZnear );

            // OSG_INFO << 'Orthographic matrix after clamping '<<projection<<std::endl;
        } else {

            // OSG_INFO << 'Persepective matrix before clamping'<<projection<<std::endl;
            //std::cout << '_computed_znear'<<_computed_znear<<std::endl;
            //std::cout << '_computed_zfar'<<_computed_zfar<<std::endl;

            var zfarPushRatio = 1.02;
            var znearPullRatio = 0.98;

            //znearPullRatio = 0.99;

            desiredZnear = znear * znearPullRatio;
            desiredZfar = zfar * zfarPushRatio;

            // near plane clamping.
            var minNearPlane = zfar * nearFarRatio;
            if ( desiredZnear < minNearPlane ) {
                desiredZnear = minNearPlane;
            }

            // assign the clamped values back to the computed values.
            znear = desiredZnear;
            zfar = desiredZfar;

            var m22 = projection[ 10 ];
            var m32 = projection[ 14 ];
            var m23 = projection[ 11 ];
            var m33 = projection[ 15 ];
            var transNearPlane = ( -desiredZnear * m22 + m32 ) / ( -desiredZnear * m23 + m33 );
            var transFarPlane = ( -desiredZfar * m22 + m32 ) / ( -desiredZfar * m23 + m33 );

            var ratio = Math.abs( 2.0 / ( transNearPlane - transFarPlane ) );
            var center = -( transNearPlane + transFarPlane ) / 2.0;

            var centerRatio = center * ratio;
            projection[ 2 ] = projection[ 2 ] * ratio + projection[ 3 ] * centerRatio;
            projection[ 6 ] = projection[ 6 ] * ratio + projection[ 7 ] * centerRatio;
            projection[ 10 ] = m22 * ratio + m23 * centerRatio;
            projection[ 14 ] = m32 * ratio + m33 * centerRatio;
            // same as
            // var matrix = [ 1.0, 0.0, 0.0, 0.0,
            //     0.0, 1.0, 0.0, 0.0,
            //     0.0, 0.0, ratio, 0.0,
            //     0.0, 0.0, center * ratio, 1.0
            // ];
            // mat4.mul( projection , matrix, projection );

            // OSG_INFO << 'Persepective matrix after clamping'<<projection<<std::endl;
        }
        if ( resultNearFar !== undefined ) {
            resultNearFar[ 0 ] = znear;
            resultNearFar[ 1 ] = zfar;
        }
        return true;
    },

    // compute the 4 corners vector of the frustum
    computeFrustumCornersVectors: function ( projectionMatrix, vectorsArray ) {
        //var znear = projectionMatrix[ 12 + 2 ] / ( projectionMatrix[ 8 + 2 ] - 1.0 );
        //var zfar = projectionMatrix[ 12 + 2 ] / ( projectionMatrix[ 8 + 2 ] + 1.0 );
        var x = 1.0 / projectionMatrix[ 0 ];
        var y = 1.0 / projectionMatrix[ 1 * 4 + 1 ];

        vectorsArray[ 0 ] = vec3.fromValues( -x, y, 1.0 );
        vectorsArray[ 1 ] = vec3.fromValues( -x, -y, 1.0 );
        vectorsArray[ 2 ] = vec3.fromValues( x, -y, 1.0 );
        vectorsArray[ 3 ] = vec3.fromValues( x, y, 1.0 );
        return vectorsArray;
    },

    // better precison
    // no far clipping artifacts.
    // no reason not to use.
    // Tightening the Precision of Perspective Rendering
    //http://www.geometry.caltech.edu/pubs/UD12.pdf
    // drop-in, just remove the one below, and rename this one
    makeFrustumInfinite: function ( left, right, bottom, top, znear, zfar, result ) {
        var X = 2.0 * znear / ( right - left );
        var Y = 2.0 * znear / ( top - bottom );
        var A = ( right + left ) / ( right - left );
        var B = ( top + bottom ) / ( top - bottom );
        var C = -1.0;
        Matrix.setRow( result, 0, X, 0.0, 0.0, 0.0 );
        Matrix.setRow( result, 1, 0.0, Y, 0.0, 0.0 );
        Matrix.setRow( result, 2, A, B, C, -1.0 );
        Matrix.setRow( result, 3, 0.0, 0.0, -2.0 * znear, 0.0 );
        return result;
    },

    makeFrustum: function ( left, right, bottom, top, znear, zfar, result ) {
        return glm.mat4.frustum( result, left, right, bottom, top, znear, zfar );
    },

    makeRotateFromQuat: function ( q, result ) {
        return glm.mat4.fromQuat( result, q );
    },

    setRotateFromQuat: function ( m, q ) {
        var length2 = glm.quat.sqrLen( q );
        if ( Mabs( length2 ) <= NMIN_VALUE ) {
            m[ 0 ] = 0.0;
            m[ 1 ] = 0.0;
            m[ 2 ] = 0.0;

            m[ 4 ] = 0.0;
            m[ 5 ] = 0.0;
            m[ 6 ] = 0.0;

            m[ 8 ] = 0.0;
            m[ 9 ] = 0.0;
            m[ 10 ] = 0.0;
        } else {
            var rlength2;
            // normalize quat if required.
            // We can avoid the expensive sqrt in this case since all 'coefficients' below are products of two q components.
            // That is a square of a square root, so it is possible to avoid that
            if ( length2 !== 1.0 ) {
                rlength2 = 2.0 / length2;
            } else {
                rlength2 = 2.0;
            }

            // Source: Gamasutra, Rotating Objects Using Quaternions
            //
            //http://www.gamasutra.com/features/19980703/quaternions_01.htm

            var wx, wy, wz, xx, yy, yz, xy, xz, zz, x2, y2, z2;

            // calculate coefficients
            x2 = rlength2 * q[ 0 ];
            y2 = rlength2 * q[ 1 ];
            z2 = rlength2 * q[ 2 ];

            xx = q[ 0 ] * x2;
            xy = q[ 0 ] * y2;
            xz = q[ 0 ] * z2;

            yy = q[ 1 ] * y2;
            yz = q[ 1 ] * z2;
            zz = q[ 2 ] * z2;

            wx = q[ 3 ] * x2;
            wy = q[ 3 ] * y2;
            wz = q[ 3 ] * z2;

            // Note.  Gamasutra gets the matrix assignments inverted, resulting
            // in left-handed rotations, which is contrary to OpenGL and OSG's
            // methodology.  The matrix assignment has been altered in the next
            // few lines of code to do the right thing.
            // Don Burns - Oct 13, 2001
            m[ 0 ] = 1.0 - ( yy + zz );
            m[ 4 ] = xy - wz;
            m[ 8 ] = xz + wy;


            m[ 0 + 1 ] = xy + wz;
            m[ 4 + 1 ] = 1.0 - ( xx + zz );
            m[ 8 + 1 ] = yz - wx;

            m[ 0 + 2 ] = xz - wy;
            m[ 4 + 2 ] = yz + wx;
            m[ 8 + 2 ] = 1.0 - ( xx + yy );
        }
        return m;
    }
};

Matrix.identity = Matrix.create();

module.exports = Matrix;
