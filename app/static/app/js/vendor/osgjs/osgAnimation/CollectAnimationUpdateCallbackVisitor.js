'use strict';
var MACROUTILS = require( 'osg/Utils' );
var NodeVisitor = require( 'osg/NodeVisitor' );
var AnimationUpdateCallback = require( 'osgAnimation/AnimationUpdateCallback' );


// search into a subgraph all target
var CollectAnimationUpdateCallbackVisitor = function () {
    NodeVisitor.call( this );
    this._animationUpdateCallback = {};
};


CollectAnimationUpdateCallbackVisitor.prototype = MACROUTILS.objectInherit( NodeVisitor.prototype, {
    getAnimationUpdateCallbackMap: function () {
        return this._animationUpdateCallback;
    },

    apply: function ( node ) {
        var cbs = node.getUpdateCallbackList();

        // collect and remove animation update callback
        for ( var i = 0, cbsLength = cbs.length; i < cbsLength; i++ ) {
            var cb = cbs[ i ];
            if ( cb instanceof AnimationUpdateCallback ) {
                this._animationUpdateCallback[ cb.getInstanceID() ] = cb;
                //node.removeUpdateCallback( cb );
            }
        }
        this.traverse( node );
    }

} );

module.exports = CollectAnimationUpdateCallbackVisitor;
