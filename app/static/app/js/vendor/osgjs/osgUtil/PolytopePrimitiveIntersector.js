'use strict';
var osgMath = require( 'osg/math' );
var vec3 = require( 'osg/glMatrix' ).vec3;
var PrimitiveFunctor = require( 'osg/PrimitiveFunctor' );


var PolytopeIntersection = function ( index, candidates, candidatesMasks, referencePlane, nodePath ) {
    this._index = index - 1; ///< primitive index
    this._distance = 0; ///< distance from reference plane
    this._maxDistance = -1; ///< maximum distance of intersection points from reference plane
    this._numPoints = 0;
    this._points = [];
    this._maxNumIntersections = 6;
    this._center = vec3.create();
    for ( var i = 0, j = candidates.length; i < j; i++ ) {
        if ( candidatesMasks[ i ] === 0 ) continue;
        this._points[ this._numPoints++ ] = vec3.clone( candidates[ i ] );
        vec3.add( this._center, this._center, candidates[ i ] );
        var distance = referencePlane[ 0 ] * candidates[ i ][ 0 ] + referencePlane[ 1 ] * candidates[ i ][ 1 ] + referencePlane[ 2 ] * candidates[ i ][ 2 ] + referencePlane[ 3 ];
        if ( distance > this._maxDistance ) this._maxDistance = distance;
        if ( this._numPoints === this._maxNumIntesections ) break;
    }
    vec3.scale( this._center, this._center, 1 / this._numPoints );
    this._distance = referencePlane[ 0 ] * this._center[ 0 ] + referencePlane[ 1 ] * this._center[ 1 ] + referencePlane[ 2 ] * this._center[ 2 ] + referencePlane[ 3 ];
    this.nodePath = nodePath;
};

var PlanesLine = function ( planeMask, pos, dir ) {
    this._planeMask = planeMask;
    this._pos = pos;
    this._dir = dir;
};
var PolytopePrimitiveIntersector = function () {
    this._intersections = [];
    this._nodePath = [];
    this._index = 0;
    this._referencePlane = [];
    this._planes = []; ///< active planes extracted from polytope
    this._lines = []; ///< all intersection lines of two polytope planes
    this._candidates = [];
    this._candidatesMasks = [];
    this._lines = [];
    this._planesMask = 0;
    this._limitOneIntersection = false;
    this._dimensionMask = undefined;
};

PolytopePrimitiveIntersector.prototype = {

    setNodePath: function ( np ) {
        this._nodePath = np;
    },

    set: function ( polytope, referencePlane ) {
        this._planes = polytope;
        this._referencePlane = referencePlane;
        this._planesMask = 0;
        this._lines.length = 0;
        for ( var i = 0; i < this._planes.length; i++ ) {
            this._planesMask = ( this._planesMask << 1 ) | 1;
        }
    },

    setDimensionMask: function ( mask ) {
        this._dimensionMask = mask;
    },

    apply: function ( node ) {
        if ( !node.getAttributes().Vertex ) {
            return;
        }
        var vertices = node.getAttributes().Vertex.getElements();
        var self = this;
        // The callback must be defined as a closure
        /* jshint asi: true */
        var cb = function () {
            return {
                operatorPoint: function ( v ) {
                    self.intersectPoint( v );
                },
                operatorLine: function ( v1, v2 ) {
                    self.intersectLine( v1, v2 );
                },
                operatorTriangle: function ( v1, v2, v3 ) {
                    self.intersectTriangle( v1, v2, v3 );
                }
            }
        };
        var pf = new PrimitiveFunctor( node, cb, vertices );
        pf.apply();
    },


    checkCandidatePoints: function ( insideMask ) {
        var selectorMask = 0x1;
        var numCands = this._candidates.length;
        for ( var i = 0, j = this._planes.length; i < j && numCands > 0; ++i, selectorMask <<= 1 ) {
            if ( insideMask & selectorMask ) continue;
            for ( var c = 0; c < this._candidates.length; ++c ) {
                if ( this._candidatesMasks[ c ] === 0 ) continue;
                if ( selectorMask & this._candidatesMasks[ c ] ) continue;
                if ( this.distance( this._planes[ i ], this._candidates[ c ] ) < 0.0 ) {
                    this._candidatesMasks[ c ] = 0;
                    --numCands;
                    if ( numCands === 0 ) return 0;
                }
            }
        }
        return numCands;
    },

    intersectPoint: ( function () {
        var hit = vec3.create();
        return function ( v ) {
            this._index++;
            if ( ( this._dimensionMask & ( 1 << 0 ) ) === 0 ) return;
            if ( this._limitOneIntersection && this._intersections.length > 0 ) return;
            var d;

            for ( var i = 0, j = this._planes.length; i < j; ++i ) {
                d = this.distance( this._planes[ i ], v );
                if ( d < 0.0 ) {
                    // point is outside the polytope
                    return;
                }
            }
            this._candidates = [];
            this._candidatesMasks = [];
            // Intersection found: Copy the value and push it
            vec3.copy( hit, v );
            this._candidates.push( hit );
            this._candidatesMasks.push( this._planesMask );
            this._intersections.push( new PolytopeIntersection( this._index, this._candidates, this._candidatesMasks, this._referencePlane, this._nodePath.slice( 0 ) ) );
        };
    } )(),


    intersectLine: ( function () {

        var hit = vec3.create();
        return function ( v1, v2 ) {
            this._index++;
            if ( ( this._dimensionMask & ( 1 << 1 ) ) === 0 ) return;
            if ( this._limitOneIntersection && this._intersections.length > 0 ) return;
            var v1Inside = true;
            var v2Inside = true;
            var selectorMask = 0x1;
            var insideMask = 0x0;
            this._candidates = [];
            this._candidatesMasks = [];
            var d1, d2, d1IsNegative, d2IsNegative;
            for ( var i = 0, j = this._planes.length; i < j; ++i, selectorMask <<= 1 ) {
                d1 = this.distance( this._planes[ i ], v1 );
                d2 = this.distance( this._planes[ i ], v2 );
                d1IsNegative = ( d1 < 0.0 );
                d2IsNegative = ( d2 < 0.0 );
                if ( d1IsNegative && d2IsNegative ) return; // line outside
                if ( !d1IsNegative && !d2IsNegative ) {
                    // completly inside this plane
                    insideMask |= selectorMask;
                    continue;
                }
                if ( d1IsNegative ) v1Inside = false;
                if ( d2IsNegative ) v2Inside = false;
                if ( d1 === 0.0 ) {
                    vec3.copy( hit, v1 );
                    this._candidates.push( hit );
                    this._candidatesMasks.push( selectorMask );
                } else if ( d2 === 0.0 ) {
                    vec3.copy( hit, v2 );
                    this._candidates.push( hit );
                    this._candidatesMasks.push( selectorMask );
                } else if ( d1IsNegative && !d2IsNegative ) {
                    //v1-(v2-v1)*(d1/(-d1+d2))) )
                    vec3.sub( hit, v2, v1 );
                    vec3.scale( hit, hit, d1 / ( -d1 + d2 ) );
                    vec3.sub( hit, v1, hit );
                    this._candidates.push( hit );
                    this._candidatesMasks.push( selectorMask );
                } else if ( !d1IsNegative && d2IsNegative ) {
                    //(v1+(v2-v1)*(d1/(d1-d2)))
                    vec3.sub( hit, v2, v1 );

                    vec3.scaleAndAdd( hit, v1, hit, d1 / ( d1 - d2 ) );

                    this._candidates.push( hit );
                    this._candidatesMasks.push( selectorMask );
                }
            }

            if ( insideMask === this._planesMask ) {
                this._candidates.push( vec3.clone( v1 ) );
                this._candidatesMasks.push( this._planesMask );
                this._candidates.push( vec3.clone( v2 ) );
                this._candidatesMasks.push( this._planesMask );
                this._intersections.push( new PolytopeIntersection( this._index, this._candidates, this._candidatesMasks, this._referencePlane, this._nodePath.slice( 0 ) ) );
                return;
            }

            var numCands = this.checkCandidatePoints( insideMask );
            if ( numCands > 0 ) {
                if ( v1Inside ) {
                    this._candidatesMasks.push( this._planesMask );
                    this._candidates.push( vec3.clone( v1 ) );
                }
                if ( v2Inside ) {
                    this._candidatesMasks.push( this._planesMask );
                    this._candidates.push( vec3.clone( v2 ) );
                }
                this._intersections.push( new PolytopeIntersection( this._index, this._candidates, this._candidatesMasks, this._referencePlane, this._nodePath.slice( 0 ) ) );
            }
        };
    } )(),

    intersectTriangle: ( function () {

        var tmpHit = vec3.create();
        // Only needed for special case, should we move it to a new function?
        var e1 = vec3.create();
        var e2 = vec3.create();
        var point = vec3.create();
        var p = vec3.create();
        var s = vec3.create();
        var q = vec3.create();
        return function ( v1, v2, v3 ) {
            this._index++;
            if ( ( this._dimensionMask & ( 1 << 2 ) ) === 0 ) return;
            if ( this._limitOneIntersection && this._intersections.length > 0 ) return;
            var selectorMask = 0x1;
            var insideMask = 0x0;
            this._candidates = [];
            this._candidatesMasks = [];
            var d1, d2, d3, d1IsNegative, d2IsNegative, d3IsNegative;
            for ( var i = 0, j = this._planes.length; i < j; ++i, selectorMask <<= 1 ) {
                d1 = this.distance( this._planes[ i ], v1 );
                d2 = this.distance( this._planes[ i ], v2 );
                d3 = this.distance( this._planes[ i ], v3 );
                d1IsNegative = ( d1 < 0.0 );
                d2IsNegative = ( d2 < 0.0 );
                d3IsNegative = ( d3 < 0.0 );

                if ( d1IsNegative && d2IsNegative && d3IsNegative ) return; // Triangle outside
                if ( !d1IsNegative && !d2IsNegative && !d3IsNegative ) {
                    // completly inside this plane
                    insideMask |= selectorMask;
                    continue;
                }
                // edge v1-v2 intersects
                if ( d1 === 0.0 ) {
                    vec3.copy( tmpHit, v1 );
                    this._candidates.push( vec3.clone( tmpHit ) );
                    this._candidatesMasks.push( selectorMask );
                } else if ( d2 === 0.0 ) {
                    vec3.copy( tmpHit, v2 );
                    this._candidates.push( vec3.clone( tmpHit ) );
                    this._candidatesMasks.push( selectorMask );
                } else if ( d1IsNegative && !d2IsNegative ) {
                    //v1-(v2-v1)*(d1/(-d1+d2))) )
                    vec3.sub( tmpHit, v2, v1 );
                    vec3.scale( tmpHit, tmpHit, d1 / ( -d1 + d2 ) );
                    vec3.sub( tmpHit, v1, tmpHit );
                    this._candidates.push( vec3.clone( tmpHit ) );
                    this._candidatesMasks.push( selectorMask );
                } else if ( !d1IsNegative && d2IsNegative ) {
                    //(v1+(v2-v1)*(d1/(d1-d2)))
                    vec3.sub( tmpHit, v2, v1 );

                    vec3.scaleAndAdd( tmpHit, v1, tmpHit, d1 / ( d1 - d2 ) );

                    this._candidates.push( vec3.clone( tmpHit ) );
                    this._candidatesMasks.push( selectorMask );
                }
                // edge v1-v3 intersects
                if ( d3 === 0.0 ) {
                    vec3.copy( tmpHit, v3 );
                    this._candidates.push( vec3.clone( tmpHit ) );
                    this._candidatesMasks.push( selectorMask );
                } else if ( d1IsNegative && !d3IsNegative ) {
                    // v1-(v3-v1)*(d1/(-d1+d3))
                    vec3.sub( tmpHit, v3, v1 );
                    vec3.scale( tmpHit, tmpHit, d1 / ( -d1 + d3 ) );
                    vec3.sub( tmpHit, v1, tmpHit );
                    this._candidates.push( vec3.clone( tmpHit ) );
                    this._candidatesMasks.push( selectorMask );
                } else if ( !d1IsNegative && d3IsNegative ) {
                    // v1+(v3-v1)*(d1/(d1-d3))
                    vec3.sub( tmpHit, v3, v1 );

                    vec3.scaleAndAdd( tmpHit, v1, tmpHit, d1 / ( d1 - d3 ) );

                    this._candidates.push( vec3.clone( tmpHit ) );
                    this._candidatesMasks.push( selectorMask );
                }
                // edge v2-v3 intersects
                if ( d2IsNegative && !d3IsNegative ) {
                    // v2-(v3-v2)*(d2/(-d2+d3))
                    vec3.sub( tmpHit, v3, v2 );
                    vec3.scale( tmpHit, tmpHit, d2 / ( -d2 + d3 ) );
                    vec3.sub( tmpHit, v2, tmpHit );
                    this._candidates.push( vec3.clone( tmpHit ) );
                    this._candidatesMasks.push( selectorMask );
                } else if ( !d2IsNegative && d3IsNegative ) {
                    //v2+(v3-v2)*(d2/(d2-d3))
                    vec3.sub( tmpHit, v3, v2 );

                    vec3.scaleAndAdd( tmpHit, v2, tmpHit, d2 / ( d2 - d3 ) );

                    this._candidates.push( vec3.clone( tmpHit ) );
                    this._candidatesMasks.push( selectorMask );
                }
            }
            if ( insideMask === this._planesMask ) {
                // triangle lies inside of all planes
                this._candidates.push( vec3.clone( v1 ) );
                this._candidatesMasks.push( this._planesMask );
                this._candidates.push( vec3.clone( v2 ) );
                this._candidatesMasks.push( this._planesMask );
                this._candidates.push( vec3.clone( v3 ) );
                this._candidatesMasks.push( this._planesMask );
                this._intersections.push( new PolytopeIntersection( this._index, this._candidates, this._candidatesMasks, this._referencePlane, this._nodePath.slice( 0 ) ) );
                return;
            }
            var numCands = this.checkCandidatePoints( insideMask );
            if ( numCands > 0 ) {
                this._intersections.push( new PolytopeIntersection( this._index, this._candidates, this._candidatesMasks, this._referencePlane, this._nodePath.slice( 0 ) ) );
                return;
            }
            // handle case where the polytope goes through the triangle
            // without containing any point of it
            // Probably it can be moved to other function and do the relevant closures.

            var lines = this.getPolytopeLines();
            this._candidates = [];
            this._candidatesMasks = [];
            // check all polytope lines against the triangle
            // use algorithm from "Real-time rendering" (second edition) pp.580
            //var e1= vec3.create();
            //var e2= vec3.create();

            vec3.sub( e1, v2, v1 );
            vec3.sub( e2, v3, v1 );
            for ( i = 0; i < lines.length; ++i ) {
                //var point = vec3.create();
                //var p = vec3.create();
                vec3.cross( p, lines[ i ]._dir, e2 );
                var a = vec3.dot( e1, p );
                if ( Math.abs( a ) < 1E-6 ) continue;
                var f = 1.0 / a;
                //var s = vec3.create();
                vec3.sub( s, lines[ i ]._pos, v1 );
                var u = f * ( vec3.dot( s, p ) );
                if ( u < 0.0 || u > 1.0 ) continue;
                //var q = vec3.create();
                vec3.cross( q, s, e1 );
                var v = f * ( vec3.dot( lines[ i ]._dir, q ) );
                if ( v < 0.0 || u + v > 1.0 ) continue;
                var t = f * ( vec3.dot( e2, q ) );

                vec3.scaleAndAdd( point, lines[ i ]._pos, lines[ i ]._dir, t );

                this._candidates.push( vec3.copy( vec3.create(), point ) );
                this._candidatesMasks.push( lines[ i ]._planeMask );
            }
            numCands = this.checkCandidatePoints( insideMask );
            if ( numCands > 0 ) {
                this._intersections.push( new PolytopeIntersection( this._index, this._candidates, this._candidatesMasks, this._referencePlane, this._nodePath.slice( 0 ) ) );
                return;
            }
        };
    } )(),

    getPolytopeLines: ( function () {
        var lineDirection = vec3.create();
        var searchDirection = vec3.create();
        var normal1 = vec3.create();
        var point1 = vec3.create();
        var normal2 = vec3.create();
        var linePoint = vec3.create();
        var epsilon = 1E-6;
        return function () {
            if ( this._lines.length > 0 ) return this._lines; // Polytope lines already calculated
            var selectorMask = 0x1;
            for ( var i = 0, j = this._planes.length; i < j; i++, selectorMask <<= 1 ) {
                vec3.copy( normal1, this.getNormal( this._planes[ i ] ) );
                vec3.scale( point1, normal1, -this._planes[ i ][ 3 ] ); // canonical point on plane[ i ]
                var subSelectorMask = ( selectorMask << 1 );
                for ( var jt = i + 1, k = this._planes.length; jt < k; ++jt, subSelectorMask <<= 1 ) {
                    vec3.copy( normal2, this.getNormal( this._planes[ jt ] ) );
                    if ( Math.abs( vec3.dot( normal1, normal2 ) ) > ( 1.0 - epsilon ) ) continue;
                    vec3.cross( lineDirection, normal1, normal2 );
                    vec3.cross( searchDirection, lineDirection, normal1 );
                    //-plane2.distance(point1)/(searchDirection*normal2);
                    var searchDist = -this.distance( this._planes[ jt ], point1 ) / vec3.dot( searchDirection, normal2 );
                    if ( osgMath.isNaN( searchDist ) ) continue;

                    vec3.scaleAndAdd( linePoint, point1, searchDirection, searchDist );

                    this._lines.push( new PlanesLine( selectorMask | subSelectorMask, vec3.clone( linePoint ), vec3.clone( lineDirection ) ) );
                }
            }
            return this._lines;
        };
    } )(),

    setLimitOneIntersection: function ( limit ) {
        this._limitOneIntersection = limit;
    },

    distance: function ( plane, v ) {
        var d = plane[ 0 ] * v[ 0 ] + plane[ 1 ] * v[ 1 ] + plane[ 2 ] * v[ 2 ] + plane[ 3 ];
        return d;
    },

    getNormal: ( function () {
        var normal = vec3.create();
        return function ( plane ) {
            normal[ 0 ] = plane[ 0 ];
            normal[ 1 ] = plane[ 1 ];
            normal[ 2 ] = plane[ 2 ];
            return normal;
        };
    } )()
};

module.exports = PolytopePrimitiveIntersector;
