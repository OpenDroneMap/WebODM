'use strict';
var Shape = require( 'osg/shape' );

/*
 * Given a Camera, update a wireframe representation of its
 * view frustum from a projection and depthrange
 * @param Geomtry g frustum geometry
 * @param Matrix proj Projection
 * @param Vec2 dR depthRange (optional, only if proj is infinite)
 */
var updateFrustum = function ( proj, dR ) {

    var near, far;
    if ( !dR ) {

        // Get near and far from the Projection matrix.
        near = proj[ 14 ] / ( proj[ 10 ] - 1.0 );
        far = proj[ 14 ] / ( 1.0 + proj[ 10 ] );

    } else {
        near = dR[ 0 ];
        far = dR[ 1 ];
    }

    // Get the sides of the near plane.
    var nLeft = near * ( proj[ 8 ] - 1.0 ) / proj[ 0 ];
    var nRight = near * ( 1.0 + proj[ 8 ] ) / proj[ 0 ];
    var nTop = near * ( 1.0 + proj[ 9 ] ) / proj[ 5 ];
    var nBottom = near * ( proj[ 9 ] - 1.0 ) / proj[ 5 ];

    // Get the sides of the far plane.
    var fLeft = far * ( proj[ 8 ] - 1.0 ) / proj[ 0 ];
    var fRight = far * ( 1.0 + proj[ 8 ] ) / proj[ 0 ];
    var fTop = far * ( 1.0 + proj[ 9 ] ) / proj[ 5 ];
    var fBottom = far * ( proj[ 9 ] - 1.0 ) / proj[ 5 ];

    var vBuff = this.getAttributes().Vertex;
    var v = vBuff.getElements();

    // eight corners of the near and far planes.
    v[ 0 ] = nLeft;
    v[ 1 ] = nBottom;
    v[ 2 ] = -near;

    v[ 3 ] = nRight;
    v[ 4 ] = nBottom;
    v[ 5 ] = -near;


    v[ 6 ] = nRight;
    v[ 7 ] = nTop;
    v[ 8 ] = -near;

    v[ 9 ] = nLeft;
    v[ 10 ] = nTop;
    v[ 11 ] = -near;

    v[ 12 ] = fLeft;
    v[ 13 ] = fBottom;
    v[ 14 ] = -far;

    v[ 15 ] = fRight;
    v[ 16 ] = fBottom;
    v[ 17 ] = -far;

    v[ 18 ] = fRight;
    v[ 19 ] = fTop;
    v[ 20 ] = -far;

    v[ 21 ] = fLeft;
    v[ 22 ] = fTop;
    v[ 23 ] = -far;

    vBuff.dirty();

};
/*
 * Given a Camera, create a wireframe representation
 *  of its view frustum
 */
var createDebugFrustrumGeometry = function () {

    var g = Shape.createBoundingBoxGeometry();
    g.updateGeometry = updateFrustum;
    return g;

};

module.exports = {
    createDebugFrustumGeometry: createDebugFrustrumGeometry
};
