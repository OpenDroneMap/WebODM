'use strict';
var MACROUTILS = require( 'osg/Utils' );
var BufferArray = require( 'osg/BufferArray' );
var Geometry = require( 'osg/Geometry' );
var NodeVisitor = require( 'osg/NodeVisitor' );
var PrimitiveSet = require( 'osg/primitiveSet' );
var vec3 = require( 'osg/glMatrix' ).vec3;


var osg = MACROUTILS;

var TangentSpaceGenerator = function () {
    NodeVisitor.call( this );
    this._T = undefined;
    this._B = undefined;
    this._N = undefined;
    this._texCoordUnit = 0;
};

TangentSpaceGenerator.prototype = MACROUTILS.objectInherit( NodeVisitor.prototype, {

    apply: function ( node ) {

        if ( node.getTypeID() === Geometry.getTypeID() )
            this.generate( node, this._texCoordUnit );
        else
            this.traverse( node );

    },

    setTexCoordUnit: function ( texCoordUnit ) {
        this._texCoordUnit = texCoordUnit;
    },

    computePrimitiveSet: function ( geometry, primitiveSet ) {

        // no indices -> exit
        if ( !primitiveSet.getIndices )
            return;

        var numIndices = primitiveSet.getNumIndices();

        var vx = geometry.getAttributes().Vertex;
        var nx = geometry.getAttributes().Normal;
        var tx = geometry.getAttributes()[ 'TexCoord' + this._texCoordUnit ];

        var i;

        if ( primitiveSet.getMode() === PrimitiveSet.TRIANGLES ) {

            for ( i = 0; i < numIndices; i += 3 ) {
                this.compute( primitiveSet, vx, nx, tx, i, i + 1, i + 2 );
            }

        } else if ( primitiveSet.getMode() === PrimitiveSet.TRIANGLE_STRIP ) {

            for ( i = 0; i < numIndices - 2; ++i ) {
                if ( ( i % 2 ) === 0 ) {
                    this.compute( primitiveSet, vx, nx, tx, i, i + 1, i + 2 );
                } else {
                    this.compute( primitiveSet, vx, nx, tx, i + 1, i, i + 2 );
                }
            }
        }

    },

    generate: function ( geometry, texCoordUnit ) {

        this._texCoordUnit = texCoordUnit;

        if ( this._texCoordUnit === undefined )
            this._texCoordUnit = 0;

        var size = geometry.getAttributes().Vertex.getElements().length;
        this._T = new osg.Float32Array( size );
        this._B = new osg.Float32Array( size );
        this._N = new osg.Float32Array( size );

        geometry.getPrimitiveSetList().forEach( function ( primitiveSet ) {

            this.computePrimitiveSet( geometry, primitiveSet );

        }, this );

        var nbElements = size / 3;
        var tangents = new osg.Float32Array( nbElements * 4 );

        var tmp0 = vec3.create();
        var tmp1 = vec3.create();
        var t3 = vec3.create();

        for ( var i = 0; i < nbElements; i++ ) {
            var t = this._T.subarray( i * 3, i * 3 + 3 );
            var n = this._N.subarray( i * 3, i * 3 + 3 );
            var b = this._B.subarray( i * 3, i * 3 + 3 );

            vec3.normalize( n, n );

            // Gram-Schmidt orthogonalize
            // vec3 t3 = (t - n * (n * t));
            // t3.normalize();
            // finalTangent = Vec4(t3, 0.0);
            // Calculate handedness
            // finalTangent[3] = (((n ^ t) * b) < 0.0) ? -1.0 : 1.0;
            // The bitangent vector B is then given by B = (N × T) · Tw

            var nt = vec3.dot( n, t );
            vec3.scale( tmp1, n, nt );
            vec3.sub( tmp0, t, tmp1 );
            vec3.normalize( t3, tmp0 );

            vec3.cross( tmp0, n, t );
            var sign = vec3.dot( tmp0, b );
            sign = sign < 0.0 ? -1.0 : 0.0;

            // TODO perf : cache index var id = i * 4;
            tangents[ i * 4 ] = t3[ 0 ];
            tangents[ i * 4 + 1 ] = t3[ 1 ];
            tangents[ i * 4 + 2 ] = t3[ 2 ];
            tangents[ i * 4 + 3 ] = sign;
        }

        geometry.getAttributes().Normal.setElements( this._N );
        geometry.getAttributes().Tangent = new BufferArray( 'ARRAY_BUFFER', tangents, 4 );

    },

    compute: function ( primitiveSet, vx, nx, tx, ia, ib, ic ) {

        var i0 = primitiveSet.index( ia );
        var i1 = primitiveSet.index( ib );
        var i2 = primitiveSet.index( ic );

        // TODO perf : cache xx.getElements() but more importantly
        // subarray call have very high overhead, it's super useful
        // when you call it a few times for big array chunk, but for
        // small array extraction (each vertex) it's better to use a temporary
        // pre allocated array and simply fill it
        // then, you'll have to write in the big arrays at the end
        var P1 = vx.getElements().subarray( i0 * 3, i0 * 3 + 3 );
        var P2 = vx.getElements().subarray( i1 * 3, i1 * 3 + 3 );
        var P3 = vx.getElements().subarray( i2 * 3, i2 * 3 + 3 );

        var N1 = nx.getElements().subarray( i0 * 3, i0 * 3 + 3 );
        var N2 = nx.getElements().subarray( i1 * 3, i1 * 3 + 3 );
        var N3 = nx.getElements().subarray( i2 * 3, i2 * 3 + 3 );

        var uv1 = tx.getElements().subarray( i0 * 2, i0 * 2 + 2 );
        var uv2 = tx.getElements().subarray( i1 * 2, i1 * 2 + 2 );
        var uv3 = tx.getElements().subarray( i2 * 2, i2 * 2 + 2 );

        var vz, vy;
        // TODO perf : use temporary vec
        var V = vec3.create();

        var B1 = vec3.create();
        var B2 = vec3.create();
        var B3 = vec3.create();

        var T1 = vec3.create();
        var T2 = vec3.create();
        var T3 = vec3.create();

        var v1 = vec3.create();
        var v2 = vec3.create();


        vec3.set( v1, P2[ 0 ] - P1[ 0 ], uv2[ 0 ] - uv1[ 0 ], uv2[ 1 ] - uv1[ 1 ] );
        vec3.set( v2, P3[ 0 ] - P1[ 0 ], uv3[ 0 ] - uv1[ 0 ], uv3[ 1 ] - uv1[ 1 ] );

        vec3.cross( V, v1, v2 );

        if ( V[ 0 ] !== 0.0 ) {
            vec3.normalize( V, V );
            vy = -V[ 1 ] / V[ 0 ];
            vz = -V[ 2 ] / V[ 0 ];
            T1[ 0 ] += vy;
            B1[ 0 ] += vz;
            T2[ 0 ] += vy;
            B2[ 0 ] += vz;
            T3[ 0 ] += vy;
            B3[ 0 ] += vz;
        }


        vec3.set( v1, P2[ 1 ] - P1[ 1 ], uv2[ 0 ] - uv1[ 0 ], uv2[ 1 ] - uv1[ 1 ] );
        vec3.set( v2, P3[ 1 ] - P1[ 1 ], uv3[ 0 ] - uv1[ 0 ], uv3[ 1 ] - uv1[ 1 ] );

        vec3.cross( V, v1, v2 );

        if ( V[ 0 ] !== 0.0 ) {
            vec3.normalize( V, V );
            vy = -V[ 1 ] / V[ 0 ];
            vz = -V[ 2 ] / V[ 0 ];
            T1[ 1 ] += vy;
            B1[ 1 ] += vz;
            T2[ 1 ] += vy;
            B2[ 1 ] += vz;
            T3[ 1 ] += vy;
            B3[ 1 ] += vz;
        }


        vec3.set( v1, P2[ 2 ] - P1[ 2 ], uv2[ 0 ] - uv1[ 0 ], uv2[ 1 ] - uv1[ 1 ] );
        vec3.set( v2, P3[ 2 ] - P1[ 2 ], uv3[ 0 ] - uv1[ 0 ], uv3[ 1 ] - uv1[ 1 ] );

        vec3.cross( V, v1, v2 );

        if ( V[ 0 ] !== 0.0 ) {
            vec3.normalize( V, V );
            vy = -V[ 1 ] / V[ 0 ];
            vz = -V[ 2 ] / V[ 0 ];
            T1[ 2 ] += vy;
            B1[ 2 ] += vz;
            T2[ 2 ] += vy;
            B2[ 2 ] += vz;
            T3[ 2 ] += vy;
            B3[ 2 ] += vz;
        }

        var tempVec = vec3.create();
        var tempVec2 = vec3.create();

        var Tdst, Bdst, Ndst;

        vec3.cross( tempVec, N1, T1 );
        vec3.cross( tempVec2, tempVec, N1 );
        Tdst = this._T.subarray( i0 * 3, i0 * 3 + 3 );
        vec3.add( Tdst, tempVec2, Tdst );

        vec3.cross( tempVec, B1, N1 );
        vec3.cross( tempVec2, N1, tempVec );
        Bdst = this._B.subarray( i0 * 3, i0 * 3 + 3 );
        vec3.add( Bdst, tempVec2, Bdst );


        vec3.cross( tempVec, N2, T2 );
        vec3.cross( tempVec2, tempVec, N2 );
        Tdst = this._T.subarray( i1 * 3, i1 * 3 + 3 );
        vec3.add( Tdst, tempVec2, Tdst );

        vec3.cross( tempVec, B2, N2 );
        vec3.cross( tempVec2, N2, tempVec );
        Bdst = this._B.subarray( i1 * 3, i1 * 3 + 3 );
        vec3.add( Bdst, tempVec2, Bdst );


        vec3.cross( tempVec, N3, T3 );
        vec3.cross( tempVec2, tempVec, N3 );
        Tdst = this._T.subarray( i2 * 3, i2 * 3 + 3 );
        vec3.add( Tdst, tempVec2, Tdst );

        vec3.cross( tempVec, B3, N3 );
        vec3.cross( tempVec2, N3, tempVec );
        Bdst = this._B.subarray( i2 * 3, i2 * 3 + 3 );
        vec3.add( Bdst, tempVec2, Bdst );


        Ndst = this._N.subarray( i0 * 3, i0 * 3 + 3 );
        vec3.add( Ndst, N1, Ndst );

        Ndst = this._N.subarray( i1 * 3, i1 * 3 + 3 );
        vec3.add( Ndst, N2, Ndst );

        Ndst = this._N.subarray( i2 * 3, i2 * 3 + 3 );
        vec3.add( Ndst, N3, Ndst );
    }

} );

module.exports = TangentSpaceGenerator;
