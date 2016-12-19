'use strict';
var mat4 = require( 'osg/glMatrix' ).mat4;
var TransformEnums = require( 'osg/transformEnums' );


var computeLocalToWorld = function ( nodePath, ignoreCameras, userMatrix ) {

    var ignoreCamera = ignoreCameras;

    if ( ignoreCamera === undefined ) ignoreCamera = true;

    var matrix = userMatrix || mat4.create();

    var j = 0;

    if ( ignoreCamera ) {

        for ( j = nodePath.length - 1; j >= 0; j-- ) {

            var camera = nodePath[ j ];

            if ( camera.className() === 'Camera' &&
                ( camera.getReferenceFrame() !== TransformEnums.RELATIVE_RF || camera.getParents().length === 0 ) ) {
                break;
            }

        }

        // because when we break it's to an index - 1
        // it works because if nothing camera found j == -1 at the end of the loop
        // and if we found a camera we want to start at the camera index + 1
        j += 1;

    }

    for ( var i = j, l = nodePath.length; i < l; i++ ) {

        var node = nodePath[ i ];

        if ( node.computeLocalToWorldMatrix ) {
            node.computeLocalToWorldMatrix( matrix );
        }

    }

    return matrix;

};

module.exports = {
    computeLocalToWorld: computeLocalToWorld
};
