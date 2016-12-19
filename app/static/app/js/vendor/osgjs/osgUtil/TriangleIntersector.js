'use strict';

var vec3 = require( 'osg/glMatrix' ).vec3;
var mat4 = require( 'osg/glMatrix' ).mat4;
var TriangleIndexFunctor = require( 'osg/TriangleIndexFunctor' );
var Notify = require( 'osg/notify' );
var ComputeMatrixFromNodePath = require( 'osg/computeMatrixFromNodePath' );

var TriangleIntersection = function ( normal, i1, i2, i3, r1, r2, r3 ) {
    this.normal = normal;

    this.i1 = i1;
    this.i2 = i2;
    this.i3 = i3;

    this.r1 = r1;
    this.r2 = r2;
    this.r3 = r3;
};

var TriangleIntersector = function () {

    if ( arguments && arguments.length ) {
        Notify.warn( 'using ctor as initialiser is deprecated, use set(start, end)' );
    }

    this._intersections = [];
    this._nodePath = [];
    this._dir = vec3.create();
};

TriangleIntersector.prototype = {
    reset: function () {
        this._intersections.length = 0;
    },
    setNodePath: function ( np ) {
        this._nodePath = np;
    },
    set: function ( start, end ) {
        this._start = start;
        this._end = end;
        this._dir = vec3.sub( this._dir, end, start );
        this._length = vec3.length( this._dir );
        this._invLength = 1.0 / this._length;
        vec3.scale( this._dir, this._dir, this._invLength );
    },

    apply: ( function () {

        var v1 = vec3.create();
        var v2 = vec3.create();
        var v3 = vec3.create();
        var tif = new TriangleIndexFunctor();

        return function ( node ) {

            if ( !node.getAttributes().Vertex ) {
                return;
            }
            var vertices = node.getAttributes().Vertex.getElements();
            var self = this;

            var cb = function ( i1, i2, i3 ) {

                if ( i1 === i2 || i1 === i3 || i2 === i3 )
                    return;

                var j = i1 * 3;
                v1[ 0 ] = vertices[ j ];
                v1[ 1 ] = vertices[ j + 1 ];
                v1[ 2 ] = vertices[ j + 2 ];

                j = i2 * 3;
                v2[ 0 ] = vertices[ j ];
                v2[ 1 ] = vertices[ j + 1 ];
                v2[ 2 ] = vertices[ j + 2 ];

                j = i3 * 3;
                v3[ 0 ] = vertices[ j ];
                v3[ 1 ] = vertices[ j + 1 ];
                v3[ 2 ] = vertices[ j + 2 ];

                self.intersect( v1, v2, v3, i1, i2, i3 );
            };
            tif.init( node, cb );
            tif.apply();

        };
    } )(),

    isBackFace: ( function () {

        var mat = mat4.create();

        return function ( det, nodepath ) {
            mat4.identity( mat );
            // http://gamedev.stackexchange.com/questions/54505/negative-scale-in-matrix-4x4
            // https://en.wikipedia.org/wiki/Determinant#Orientation_of_a_basis
            // you can't exactly extract scale of a matrix but the determinant will tell you
            // if the orientation is preserved
            ComputeMatrixFromNodePath.computeLocalToWorld( nodepath, true, mat );
            var detMat = mat4.determinant( mat );
            return detMat * det < 0.0;
        };

    } )(),

    intersect: ( function () {

        var normal = vec3.create();
        var e2 = vec3.create();
        var e1 = vec3.create();
        var tvec = vec3.create();
        var pvec = vec3.create();
        var qvec = vec3.create();
        var epsilon = 1E-20;

        return function ( v0, v1, v2, i0, i1, i2 ) {

            var d = this._dir;

            vec3.sub( e2, v2, v0 );
            vec3.sub( e1, v1, v0 );
            vec3.cross( pvec, d, e2 );

            var det = vec3.dot( pvec, e1 );
            if ( det > -epsilon && det < epsilon )
                return;
            var invDet = 1.0 / det;

            vec3.sub( tvec, this._start, v0 );

            var u = vec3.dot( pvec, tvec ) * invDet;
            if ( u < 0.0 || u > 1.0 )
                return;

            vec3.cross( qvec, tvec, e1 );

            var v = vec3.dot( qvec, d ) * invDet;
            if ( v < 0.0 || ( u + v ) > 1.0 )
                return;

            var t = vec3.dot( qvec, e2 ) * invDet;

            if ( t < epsilon || t > this._length ) //no intersection
                return;

            var r0 = 1.0 - u - v;
            var r1 = u;
            var r2 = v;
            var r = t * this._invLength;

            var interX = v0[ 0 ] * r0 + v1[ 0 ] * r1 + v2[ 0 ] * r2;
            var interY = v0[ 1 ] * r0 + v1[ 1 ] * r1 + v2[ 1 ] * r2;
            var interZ = v0[ 2 ] * r0 + v1[ 2 ] * r1 + v2[ 2 ] * r2;

            vec3.cross( normal, e1, e2 );
            vec3.normalize( normal, normal );

            // GC TriangleIntersection & Point
            this._intersections.push( {
                ratio: r,
                backface: this.isBackFace( det, this._nodePath ),
                nodepath: this._nodePath.slice( 0 ), // Note: If you are computing intersections from a viewer the first node is the camera of the viewer
                TriangleIntersection: new TriangleIntersection( vec3.clone( normal ), i0, i1, i2, r0, r1, r2 ),
                point: vec3.fromValues( interX, interY, interZ )
            } );
            this.hit = true;
        };
    } )()
};

module.exports = TriangleIntersector;
