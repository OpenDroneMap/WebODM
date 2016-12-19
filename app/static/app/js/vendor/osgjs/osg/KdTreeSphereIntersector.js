'use strict';
var MACROUTILS = require( 'osg/Utils' );
var vec3 = require( 'osg/glMatrix' ).vec3;
var KdTreeRayIntersector = require( 'osg/KdTreeRayIntersector' );
var TriangleSphereIntersector = require( 'osgUtil/TriangleSphereIntersector' );


var KdTreeSphereIntersector = function () {

    this._intersector = new TriangleSphereIntersector();

};

KdTreeSphereIntersector.prototype = MACROUTILS.objectInherit( KdTreeRayIntersector.prototype, {

    init: function ( intersections, center, radius, nodePath ) {

        this._intersector._intersections = intersections;
        this._intersector.setNodePath( nodePath );
        this._intersector.set( center, radius );
        this._center = center;
        this._radius = radius;

    },

    intersect: ( function () {

        var v0 = vec3.create();
        var v1 = vec3.create();
        var v2 = vec3.create();

        return function ( node ) {
            var first = node._first;
            var second = node._second;
            var triangles = this._triangles;
            var vertices = this._vertices;

            if ( first < 0 ) {
                // treat as a leaf
                var istart = -first - 1;
                var iend = istart + second;
                var intersector = this._intersector;
                intersector.index = istart;

                for ( var i = istart; i < iend; ++i ) {
                    var id = i * 3;
                    var iv0 = triangles[ id ];
                    var iv1 = triangles[ id + 1 ];
                    var iv2 = triangles[ id + 2 ];

                    var j = iv0 * 3;
                    v0[ 0 ] = vertices[ j ];
                    v0[ 1 ] = vertices[ j + 1 ];
                    v0[ 2 ] = vertices[ j + 2 ];

                    j = iv1 * 3;
                    v1[ 0 ] = vertices[ j ];
                    v1[ 1 ] = vertices[ j + 1 ];
                    v1[ 2 ] = vertices[ j + 2 ];

                    j = iv2 * 3;
                    v2[ 0 ] = vertices[ j ];
                    v2[ 1 ] = vertices[ j + 1 ];
                    v2[ 2 ] = vertices[ j + 2 ];

                    intersector.intersect( v0, v1, v2, iv0, iv1, iv2 );
                }
            } else {
                if ( first > 0 ) {
                    if ( this.intersectSphere( this._kdNodes[ first ]._bb ) ) {
                        this.intersect( this._kdNodes[ first ] );
                    }
                }
                if ( second > 0 ) {
                    if ( this.intersectSphere( this._kdNodes[ second ]._bb ) ) {
                        this.intersect( this._kdNodes[ second ] );
                    }
                }
            }
        };
    } )(),
    intersectSphere: ( function () {
        var tmp = vec3.create();
        return function ( bb ) {
            var r = this._radius + bb.radius();
            return vec3.sqrDist( bb.center( tmp ), this._center ) <= r * r;
        };
    } )()
} );

module.exports = KdTreeSphereIntersector;
