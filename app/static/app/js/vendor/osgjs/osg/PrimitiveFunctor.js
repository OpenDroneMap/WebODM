'use strict';
var vec3 = require( 'osg/glMatrix' ).vec3;
var PrimitiveSet = require( 'osg/primitiveSet' );
var DrawElements = require( 'osg/DrawElements' );
var DrawArrays = require( 'osg/DrawArrays' );

/**
 * PrimitiveFunctor emulates the TemplatePrimitiveFunctor class in OSG and can
 * be used to get access to the vertices that compose the things drawn by osgjs.
 * Feed it with a callback that will be called for geometry.
 * The callback must be a closure and have the next structure:
 *
 * var myCallback = function(  ) {
 *     return {
 *          operatorPoint : function ( v ) { }, // Do your point operations here
 *          operatorLine : function ( v1, v2 ){ }, // Do you line operations here
 *          operatorTriangle : function ( v1, v2, v3 ) { } // Do your triangle operations here
 *      }
 * };
 *
 * Important Note: You should take into account that you are accesing the actual vertices of the primitive
 * you might want to do a copy of these values in your callback to avoid to modify the primitive geometry
 *  @class PrimitiveFunctor
 */

var PrimitiveFunctor = function ( geom, cb, vertices ) {
    this._geom = geom;
    this._cb = cb;
    this._vertices = vertices;
};

var functorDrawElements = PrimitiveFunctor.functorDrawElements = [];
var functorDrawArrays = PrimitiveFunctor.functorDrawArrays = [];

functorDrawElements[ PrimitiveSet.POINTS ] = ( function () {
    var v = vec3.create();
    return function ( offset, count, indexes, cb, vertices ) {

        var end = offset + count;
        for ( var i = offset; i < end; ++i ) {
            var j = indexes[ i ] * 3;
            v[ 0 ] = vertices[ j ];
            v[ 1 ] = vertices[ j + 1 ];
            v[ 2 ] = vertices[ j + 2 ];
            cb.operatorPoint( v );
        }
    };
} )();

functorDrawElements[ PrimitiveSet.LINES ] = ( function () {
    var v1 = vec3.create();
    var v2 = vec3.create();
    return function ( offset, count, indexes, cb, vertices ) {

        var end = offset + count;
        for ( var i = offset; i < end - 1; i += 2 ) {
            var j = indexes[ i ] * 3;
            v1[ 0 ] = vertices[ j ];
            v1[ 1 ] = vertices[ j + 1 ];
            v1[ 2 ] = vertices[ j + 2 ];
            j = indexes[ i + 1 ] * 3;
            v2[ 0 ] = vertices[ j ];
            v2[ 1 ] = vertices[ j + 1 ];
            v2[ 2 ] = vertices[ j + 2 ];
            cb.operatorLine( v1, v2 );
        }
    };
} )();

functorDrawElements[ PrimitiveSet.LINE_STRIP ] = ( function () {
    var v1 = vec3.create();
    var v2 = vec3.create();
    return function ( offset, count, indexes, cb, vertices ) {

        var end = offset + count;
        for ( var i = offset; i < end - 1; ++i ) {
            var j = indexes[ i ] * 3;
            v1[ 0 ] = vertices[ j ];
            v1[ 1 ] = vertices[ j + 1 ];
            v1[ 2 ] = vertices[ j + 2 ];
            j = indexes[ i + 1 ] * 3;
            v2[ 0 ] = vertices[ j ];
            v2[ 1 ] = vertices[ j + 1 ];
            v2[ 2 ] = vertices[ j + 2 ];
            cb.operatorLine( v1, v2 );
        }
    };
} )();

functorDrawElements[ PrimitiveSet.LINE_LOOP ] = ( function () {
    var v1 = vec3.create();
    var v2 = vec3.create();
    return function ( offset, count, indexes, cb, vertices ) {

        var last = offset + count - 1;
        for ( var i = offset; i < last; ++i ) {
            var j = indexes[ i ] * 3;
            v1[ 0 ] = vertices[ j ];
            v1[ 1 ] = vertices[ j + 1 ];
            v1[ 2 ] = vertices[ j + 2 ];
            j = indexes[ i + 1 ] * 3;
            v2[ 0 ] = vertices[ j ];
            v2[ 1 ] = vertices[ j + 1 ];
            v2[ 2 ] = vertices[ j + 2 ];
            cb.operatorLine( v1, v2 );
        }
        last = indexes[ last ] * 3;
        v1[ 0 ] = vertices[ last ];
        v1[ 1 ] = vertices[ last + 1 ];
        v1[ 2 ] = vertices[ last + 2 ];
        var first = indexes[ 0 ] * 3;
        v2[ 0 ] = vertices[ first ];
        v2[ 1 ] = vertices[ first + 1 ];
        v2[ 2 ] = vertices[ first + 2 ];
        cb.operatorLine( v1, v2 );
    };
} )();

functorDrawElements[ PrimitiveSet.TRIANGLES ] = ( function () {
    var v1 = vec3.create();
    var v2 = vec3.create();
    var v3 = vec3.create();
    return function ( offset, count, indexes, cb, vertices ) {

        var end = offset + count;
        for ( var i = offset; i < end; i += 3 ) {
            var j = indexes[ i ] * 3;
            v1[ 0 ] = vertices[ j ];
            v1[ 1 ] = vertices[ j + 1 ];
            v1[ 2 ] = vertices[ j + 2 ];
            j = indexes[ i + 1 ] * 3;
            v2[ 0 ] = vertices[ j ];
            v2[ 1 ] = vertices[ j + 1 ];
            v2[ 2 ] = vertices[ j + 2 ];
            j = indexes[ i + 2 ] * 3;
            v3[ 0 ] = vertices[ j ];
            v3[ 1 ] = vertices[ j + 1 ];
            v3[ 2 ] = vertices[ j + 2 ];
            cb.operatorTriangle( v1, v2, v3 );
        }
    };
} )();

functorDrawElements[ PrimitiveSet.TRIANGLE_STRIP ] = ( function () {
    var v1 = vec3.create();
    var v2 = vec3.create();
    var v3 = vec3.create();
    return function ( offset, count, indexes, cb, vertices ) {

        for ( var i = 2, pos = offset; i < count; ++i, ++pos ) {
            var j = indexes[ pos ] * 3;
            v1[ 0 ] = vertices[ j ];
            v1[ 1 ] = vertices[ j + 1 ];
            v1[ 2 ] = vertices[ j + 2 ];
            j = indexes[ pos + 1 ] * 3;
            v2[ 0 ] = vertices[ j ];
            v2[ 1 ] = vertices[ j + 1 ];
            v2[ 2 ] = vertices[ j + 2 ];
            j = indexes[ pos + 2 ] * 3;
            v3[ 0 ] = vertices[ j ];
            v3[ 1 ] = vertices[ j + 1 ];
            v3[ 2 ] = vertices[ j + 2 ];
            if ( i % 2 ) {
                cb.operatorTriangle( v1, v3, v2 );
            } else {
                cb.operatorTriangle( v1, v2, v3 );
            }
        }
    };
} )();

functorDrawElements[ PrimitiveSet.TRIANGLE_FAN ] = ( function () {
    var v1 = vec3.create();
    var v2 = vec3.create();
    var v3 = vec3.create();
    return function ( offset, count, indexes, cb, vertices ) {

        var first = indexes[ offset ];
        for ( var i = 2, pos = offset + 1; i < count; ++i, ++pos ) {
            v1[ 0 ] = vertices[ first ];
            v1[ 1 ] = vertices[ first + 1 ];
            v1[ 2 ] = vertices[ first + 2 ];
            var j = indexes[ pos ] * 3;
            v2[ 0 ] = vertices[ j ];
            v2[ 1 ] = vertices[ j + 1 ];
            v2[ 2 ] = vertices[ j + 2 ];
            j = indexes[ pos + 1 ] * 3;
            v3[ 0 ] = vertices[ j ];
            v3[ 1 ] = vertices[ j + 1 ];
            v3[ 2 ] = vertices[ j + 2 ];
            cb.operatorTriangle( v1, v2, v3 );
        }
    };
} )();

functorDrawArrays[ PrimitiveSet.POINTS ] = ( function () {
    var v = vec3.create();
    return function ( first, count, cb, vertices ) {

        for ( var i = first; i < first + count; ++i ) {
            var j = i * 3;
            v[ 0 ] = vertices[ j ];
            v[ 1 ] = vertices[ j + 1 ];
            v[ 2 ] = vertices[ j + 2 ];
            cb.operatorPoint( v );
        }
    };
} )();

functorDrawArrays[ PrimitiveSet.LINES ] = ( function () {
    var v1 = vec3.create();
    var v2 = vec3.create();
    return function ( first, count, cb, vertices ) {

        for ( var i = first; i < first + count - 1; i += 2 ) {
            var j = i * 3;
            v1[ 0 ] = vertices[ j ];
            v1[ 1 ] = vertices[ j + 1 ];
            v1[ 2 ] = vertices[ j + 2 ];
            j = ( i + 1 ) * 3;
            v2[ 0 ] = vertices[ j ];
            v2[ 1 ] = vertices[ j + 1 ];
            v2[ 2 ] = vertices[ j + 2 ];
            cb.operatorLine( v1, v2 );
        }
    };
} )();

functorDrawArrays[ PrimitiveSet.LINE_STRIP ] = ( function () {
    var v1 = vec3.create();
    var v2 = vec3.create();
    return function ( first, count, cb, vertices ) {

        for ( var i = first; i < first + count - 1; ++i ) {
            var j = i * 3;
            v1[ 0 ] = vertices[ j ];
            v1[ 1 ] = vertices[ j + 1 ];
            v1[ 2 ] = vertices[ j + 2 ];
            j = ( i + 1 ) * 3;
            v2[ 0 ] = vertices[ j ];
            v2[ 1 ] = vertices[ j + 1 ];
            v2[ 2 ] = vertices[ j + 2 ];
            cb.operatorLine( v1, v2 );
        }
    };
} )();

functorDrawArrays[ PrimitiveSet.LINE_LOOP ] = ( function () {
    var v1 = vec3.create();
    var v2 = vec3.create();
    return function ( first, count, cb, vertices ) {

        var last = first + count - 1;
        for ( var i = first; i < last; ++i ) {
            var j = i * 3;
            v1[ 0 ] = vertices[ j ];
            v1[ 1 ] = vertices[ j + 1 ];
            v1[ 2 ] = vertices[ j + 2 ];
            j = ( i + 1 ) * 3;
            v2[ 0 ] = vertices[ j ];
            v2[ 1 ] = vertices[ j + 1 ];
            v2[ 2 ] = vertices[ j + 2 ];
            cb.operatorLine( v1, v2 );
        }
        last = last * 3;
        v1[ 0 ] = vertices[ last ];
        v1[ 1 ] = vertices[ last + 1 ];
        v1[ 2 ] = vertices[ last + 2 ];
        first = first * 3;
        v2[ 0 ] = vertices[ first ];
        v2[ 1 ] = vertices[ first + 1 ];
        v2[ 2 ] = vertices[ first + 2 ];
        cb.operatorLine( v1, v2 );
    };
} )();

functorDrawArrays[ PrimitiveSet.TRIANGLES ] = ( function () {
    var v1 = vec3.create();
    var v2 = vec3.create();
    var v3 = vec3.create();
    return function ( first, count, cb, vertices ) {

        for ( var i = first; i < first + count; i += 3 ) {
            var j = i * 3;
            v1[ 0 ] = vertices[ j ];
            v1[ 1 ] = vertices[ j + 1 ];
            v1[ 2 ] = vertices[ j + 2 ];
            j = ( i + 1 ) * 3;
            v2[ 0 ] = vertices[ j ];
            v2[ 1 ] = vertices[ j + 1 ];
            v2[ 2 ] = vertices[ j + 2 ];
            j = ( i + 2 ) * 3;
            v3[ 0 ] = vertices[ j ];
            v3[ 1 ] = vertices[ j + 1 ];
            v3[ 2 ] = vertices[ j + 2 ];
            cb.operatorTriangle( v1, v2, v3 );
        }
    };
} )();

functorDrawArrays[ PrimitiveSet.TRIANGLE_STRIP ] = ( function () {
    var v1 = vec3.create();
    var v2 = vec3.create();
    var v3 = vec3.create();
    return function ( first, count, cb, vertices ) {

        for ( var i = 2, pos = first; i < count; ++i, ++pos ) {
            var j = pos * 3;
            v1[ 0 ] = vertices[ j ];
            v1[ 1 ] = vertices[ j + 1 ];
            v1[ 2 ] = vertices[ j + 2 ];
            j = ( pos + 1 ) * 3;
            v2[ 0 ] = vertices[ j ];
            v2[ 1 ] = vertices[ j + 1 ];
            v2[ 2 ] = vertices[ j + 2 ];
            j = ( pos + 2 ) * 3;
            v3[ 0 ] = vertices[ j ];
            v3[ 1 ] = vertices[ j + 1 ];
            v3[ 2 ] = vertices[ j + 2 ];
            if ( i % 2 ) {
                cb.operatorTriangle( v1, v3, v2 );
            } else {
                cb.operatorTriangle( v1, v2, v3 );
            }
        }
    };
} )();

functorDrawArrays[ PrimitiveSet.TRIANGLE_FAN ] = ( function () {
    var v1 = vec3.create();
    var v2 = vec3.create();
    var v3 = vec3.create();
    return function ( first, count, cb, vertices ) {

        for ( var i = 2, pos = first + 1; i < count; ++i, ++pos ) {
            v1[ 0 ] = vertices[ first ];
            v1[ 1 ] = vertices[ first + 1 ];
            v1[ 2 ] = vertices[ first + 2 ];
            var j = pos * 3;
            v2[ 0 ] = vertices[ j ];
            v2[ 1 ] = vertices[ j + 1 ];
            v2[ 2 ] = vertices[ j + 2 ];
            j = ( pos + 1 ) * 3;
            v3[ 0 ] = vertices[ j ];
            v3[ 1 ] = vertices[ j + 1 ];
            v3[ 2 ] = vertices[ j + 2 ];
            cb.operatorTriangle( v1, v2, v3 );
        }
    };
} )();

PrimitiveFunctor.prototype = {
    apply: function () {
        var geom = this._geom;
        var primitives = geom.primitives;
        if ( !primitives )
            return;

        var cb = this._cb();
        var cbFunctor;
        var vertices = this._vertices;

        var nbPrimitives = primitives.length;
        for ( var i = 0; i < nbPrimitives; i++ ) {

            var primitive = primitives[ i ];
            if ( primitive instanceof DrawElements ) {

                cbFunctor = functorDrawElements[ primitive.getMode() ];
                if ( cbFunctor ) {
                    var indexes = primitive.indices.getElements();
                    cbFunctor( primitive.getFirst() / indexes.BYTES_PER_ELEMENT, primitive.getCount(), indexes, cb, vertices );
                }

            } else if ( primitive instanceof DrawArrays ) {

                cbFunctor = functorDrawArrays[ primitive.getMode() ];
                if ( cbFunctor ) {
                    cbFunctor( primitive.getFirst(), primitive.getCount(), cb, vertices );
                }

            }
        }
    }
};

module.exports = PrimitiveFunctor;
