'use strict';
var Notify = require( 'osg/notify' );
var vec3 = require( 'osg/glMatrix' ).vec3;
var BufferArray = require( 'osg/BufferArray' );
var Geometry = require( 'osg/Geometry' );
var PrimitiveSet = require( 'osg/primitiveSet' );
var DrawArrays = require( 'osg/DrawArrays' );
var DrawElements = require( 'osg/DrawElements' );
var Program = require( 'osg/Program' );
var Shader = require( 'osg/Shader' );
var MACROUTILS = require( 'osg/Utils' );


/**
 * Create a Textured Box on the given center with given size
 * @name createTexturedBox
 */
var createTexturedBoxGeometry = function ( cx, cy, cz,
    sx, sy, sz ) {

    var centerx = cx !== undefined ? cx : 0.0;
    var centery = cy !== undefined ? cy : 0.0;
    var centerz = cz !== undefined ? cz : 0.0;

    var sizex = sx !== undefined ? sx : 1.0;
    var sizey = sy !== undefined ? sy : 1.0;
    var sizez = sz !== undefined ? sz : 1.0;

    var g = new Geometry();
    var dx, dy, dz;
    dx = sizex / 2.0;
    dy = sizey / 2.0;
    dz = sizez / 2.0;

    var vertexes = new MACROUTILS.Float32Array( 72 );
    var uv = new MACROUTILS.Float32Array( 48 );
    var normal = new MACROUTILS.Float32Array( 72 );

    // -ve y plane
    vertexes[ 0 ] = centerx - dx;
    vertexes[ 1 ] = centery - dy;
    vertexes[ 2 ] = centerz + dz;
    normal[ 0 ] = 0.0;
    normal[ 1 ] = -1.0;
    normal[ 2 ] = 0.0;
    uv[ 0 ] = 0.0;
    uv[ 1 ] = 1.0;

    vertexes[ 3 ] = centerx - dx;
    vertexes[ 4 ] = centery - dy;
    vertexes[ 5 ] = centerz - dz;
    normal[ 3 ] = 0.0;
    normal[ 4 ] = -1.0;
    normal[ 5 ] = 0.0;
    uv[ 2 ] = 0.0;
    uv[ 3 ] = 0.0;

    vertexes[ 6 ] = centerx + dx;
    vertexes[ 7 ] = centery - dy;
    vertexes[ 8 ] = centerz - dz;
    normal[ 6 ] = 0.0;
    normal[ 7 ] = -1.0;
    normal[ 8 ] = 0.0;
    uv[ 4 ] = 1.0;
    uv[ 5 ] = 0.0;

    vertexes[ 9 ] = centerx + dx;
    vertexes[ 10 ] = centery - dy;
    vertexes[ 11 ] = centerz + dz;
    normal[ 9 ] = 0.0;
    normal[ 10 ] = -1.0;
    normal[ 11 ] = 0.0;
    uv[ 6 ] = 1.0;
    uv[ 7 ] = 1.0;


    // +ve y plane
    vertexes[ 12 ] = centerx + dx;
    vertexes[ 13 ] = centery + dy;
    vertexes[ 14 ] = centerz + dz;
    normal[ 12 ] = 0.0;
    normal[ 13 ] = 1.0;
    normal[ 14 ] = 0.0;
    uv[ 8 ] = 0.0;
    uv[ 9 ] = 1.0;

    vertexes[ 15 ] = centerx + dx;
    vertexes[ 16 ] = centery + dy;
    vertexes[ 17 ] = centerz - dz;
    normal[ 15 ] = 0.0;
    normal[ 16 ] = 1.0;
    normal[ 17 ] = 0.0;
    uv[ 10 ] = 0.0;
    uv[ 11 ] = 0.0;

    vertexes[ 18 ] = centerx - dx;
    vertexes[ 19 ] = centery + dy;
    vertexes[ 20 ] = centerz - dz;
    normal[ 18 ] = 0.0;
    normal[ 19 ] = 1.0;
    normal[ 20 ] = 0.0;
    uv[ 12 ] = 1.0;
    uv[ 13 ] = 0.0;

    vertexes[ 21 ] = centerx - dx;
    vertexes[ 22 ] = centery + dy;
    vertexes[ 23 ] = centerz + dz;
    normal[ 21 ] = 0.0;
    normal[ 22 ] = 1.0;
    normal[ 23 ] = 0.0;
    uv[ 14 ] = 1.0;
    uv[ 15 ] = 1.0;


    // +ve x plane
    vertexes[ 24 ] = centerx + dx;
    vertexes[ 25 ] = centery - dy;
    vertexes[ 26 ] = centerz + dz;
    normal[ 24 ] = 1.0;
    normal[ 25 ] = 0.0;
    normal[ 26 ] = 0.0;
    uv[ 16 ] = 0.0;
    uv[ 17 ] = 1.0;

    vertexes[ 27 ] = centerx + dx;
    vertexes[ 28 ] = centery - dy;
    vertexes[ 29 ] = centerz - dz;
    normal[ 27 ] = 1.0;
    normal[ 28 ] = 0.0;
    normal[ 29 ] = 0.0;
    uv[ 18 ] = 0.0;
    uv[ 19 ] = 0.0;

    vertexes[ 30 ] = centerx + dx;
    vertexes[ 31 ] = centery + dy;
    vertexes[ 32 ] = centerz - dz;
    normal[ 30 ] = 1.0;
    normal[ 31 ] = 0.0;
    normal[ 32 ] = 0.0;
    uv[ 20 ] = 1.0;
    uv[ 21 ] = 0.0;

    vertexes[ 33 ] = centerx + dx;
    vertexes[ 34 ] = centery + dy;
    vertexes[ 35 ] = centerz + dz;
    normal[ 33 ] = 1.0;
    normal[ 34 ] = 0.0;
    normal[ 35 ] = 0.0;
    uv[ 22 ] = 1.0;
    uv[ 23 ] = 1.0;

    // -ve x plane
    vertexes[ 36 ] = centerx - dx;
    vertexes[ 37 ] = centery + dy;
    vertexes[ 38 ] = centerz + dz;
    normal[ 36 ] = -1.0;
    normal[ 37 ] = 0.0;
    normal[ 38 ] = 0.0;
    uv[ 24 ] = 0.0;
    uv[ 25 ] = 1.0;

    vertexes[ 39 ] = centerx - dx;
    vertexes[ 40 ] = centery + dy;
    vertexes[ 41 ] = centerz - dz;
    normal[ 39 ] = -1.0;
    normal[ 40 ] = 0.0;
    normal[ 41 ] = 0.0;
    uv[ 26 ] = 0.0;
    uv[ 27 ] = 0.0;

    vertexes[ 42 ] = centerx - dx;
    vertexes[ 43 ] = centery - dy;
    vertexes[ 44 ] = centerz - dz;
    normal[ 42 ] = -1.0;
    normal[ 43 ] = 0.0;
    normal[ 44 ] = 0.0;
    uv[ 28 ] = 1.0;
    uv[ 29 ] = 0.0;

    vertexes[ 45 ] = centerx - dx;
    vertexes[ 46 ] = centery - dy;
    vertexes[ 47 ] = centerz + dz;
    normal[ 45 ] = -1.0;
    normal[ 46 ] = 0.0;
    normal[ 47 ] = 0.0;
    uv[ 30 ] = 1.0;
    uv[ 31 ] = 1.0;

    // top
    // +ve z plane
    vertexes[ 48 ] = centerx - dx;
    vertexes[ 49 ] = centery + dy;
    vertexes[ 50 ] = centerz + dz;
    normal[ 48 ] = 0.0;
    normal[ 49 ] = 0.0;
    normal[ 50 ] = 1.0;
    uv[ 32 ] = 0.0;
    uv[ 33 ] = 1.0;

    vertexes[ 51 ] = centerx - dx;
    vertexes[ 52 ] = centery - dy;
    vertexes[ 53 ] = centerz + dz;
    normal[ 51 ] = 0.0;
    normal[ 52 ] = 0.0;
    normal[ 53 ] = 1.0;
    uv[ 34 ] = 0.0;
    uv[ 35 ] = 0.0;

    vertexes[ 54 ] = centerx + dx;
    vertexes[ 55 ] = centery - dy;
    vertexes[ 56 ] = centerz + dz;
    normal[ 54 ] = 0.0;
    normal[ 55 ] = 0.0;
    normal[ 56 ] = 1.0;
    uv[ 36 ] = 1.0;
    uv[ 37 ] = 0.0;

    vertexes[ 57 ] = centerx + dx;
    vertexes[ 58 ] = centery + dy;
    vertexes[ 59 ] = centerz + dz;
    normal[ 57 ] = 0.0;
    normal[ 58 ] = 0.0;
    normal[ 59 ] = 1.0;
    uv[ 38 ] = 1.0;
    uv[ 39 ] = 1.0;

    // bottom
    // -ve z plane
    vertexes[ 60 ] = centerx + dx;
    vertexes[ 61 ] = centery + dy;
    vertexes[ 62 ] = centerz - dz;
    normal[ 60 ] = 0.0;
    normal[ 61 ] = 0.0;
    normal[ 62 ] = -1.0;
    uv[ 40 ] = 0.0;
    uv[ 41 ] = 1.0;

    vertexes[ 63 ] = centerx + dx;
    vertexes[ 64 ] = centery - dy;
    vertexes[ 65 ] = centerz - dz;
    normal[ 63 ] = 0.0;
    normal[ 64 ] = 0.0;
    normal[ 65 ] = -1.0;
    uv[ 42 ] = 0.0;
    uv[ 43 ] = 0.0;

    vertexes[ 66 ] = centerx - dx;
    vertexes[ 67 ] = centery - dy;
    vertexes[ 68 ] = centerz - dz;
    normal[ 66 ] = 0.0;
    normal[ 67 ] = 0.0;
    normal[ 68 ] = -1.0;
    uv[ 44 ] = 1.0;
    uv[ 45 ] = 0.0;

    vertexes[ 69 ] = centerx - dx;
    vertexes[ 70 ] = centery + dy;
    vertexes[ 71 ] = centerz - dz;
    normal[ 69 ] = 0.0;
    normal[ 70 ] = 0.0;
    normal[ 71 ] = -1.0;
    uv[ 46 ] = 1.0;
    uv[ 47 ] = 1.0;

    var indexes = new MACROUTILS.Uint16Array( 36 );
    indexes[ 0 ] = 0;
    indexes[ 1 ] = 1;
    indexes[ 2 ] = 2;
    indexes[ 3 ] = 0;
    indexes[ 4 ] = 2;
    indexes[ 5 ] = 3;

    indexes[ 6 ] = 4;
    indexes[ 7 ] = 5;
    indexes[ 8 ] = 6;
    indexes[ 9 ] = 4;
    indexes[ 10 ] = 6;
    indexes[ 11 ] = 7;

    indexes[ 12 ] = 8;
    indexes[ 13 ] = 9;
    indexes[ 14 ] = 10;
    indexes[ 15 ] = 8;
    indexes[ 16 ] = 10;
    indexes[ 17 ] = 11;

    indexes[ 18 ] = 12;
    indexes[ 19 ] = 13;
    indexes[ 20 ] = 14;
    indexes[ 21 ] = 12;
    indexes[ 22 ] = 14;
    indexes[ 23 ] = 15;

    indexes[ 24 ] = 16;
    indexes[ 25 ] = 17;
    indexes[ 26 ] = 18;
    indexes[ 27 ] = 16;
    indexes[ 28 ] = 18;
    indexes[ 29 ] = 19;

    indexes[ 30 ] = 20;
    indexes[ 31 ] = 21;
    indexes[ 32 ] = 22;
    indexes[ 33 ] = 20;
    indexes[ 34 ] = 22;
    indexes[ 35 ] = 23;

    g.getAttributes().Vertex = new BufferArray( BufferArray.ARRAY_BUFFER, vertexes, 3 );
    g.getAttributes().Normal = new BufferArray( BufferArray.ARRAY_BUFFER, normal, 3 );
    g.getAttributes().TexCoord0 = new BufferArray( BufferArray.ARRAY_BUFFER, uv, 2 );

    var primitive = new DrawElements( PrimitiveSet.TRIANGLES, new BufferArray( BufferArray.ELEMENT_ARRAY_BUFFER, indexes, 1 ) );
    g.getPrimitives().push( primitive );
    return g;
};

// better perf
// no more pixel shader hurt for nothing
// http://michaldrobot.com/2014/04/01/gcn-execution-patterns-in-full-screen-passes/
// It's a Singleton, as it's rendering invariant
// so same remove uneeded state change when same geom
var createTexturedFullScreenFakeQuadGeometry = ( function () {
    var g = new Geometry();

    var uvs = new MACROUTILS.Float32Array( [ -1.0, -1.0, -1.0, 4.0, 4.0, -1.0 ] );
    var vertexes = new MACROUTILS.Float32Array( [ -1.0, -1.0, -1.0, 4.0, 4.0, -1.0 ] );

    var indexes = new MACROUTILS.Uint16Array( 3 );
    indexes[ 0 ] = 2;
    indexes[ 1 ] = 1;
    indexes[ 2 ] = 0;

    // Further optim: no index, no uv (uv.xy = position.xy in vertex shader)
    g.getAttributes().Vertex = new BufferArray( BufferArray.ARRAY_BUFFER, vertexes, 2 );
    g.getAttributes().TexCoord0 = new BufferArray( BufferArray.ARRAY_BUFFER, uvs, 2 );

    var primitive = new DrawElements( PrimitiveSet.TRIANGLES, new BufferArray( BufferArray.ELEMENT_ARRAY_BUFFER, indexes, 1 ) );
    g.getPrimitives().push( primitive );

    return function () {
        return g;
    };
} )();


var createTexturedQuadGeometry = function ( cornerx, cornery, cornerz,
    wx, wy, wz,
    hx, hy, hz,
    l, b, r, t ) {

    if ( r === undefined && t === undefined ) {
        r = l;
        t = b;
        l = 0.0;
        b = 0.0;
    }

    var g = new Geometry();

    var vertexes = new MACROUTILS.Float32Array( 12 );
    vertexes[ 0 ] = cornerx + hx;
    vertexes[ 1 ] = cornery + hy;
    vertexes[ 2 ] = cornerz + hz;

    vertexes[ 3 ] = cornerx;
    vertexes[ 4 ] = cornery;
    vertexes[ 5 ] = cornerz;

    vertexes[ 6 ] = cornerx + wx;
    vertexes[ 7 ] = cornery + wy;
    vertexes[ 8 ] = cornerz + wz;

    vertexes[ 9 ] = cornerx + wx + hx;
    vertexes[ 10 ] = cornery + wy + hy;
    vertexes[ 11 ] = cornerz + wz + hz;

    if ( r === undefined ) {
        r = 1.0;
    }
    if ( t === undefined ) {
        t = 1.0;
    }

    var uvs = new MACROUTILS.Float32Array( 8 );
    uvs[ 0 ] = l;
    uvs[ 1 ] = t;

    uvs[ 2 ] = l;
    uvs[ 3 ] = b;

    uvs[ 4 ] = r;
    uvs[ 5 ] = b;

    uvs[ 6 ] = r;
    uvs[ 7 ] = t;

    var n = vec3.fromValues( wx, wy, wz );
    vec3.cross( n, n, vec3.fromValues( hx, hy, hz ) );
    vec3.normalize( n, n );

    var normal = new MACROUTILS.Float32Array( 12 );
    normal[ 0 ] = n[ 0 ];
    normal[ 1 ] = n[ 1 ];
    normal[ 2 ] = n[ 2 ];

    normal[ 3 ] = n[ 0 ];
    normal[ 4 ] = n[ 1 ];
    normal[ 5 ] = n[ 2 ];

    normal[ 6 ] = n[ 0 ];
    normal[ 7 ] = n[ 1 ];
    normal[ 8 ] = n[ 2 ];

    normal[ 9 ] = n[ 0 ];
    normal[ 10 ] = n[ 1 ];
    normal[ 11 ] = n[ 2 ];


    var indexes = new MACROUTILS.Uint16Array( 6 );
    indexes[ 0 ] = 0;
    indexes[ 1 ] = 1;
    indexes[ 2 ] = 2;
    indexes[ 3 ] = 0;
    indexes[ 4 ] = 2;
    indexes[ 5 ] = 3;

    g.getAttributes().Vertex = new BufferArray( BufferArray.ARRAY_BUFFER, vertexes, 3 );
    g.getAttributes().Normal = new BufferArray( BufferArray.ARRAY_BUFFER, normal, 3 );
    g.getAttributes().TexCoord0 = new BufferArray( BufferArray.ARRAY_BUFFER, uvs, 2 );

    var primitive = new DrawElements( PrimitiveSet.TRIANGLES, new BufferArray( BufferArray.ELEMENT_ARRAY_BUFFER, indexes, 1 ) );
    g.getPrimitives().push( primitive );
    return g;
};

var createTexturedBox = function ( centerx, centery, centerz,
    sizex, sizey, sizez ) {
    Notify.log( 'createTexturedBox is deprecated use instead createTexturedBoxGeometry' );
    return createTexturedBoxGeometry( centerx, centery, centerz,
        sizex, sizey, sizez );
};

var createTexturedQuad = function ( cornerx, cornery, cornerz,
    wx, wy, wz,
    hx, hy, hz,
    l, b, r, t ) {
    Notify.log( 'createTexturedQuad is deprecated use instead createTexturedQuadGeometry' );
    return createTexturedQuadGeometry( cornerx, cornery, cornerz,
        wx, wy, wz,
        hx, hy, hz,
        l, b, r, t );
};

var createAxisGeometry = function ( size ) {
    if ( size === undefined ) {
        size = 5.0;
    }
    if ( createAxisGeometry.getShader === undefined ) {
        createAxisGeometry.getShader = function () {
            if ( createAxisGeometry.getShader.program === undefined ) {
                var vertexshader = [
                    '#ifdef GL_ES',
                    'precision highp float;',
                    '#endif',
                    'attribute vec3 Vertex;',
                    'attribute vec4 Color;',
                    'uniform mat4 uModelViewMatrix;',
                    'uniform mat4 uProjectionMatrix;',
                    '',
                    'varying vec4 vColor;',
                    '',
                    'void main(void) {',
                    '  gl_Position = uProjectionMatrix * (uModelViewMatrix * vec4(Vertex, 1.0));',
                    '  vColor = Color;',
                    '}'
                ].join( '\n' );

                var fragmentshader = [
                    '#ifdef GL_ES',
                    'precision highp float;',
                    '#endif',
                    'varying vec4 vColor;',

                    'void main(void) {',
                    'gl_FragColor = vColor;',
                    '}'
                ].join( '\n' );

                var program = new Program( new Shader( 'VERTEX_SHADER', vertexshader ),
                    new Shader( 'FRAGMENT_SHADER', fragmentshader ) );
                createAxisGeometry.getShader.program = program;
            }
            return createAxisGeometry.getShader.program;
        };
    }

    var g = new Geometry();

    var vertexes = new MACROUTILS.Float32Array( 18 );
    vertexes[ 3 ] = size;
    vertexes[ 10 ] = size;
    vertexes[ 17 ] = size;

    var colors = new MACROUTILS.Float32Array( 24 );
    //red color
    colors[ 0 ] = colors[ 3 ] = 1.0;
    colors[ 4 ] = colors[ 4 + 3 ] = 1.0;
    //green color
    colors[ 4 * 2 + 1 ] = colors[ 4 * 2 + 3 ] = 1.0;
    colors[ 4 * 3 + 1 ] = colors[ 4 * 3 + 3 ] = 1.0;
    //blue color
    colors[ 4 * 4 + 2 ] = colors[ 4 * 4 + 3 ] = 1.0;
    colors[ 4 * 5 + 2 ] = colors[ 4 * 5 + 3 ] = 1.0;

    g.getAttributes().Vertex = new BufferArray( BufferArray.ARRAY_BUFFER, vertexes, 3 );
    g.getAttributes().Color = new BufferArray( BufferArray.ARRAY_BUFFER, colors, 4 );

    var primitive = new DrawArrays( PrimitiveSet.LINES, 0, 6 );
    g.getPrimitives().push( primitive );
    g.getOrCreateStateSet().setAttributeAndModes( createAxisGeometry.getShader() );

    return g;
};

/**
 * Create a Textured Sphere on the given center with given radius
 * @name createTexturedSphere
 * @author Darrell Esau
 */
var createTexturedSphere = function ( radius, widthSegments, heightSegments, phiStart, phiLength, thetaStart, thetaLength ) {
    radius = radius || 50.0;

    phiStart = phiStart !== undefined ? phiStart : 0.0;
    phiLength = phiLength !== undefined ? phiLength : Math.PI * 2;

    thetaStart = thetaStart !== undefined ? thetaStart : 0.0;
    thetaLength = thetaLength !== undefined ? thetaLength : Math.PI;

    var segmentsX = Math.max( 3, Math.floor( widthSegments ) || 8 );
    var segmentsY = Math.max( 2, Math.floor( heightSegments ) || 6 );

    var useDrawArrays = ( ( segmentsX * segmentsY ) / 3 ) >= 65536;
    var nbPrim = useDrawArrays ? segmentsX * segmentsY * 6 : segmentsX * segmentsY * 4;
    var fullVerticesList = new MACROUTILS.Float32Array( nbPrim * 3 );
    var fullNormalsList = new MACROUTILS.Float32Array( nbPrim * 3 );
    var fullUVList = new MACROUTILS.Float32Array( nbPrim * 2 );
    var indexes = !useDrawArrays ? new MACROUTILS.Uint16Array( segmentsX * segmentsY * 6 ) : undefined;
    var vtxCount = 0;
    var triCount = 0;

    var v1 = new MACROUTILS.Float32Array( 3 );
    var v2 = new MACROUTILS.Float32Array( 3 );
    var v3 = new MACROUTILS.Float32Array( 3 );
    var v4 = new MACROUTILS.Float32Array( 3 );
    var n1 = new MACROUTILS.Float32Array( 3 );
    var n2 = new MACROUTILS.Float32Array( 3 );
    var n3 = new MACROUTILS.Float32Array( 3 );
    var n4 = new MACROUTILS.Float32Array( 3 );
    var uv1 = new MACROUTILS.Float32Array( 2 );
    var uv2 = new MACROUTILS.Float32Array( 2 );
    var uv3 = new MACROUTILS.Float32Array( 2 );
    var uv4 = new MACROUTILS.Float32Array( 2 );
    var getCoordAndUvSphere = function ( u, v, coord, norm, uv ) {
        coord[ 0 ] = -radius * Math.cos( phiStart + u * phiLength ) * Math.sin( thetaStart + v * thetaLength );
        coord[ 1 ] = radius * Math.cos( thetaStart + v * thetaLength );
        coord[ 2 ] = radius * Math.sin( phiStart + u * phiLength ) * Math.sin( thetaStart + v * thetaLength );
        vec3.normalize( norm, coord );
        uv[ 0 ] = u;
        uv[ 1 ] = 1 - v;
    };
    for ( var y = 0; y < segmentsY; y++ ) {
        for ( var x = 0; x < segmentsX; x++ ) {
            getCoordAndUvSphere( ( x + 1 ) / segmentsX, y / segmentsY, v1, n1, uv1 );
            getCoordAndUvSphere( x / segmentsX, y / segmentsY, v2, n2, uv2 );
            getCoordAndUvSphere( x / segmentsX, ( y + 1 ) / segmentsY, v3, n3, uv3 );
            getCoordAndUvSphere( ( x + 1 ) / segmentsX, ( y + 1 ) / segmentsY, v4, n4, uv4 );

            var idv = vtxCount * 3;
            fullVerticesList[ idv ] = v1[ 0 ];
            fullVerticesList[ idv + 1 ] = v1[ 1 ];
            fullVerticesList[ idv + 2 ] = v1[ 2 ];
            fullVerticesList[ idv + 3 ] = v2[ 0 ];
            fullVerticesList[ idv + 4 ] = v2[ 1 ];
            fullVerticesList[ idv + 5 ] = v2[ 2 ];
            fullVerticesList[ idv + 6 ] = v3[ 0 ];
            fullVerticesList[ idv + 7 ] = v3[ 1 ];
            fullVerticesList[ idv + 8 ] = v3[ 2 ];

            fullNormalsList[ idv ] = n1[ 0 ];
            fullNormalsList[ idv + 1 ] = n1[ 1 ];
            fullNormalsList[ idv + 2 ] = n1[ 2 ];
            fullNormalsList[ idv + 3 ] = n2[ 0 ];
            fullNormalsList[ idv + 4 ] = n2[ 1 ];
            fullNormalsList[ idv + 5 ] = n2[ 2 ];
            fullNormalsList[ idv + 6 ] = n3[ 0 ];
            fullNormalsList[ idv + 7 ] = n3[ 1 ];
            fullNormalsList[ idv + 8 ] = n3[ 2 ];

            var idu = vtxCount * 2;
            fullUVList[ idu ] = uv1[ 0 ];
            fullUVList[ idu + 1 ] = uv1[ 1 ];
            fullUVList[ idu + 2 ] = uv2[ 0 ];
            fullUVList[ idu + 3 ] = uv2[ 1 ];
            fullUVList[ idu + 4 ] = uv3[ 0 ];
            fullUVList[ idu + 5 ] = uv3[ 1 ];

            vtxCount += 3;
            if ( useDrawArrays ) {
                idv = vtxCount * 3;
                fullVerticesList[ idv ] = v1[ 0 ];
                fullVerticesList[ idv + 1 ] = v1[ 1 ];
                fullVerticesList[ idv + 2 ] = v1[ 2 ];
                fullVerticesList[ idv + 3 ] = v3[ 0 ];
                fullVerticesList[ idv + 4 ] = v3[ 1 ];
                fullVerticesList[ idv + 5 ] = v3[ 2 ];
                fullVerticesList[ idv + 6 ] = v4[ 0 ];
                fullVerticesList[ idv + 7 ] = v4[ 1 ];
                fullVerticesList[ idv + 8 ] = v4[ 2 ];

                fullNormalsList[ idv ] = n1[ 0 ];
                fullNormalsList[ idv + 1 ] = n1[ 1 ];
                fullNormalsList[ idv + 2 ] = n1[ 2 ];
                fullNormalsList[ idv + 3 ] = n3[ 0 ];
                fullNormalsList[ idv + 4 ] = n3[ 1 ];
                fullNormalsList[ idv + 5 ] = n3[ 2 ];
                fullNormalsList[ idv + 6 ] = n4[ 0 ];
                fullNormalsList[ idv + 7 ] = n4[ 1 ];
                fullNormalsList[ idv + 8 ] = n4[ 2 ];

                idu = vtxCount * 2;
                fullUVList[ idu ] = uv1[ 0 ];
                fullUVList[ idu + 1 ] = uv1[ 1 ];
                fullUVList[ idu + 2 ] = uv3[ 0 ];
                fullUVList[ idu + 3 ] = uv3[ 1 ];
                fullUVList[ idu + 4 ] = uv4[ 0 ];
                fullUVList[ idu + 5 ] = uv4[ 1 ];
                vtxCount += 3;
            } else {
                idv = vtxCount * 3;
                fullVerticesList[ idv ] = v4[ 0 ];
                fullVerticesList[ idv + 1 ] = v4[ 1 ];
                fullVerticesList[ idv + 2 ] = v4[ 2 ];

                fullNormalsList[ idv ] = n4[ 0 ];
                fullNormalsList[ idv + 1 ] = n4[ 1 ];
                fullNormalsList[ idv + 2 ] = n4[ 2 ];

                idu = vtxCount * 2;
                fullUVList[ idu ] = uv4[ 0 ];
                fullUVList[ idu + 1 ] = uv4[ 1 ];

                var iStart = triCount * 3;
                var tristart = vtxCount - 3;
                indexes[ iStart ] = tristart;
                indexes[ iStart + 1 ] = tristart + 1;
                indexes[ iStart + 2 ] = tristart + 2;
                indexes[ iStart + 3 ] = tristart;
                indexes[ iStart + 4 ] = tristart + 2;
                indexes[ iStart + 5 ] = tristart + 3;
                triCount += 2;
                vtxCount += 1;
            }
        }
    }

    var g = new Geometry();
    g.getAttributes().Vertex = new BufferArray( 'ARRAY_BUFFER', fullVerticesList, 3 );
    g.getAttributes().Normal = new BufferArray( 'ARRAY_BUFFER', fullNormalsList, 3 );
    g.getAttributes().TexCoord0 = new BufferArray( 'ARRAY_BUFFER', fullUVList, 2 );

    if ( useDrawArrays )
        g.getPrimitives().push( new DrawArrays( PrimitiveSet.TRIANGLES, 0, fullVerticesList.length / 3 ) );
    else
        g.getPrimitives().push( new DrawElements( PrimitiveSet.TRIANGLES, new BufferArray( 'ELEMENT_ARRAY_BUFFER', indexes, 1 ) ) );
    return g;
};

var createGridGeometry = function ( cx, cy, cz, wx, wy, wz, hx, hy, hz, res1, res2 ) {
    cx = cx !== undefined ? cx : -0.5;
    cy = cy !== undefined ? cy : -0.5;
    cz = cz !== undefined ? cz : 0.0;

    wx = wx !== undefined ? wx : 1.0;
    wy = wy !== undefined ? wy : 0.0;
    wz = wz !== undefined ? wz : 0.0;

    hx = hx !== undefined ? hx : 0.0;
    hy = hy !== undefined ? hy : 1.0;
    hz = hz !== undefined ? hz : 0.0;

    res1 = res1 !== undefined ? res1 : 5;
    res2 = res2 !== undefined ? res2 : res1;
    res1 += 2;
    res2 += 2;

    var g = new Geometry();
    var vertices = new Float32Array( ( res1 + res2 ) * 2 * 3 );
    var i = 0;
    var j = 0;
    var sx = wx / ( res1 - 1 );
    var sy = wy / ( res1 - 1 );
    var sz = wz / ( res1 - 1 );
    var ux = cx + wx + hx;
    var uy = cy + wy + hy;
    var uz = cz + wz + hz;
    for ( i = 0; i < res1; ++i ) {
        j = i * 6;
        vertices[ j ] = cx + sx * i;
        vertices[ j + 1 ] = cy + sy * i;
        vertices[ j + 2 ] = cz + sz * i;
        vertices[ j + 3 ] = ux - sx * ( res1 - i - 1 );
        vertices[ j + 4 ] = uy - sy * ( res1 - i - 1 );
        vertices[ j + 5 ] = uz - sz * ( res1 - i - 1 );
    }
    sx = hx / ( res2 - 1 );
    sy = hy / ( res2 - 1 );
    sz = hz / ( res2 - 1 );
    for ( i = 0; i < res2; ++i ) {
        j = ( res1 + i ) * 6;
        vertices[ j ] = cx + sx * i;
        vertices[ j + 1 ] = cy + sy * i;
        vertices[ j + 2 ] = cz + sz * i;
        vertices[ j + 3 ] = ux - sx * ( res2 - i - 1 );
        vertices[ j + 4 ] = uy - sy * ( res2 - i - 1 );
        vertices[ j + 5 ] = uz - sz * ( res2 - i - 1 );
    }
    g.getAttributes().Vertex = new BufferArray( BufferArray.ARRAY_BUFFER, vertices, 3 );
    var primitive = new DrawArrays( PrimitiveSet.LINES, 0, ( res1 + res2 ) * 2 );
    g.getPrimitives().push( primitive );
    return g;
};

/*
 * debug lines showing bounding box abstraction
 * @param col bbox color
 */
var createBoundingBoxGeometry = function ( col ) {

    var g = new Geometry();
    //unit cube centered on 0
    var vertices = new Float32Array( [ -0.5, -0.5, -0.5,
        0.5, -0.5, -0.5,
        0.5, 0.5, -0.5, -0.5, 0.5, -0.5, -0.5, -0.5, 0.5,
        0.5, -0.5, 0.5,
        0.5, 0.5, 0.5, -0.5, 0.5, 0.5
    ] );
    g.getAttributes().Vertex = new BufferArray( BufferArray.ARRAY_BUFFER, vertices, 3 );

    // use color or red
    if ( !col ) col = [ 1.0, 0.0, 0.0, 1.0 ];
    var colors = new MACROUTILS.Float32Array( 8 * 4 );
    for ( var i = 0; i < 8; i++ ) {
        for ( var k = 0; k < 4; k++ ) {
            colors[ i * 3 + k ] = col[ k ];
        }
    }

    g.getAttributes().Color = new BufferArray( BufferArray.ARRAY_BUFFER, colors, 4 );

    var indexes = new MACROUTILS.Uint16Array(
        [
            //up
            0, 1,
            1, 2,
            2, 3,
            3, 0,
            //down
            4, 5,
            5, 6,
            6, 7,
            7, 4,
            // side
            0, 4,
            1, 5,
            2, 6,
            3, 7

        ] );

    g.getPrimitives().push( new DrawElements( PrimitiveSet.LINES, new BufferArray( 'ELEMENT_ARRAY_BUFFER', indexes, 1 ) ) );

    return g;

};

module.exports = {
    createTexturedBoxGeometry: createTexturedBoxGeometry,
    createTexturedQuadGeometry: createTexturedQuadGeometry,
    createTexturedSphereGeometry: createTexturedSphere,
    createTexturedBox: createTexturedBox,
    createTexturedFullScreenFakeQuadGeometry: createTexturedFullScreenFakeQuadGeometry,
    createTexturedQuad: createTexturedQuad,
    createAxisGeometry: createAxisGeometry,
    createTexturedSphere: createTexturedSphere,
    createGridGeometry: createGridGeometry,
    createBoundingBoxGeometry: createBoundingBoxGeometry
};
