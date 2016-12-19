'use strict';
var MACROUTILS = require( 'osg/Utils' );
var Notify = require( 'osg/notify' );
var ObjectBase = require( 'osg/Object' );
var FindNearestParentSkeleton = require( 'osgAnimation/FindNearestParentSkeleton' );


// converted from C++ probably it could be merged into RigGeometry
// it could probably inlined into RigGeometry code
var UpdateRigGeometry = function () {
    ObjectBase.call( this );
};

UpdateRigGeometry.prototype = MACROUTILS.objectInherit( ObjectBase.prototype, {

    init: function ( geom ) {

        var finder = new FindNearestParentSkeleton();
        if ( geom.getParents().length > 1 )
            Notify.warn( 'A RigGeometry should not have multi parent ( ' + geom.getName() + ' )' );

        geom.getParents()[ 0 ].accept( finder );

        if ( !finder._root ) {
            Notify.warn( 'A RigGeometry did not find a parent skeleton for RigGeometry ( ' + geom.getName() + ' )' );
            return;
        }

        geom.setSkeleton( finder._root );
        geom.setPathToSkeleton( finder._pathToRoot );
    },

    update: function ( node /*, nv*/ ) {

        // Circular ref
        if ( node && node.className() !== 'RigGeometry' ) return true;

        var geom = node;

        // maybe this code could simpler
        if ( !geom.getSkeleton() && geom.getParents().length !== 0 ) this.init( geom );
        if ( !geom.getSkeleton() ) return true;

        if ( geom.getNeedToComputeMatrix() ) geom.computeMatrixFromRootSkeleton();

        geom.update();

        return true;
    }

} );

module.exports = UpdateRigGeometry;
