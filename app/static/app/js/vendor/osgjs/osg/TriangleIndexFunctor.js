'use strict';

var PrimitiveSet = require( 'osg/primitiveSet' );
var DrawElements = require( 'osg/DrawElements' );
var DrawArrays = require( 'osg/DrawArrays' );

// This class can be used to visit all the triangles of a geometry
var TriangleIndexFunctor = function () {};

var functorDrawElements = TriangleIndexFunctor.functorDrawElements = [];
var functorDrawArrays = TriangleIndexFunctor.functorDrawArrays = [];

functorDrawElements[ PrimitiveSet.TRIANGLES ] = function ( offset, count, indexes, cb ) {
    var end = offset + count;
    for ( var i = offset; i < end; i += 3 ) {
        cb( indexes[ i ], indexes[ i + 1 ], indexes[ i + 2 ] );
    }
};

functorDrawElements[ PrimitiveSet.TRIANGLE_STRIP ] = function ( offset, count, indexes, cb ) {
    for ( var i = 2, j = offset; i < count; ++i, ++j ) {
        if ( i % 2 ) cb( indexes[ j ], indexes[ j + 2 ], indexes[ j + 1 ] );
        else cb( indexes[ j ], indexes[ j + 1 ], indexes[ j + 2 ] );
    }
};

functorDrawElements[ PrimitiveSet.TRIANGLE_FAN ] = function ( offset, count, indexes, cb ) {
    var first = indexes[ offset ];
    for ( var i = 2, j = offset + 1; i < count; ++i, ++j ) {
        cb( first, indexes[ j ], indexes[ j + 1 ] );
    }
};

functorDrawArrays[ PrimitiveSet.TRIANGLES ] = function ( first, count, cb ) {
    for ( var i = 2, pos = first; i < count; i += 3, pos += 3 ) {
        cb( pos, pos + 1, pos + 2 );
    }
};

functorDrawArrays[ PrimitiveSet.TRIANGLE_STRIP ] = function ( first, count, cb ) {
    for ( var i = 2, pos = first; i < count; ++i, ++pos ) {
        if ( i % 2 ) cb( pos, pos + 2, pos + 1 );
        else cb( pos, pos + 1, pos + 2 );
    }
};

functorDrawArrays[ PrimitiveSet.TRIANGLE_FAN ] = function ( first, count, cb ) {
    for ( var i = 2, pos = first + 1; i < count; ++i, ++pos ) {
        cb( first, pos, pos + 1 );
    }
};


TriangleIndexFunctor.prototype = {

    // You feed it with a callback that will be called for each triangle
    // (with the 3 indexes of vertices as arguments)
    init: function ( geom, cb ) {
        this._geom = geom;
        this._cb = cb;
    },

    apply: function () {
        var geom = this._geom;
        var primitives = geom.primitives;
        if ( !primitives )
            return;

        var cb = this._cb;
        var cbFunctor;

        var nbPrimitives = primitives.length;
        for ( var i = 0; i < nbPrimitives; i++ ) {

            var primitive = primitives[ i ];
            if ( primitive instanceof DrawElements ) {

                cbFunctor = functorDrawElements[ primitive.getMode() ];
                if ( cbFunctor ) {
                    var indexes = primitive.indices.getElements();
                    cbFunctor( primitive.getFirst() / indexes.BYTES_PER_ELEMENT, primitive.getCount(), indexes, cb );
                }

            } else if ( primitive instanceof DrawArrays ) {

                cbFunctor = functorDrawArrays[ primitive.getMode() ];
                if ( cbFunctor ) {
                    cbFunctor( primitive.getFirst(), primitive.getCount(), cb );
                }

            }
        }
    }
};

module.exports = TriangleIndexFunctor;
