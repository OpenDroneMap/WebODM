'use strict';
var Notify = require( 'osg/notify' );
var MACROUTILS = require( 'osg/Utils' );
var vec3 = require( 'osg/glMatrix' ).vec3;
var mat4 = require( 'osg/glMatrix' ).mat4;


var BoundingBox = function () {
    this._min = vec3.create();
    this._max = vec3.create();
    this.init();
};
BoundingBox.prototype = MACROUTILS.objectLibraryClass( {

    init: function () {
        vec3.copy( this._min, vec3.INFINITY );
        vec3.copy( this._max, vec3.NEGATIVE_INFINITY );
    },

    copy: function ( bbox ) {
        var min = this._min;
        var bmin = bbox._min;
        min[ 0 ] = bmin[ 0 ];
        min[ 1 ] = bmin[ 1 ];
        min[ 2 ] = bmin[ 2 ];

        var max = this._max;
        var bmax = bbox._max;
        max[ 0 ] = bmax[ 0 ];
        max[ 1 ] = bmax[ 1 ];
        max[ 2 ] = bmax[ 2 ];
    },

    valid: function () {
        return ( this._max[ 0 ] >= this._min[ 0 ] && this._max[ 1 ] >= this._min[ 1 ] && this._max[ 2 ] >= this._min[ 2 ] );
    },

    expandByBoundingSphere: function ( bs ) {
        if ( !bs.valid() ) {
            return;
        }
        var max = this._max;
        var min = this._min;
        var radius = bs._radius;
        var x = bs._center[ 0 ];
        var y = bs._center[ 1 ];
        var z = bs._center[ 2 ];
        min[ 0 ] = Math.min( min[ 0 ], x - radius );
        min[ 1 ] = Math.min( min[ 1 ], y - radius );
        min[ 2 ] = Math.min( min[ 2 ], z - radius );

        max[ 0 ] = Math.max( max[ 0 ], x + radius );
        max[ 1 ] = Math.max( max[ 1 ], y + radius );
        max[ 2 ] = Math.max( max[ 2 ], z + radius );
    },

    expandBySphere: function ( bs ) {
        Notify.log( 'BoundingBox.expandBySphere is deprecated, use instead BoundBox.expandByBoundingSphere' );
        return this.expandByBoundingSphere( bs );
    },

    expandByvec3: function ( v ) {
        var min = this._min;
        var max = this._max;
        min[ 0 ] = Math.min( min[ 0 ], v[ 0 ] );
        min[ 1 ] = Math.min( min[ 1 ], v[ 1 ] );
        min[ 2 ] = Math.min( min[ 2 ], v[ 2 ] );

        max[ 0 ] = Math.max( max[ 0 ], v[ 0 ] );
        max[ 1 ] = Math.max( max[ 1 ], v[ 1 ] );
        max[ 2 ] = Math.max( max[ 2 ], v[ 2 ] );
    },

    expandByBoundingBox: function ( bb ) {
        if ( !bb.valid() )
            return;

        var min = this._min;
        var max = this._max;
        var bbmin = bb._min;
        var bbmax = bb._max;

        if ( bbmin[ 0 ] < min[ 0 ] ) min[ 0 ] = bbmin[ 0 ];
        if ( bbmax[ 0 ] > max[ 0 ] ) max[ 0 ] = bbmax[ 0 ];

        if ( bbmin[ 1 ] < min[ 1 ] ) min[ 1 ] = bbmin[ 1 ];
        if ( bbmax[ 1 ] > max[ 1 ] ) max[ 1 ] = bbmax[ 1 ];

        if ( bbmin[ 2 ] < min[ 2 ] ) min[ 2 ] = bbmin[ 2 ];
        if ( bbmax[ 2 ] > max[ 2 ] ) max[ 2 ] = bbmax[ 2 ];
    },

    center: function ( result ) {
        var min = this._min;
        var max = this._max;
        result[ 0 ] = ( min[ 0 ] + max[ 0 ] ) * 0.5;
        result[ 1 ] = ( min[ 1 ] + max[ 1 ] ) * 0.5;
        result[ 2 ] = ( min[ 2 ] + max[ 2 ] ) * 0.5;
        return result;
    },

    radius: function () {
        return Math.sqrt( this.radius2() );
    },

    radius2: function () {
        var min = this._min;
        var max = this._max;
        var dx = max[ 0 ] - min[ 0 ];
        var dy = max[ 1 ] - min[ 1 ];
        var dz = max[ 2 ] - min[ 2 ];
        return 0.25 * ( dx * dx + dy * dy + dz * dz );
    },

    getMin: function () {
        return this._min;
    },

    getMax: function () {
        return this._max;
    },

    setMin: function ( min ) {
        vec3.copy( this._min, min );
        return this;
    },

    setMax: function ( max ) {
        vec3.copy( this._max, max );
        return this;
    },

    xMax: function () {
        return this._max[ 0 ];
    },

    yMax: function () {
        return this._max[ 1 ];
    },

    zMax: function () {
        return this._max[ 2 ];
    },

    xMin: function () {
        return this._min[ 0 ];
    },

    yMin: function () {
        return this._min[ 1 ];
    },

    zMin: function () {
        return this._min[ 2 ];
    },

    corner: function ( pos, ret ) {
        /*jshint bitwise: false */
        if ( pos & 1 ) {
            ret[ 0 ] = this._max[ 0 ];
        } else {
            ret[ 0 ] = this._min[ 0 ];
        }
        if ( pos & 2 ) {
            ret[ 1 ] = this._max[ 1 ];
        } else {
            ret[ 1 ] = this._min[ 1 ];
        }
        if ( pos & 4 ) {
            ret[ 2 ] = this._max[ 2 ];
        } else {
            ret[ 2 ] = this._min[ 2 ];
        }
        return ret;
        /*jshint bitwise: true */
    },

    // http://dev.theomader.com/transform-bounding-boxes/
    // https://github.com/erich666/GraphicsGems/blob/master/gems/TransBox.c
    transformMat4: ( function () {
        var tmpMin = vec3.create();
        var tmpMax = vec3.create();
        return function ( out, m ) {

            var inMin = this.getMin();
            var inMax = this.getMax();

            /* Take care of translation by beginning at T. */
            mat4.getTranslation( tmpMin, m );
            vec3.copy( tmpMax, tmpMin );

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
                        tmpMin[ j ] += a;
                        tmpMax[ j ] += b;
                    } else {
                        tmpMin[ j ] += b;
                        tmpMax[ j ] += a;
                    }
                }
            }
            var outMax = out.getMax();
            var outMin = out.getMin();

            outMax[ 0 ] = tmpMax[ 0 ];
            outMax[ 1 ] = tmpMax[ 1 ];
            outMax[ 2 ] = tmpMax[ 2 ];

            outMin[ 0 ] = tmpMin[ 0 ];
            outMin[ 1 ] = tmpMin[ 1 ];
            outMin[ 2 ] = tmpMin[ 2 ];

            return out;
        };
    } )()

}, 'osg', 'BoundingBox' );

module.exports = BoundingBox;
