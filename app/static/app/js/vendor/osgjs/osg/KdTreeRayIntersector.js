'use strict';
var vec3 = require( 'osg/glMatrix' ).vec3;
var TriangleIntersector = require( 'osgUtil/TriangleIntersector' );
var Notify = require( 'osg/notify' );

var KdTreeRayIntersector = function () {

    if ( arguments && arguments.length ) {
        Notify.warn( 'using ctor as initialiser is deprecated, use init(intersections, start, end, nodePath) and/or     setKdtree: function ( vertices, nodes, triangles )' );
    }

    this._intersector = new TriangleIntersector();
    this._dInvX = vec3.create();
    this._dInvY = vec3.create();
    this._dInvZ = vec3.create();

};

KdTreeRayIntersector.prototype = {
    setKdtree: function ( vertices, nodes, triangles ) {
        this._vertices = vertices;
        this._kdNodes = nodes;
        this._triangles = triangles;
    },
    init: ( function () {

        var dir = vec3.create();

        return function ( intersections, start, end, nodePath ) {
            var d = vec3.sub( dir, end, start );
            var len = vec3.length( d );
            var invLen = 0.0;
            if ( len !== 0.0 )
                invLen = 1.0 / len;
            vec3.scale( d, d, invLen );
            if ( d[ 0 ] !== 0.0 ) vec3.scale( this._dInvX, d, 1.0 / d[ 0 ] );
            if ( d[ 1 ] !== 0.0 ) vec3.scale( this._dInvY, d, 1.0 / d[ 1 ] );
            if ( d[ 2 ] !== 0.0 ) vec3.scale( this._dInvZ, d, 1.0 / d[ 2 ] );

            this._intersector._intersections = intersections;
            this._intersector.setNodePath( nodePath );
            this._intersector.set( start, end );
        };
    } )(),
    // Classic ray intersection test
    // If it's a leaf it does ray-triangles intersection with the triangles in the cell
    // If it's not a leaf, it descend in the tree in a recursive way as long as the ray
    // intersects the boundinbox of the nodes
    intersect: ( function () {

        var v0 = vec3.create();
        var v1 = vec3.create();
        var v2 = vec3.create();

        return function ( node, ls, le ) {
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
                var s = node._nodeRayStart;
                var e = node._nodeRayEnd;
                var kNodes = this._kdNodes;

                var kNode;
                vec3.copy( s, ls );
                vec3.copy( e, le );
                if ( first > 0 ) {
                    kNode = kNodes[ first ];
                    if ( this.intersectAndClip( s, e, kNode._bb ) ) {
                        this.intersect( kNode, s, e );
                    }
                }
                if ( second > 0 ) {
                    vec3.copy( s, ls );
                    vec3.copy( e, le );
                    kNode = kNodes[ second ];
                    if ( this.intersectAndClip( s, e, kNode._bb ) ) {
                        this.intersect( kNode, s, e );
                    }
                }
            }
        };
    } )(),
    // This method do 2 things
    // It test if the ray intersects the node
    // If so... it clip the ray so that the start and end point of the ray are
    // snapped to the bounding box of the nodes
    intersectAndClip: ( function () {

        return function ( s, e, bb ) {
            var min = bb._min;
            var xmin = min[ 0 ];
            var ymin = min[ 1 ];
            var zmin = min[ 2 ];

            var max = bb._max;
            var xmax = max[ 0 ];
            var ymax = max[ 1 ];
            var zmax = max[ 2 ];

            var invX = this._dInvX;
            var invY = this._dInvY;
            var invZ = this._dInvZ;

            if ( s[ 0 ] <= e[ 0 ] ) {
                // trivial reject of segment wholely outside.
                if ( e[ 0 ] < xmin ) return false;
                if ( s[ 0 ] > xmax ) return false;

                if ( s[ 0 ] < xmin ) {
                    // clip s to xMin.
                    vec3.scaleAndAdd( s, s, invX, xmin - s[ 0 ] );
                }

                if ( e[ 0 ] > xmax ) {
                    // clip e to xMax.
                    vec3.scaleAndAdd( e, s, invX, xmax - s[ 0 ] );
                }
            } else {
                if ( s[ 0 ] < xmin ) return false;
                if ( e[ 0 ] > xmax ) return false;

                if ( e[ 0 ] < xmin ) {
                    // clip s to xMin.
                    vec3.scaleAndAdd( e, s, invX, xmin - s[ 0 ] );
                }

                if ( s[ 0 ] > xmax ) {
                    // clip e to xMax.
                    vec3.scaleAndAdd( s, s, invX, xmax - s[ 0 ] );
                }
            }

            // compate s and e against the yMin to yMax range of bb.
            if ( s[ 1 ] <= e[ 1 ] ) {

                // trivial reject of segment wholely outside.
                if ( e[ 1 ] < ymin ) return false;
                if ( s[ 1 ] > ymax ) return false;

                if ( s[ 1 ] < ymin ) {
                    // clip s to yMin.
                    vec3.scaleAndAdd( s, s, invY, ymin - s[ 1 ] );
                }

                if ( e[ 1 ] > ymax ) {
                    // clip e to yMax.
                    vec3.scaleAndAdd( e, s, invY, ymax - s[ 1 ] );
                }
            } else {
                if ( s[ 1 ] < ymin ) return false;
                if ( e[ 1 ] > ymax ) return false;

                if ( e[ 1 ] < ymin ) {
                    // clip s to yMin.
                    vec3.scaleAndAdd( e, s, invY, ymin - s[ 1 ] );
                }

                if ( s[ 1 ] > ymax ) {
                    // clip e to yMax.
                    vec3.scaleAndAdd( s, s, invY, ymax - s[ 1 ] );
                }
            }

            // compate s and e against the zMin to zMax range of bb.
            if ( s[ 2 ] <= e[ 2 ] ) {
                // trivial reject of segment wholely outside.
                if ( e[ 2 ] < zmin ) return false;
                if ( s[ 2 ] > zmax ) return false;

                if ( s[ 2 ] < zmin ) {
                    // clip s to zMin.
                    vec3.scaleAndAdd( s, s, invZ, zmin - s[ 2 ] );
                }

                if ( e[ 2 ] > zmax ) {
                    // clip e to zMax.
                    vec3.scaleAndAdd( e, s, invZ, zmax - s[ 2 ] );
                }
            } else {
                if ( s[ 2 ] < zmin ) return false;
                if ( e[ 2 ] > zmax ) return false;

                if ( e[ 2 ] < zmin ) {
                    // clip s to zMin.
                    vec3.scaleAndAdd( e, s, invZ, zmin - s[ 2 ] );
                }

                if ( s[ 2 ] > zmax ) {
                    // clip e to zMax.
                    vec3.scaleAndAdd( s, s, invZ, zmax - s[ 2 ] );
                }
            }
            return true;
        };
    } )()
};

module.exports = KdTreeRayIntersector;
