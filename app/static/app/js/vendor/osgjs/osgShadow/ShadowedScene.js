'use strict';
var CullVisitor = require( 'osg/CullVisitor' );
var mat4 = require( 'osg/glMatrix' ).mat4;
var Node = require( 'osg/Node' );
var NodeVisitor = require( 'osg/NodeVisitor' );
var StateSet = require( 'osg/StateSet' );
var MACROUTILS = require( 'osg/Utils' );
var vec4 = require( 'osg/glMatrix' ).vec4;


/**
 *  ShadowedScene provides a mechanism for decorating a scene that the needs to have shadows cast upon it.
 *  @class ShadowedScene
 *  @{@link [http://trac.openscenegraph.org/projects/osg//wiki/Support/ProgrammingGuide/osgShadow]}
 *  @{@link [http://developer.download.nvidia.com/presentations/2008/GDC/GDC08_SoftShadowMapping.pdf]};
 */
var ShadowedScene = function () {
    Node.call( this );

    // TODO: all  techniques (stencil/projTex/map/vol)
    this._shadowTechniques = [];

    this._optimizedFrustum = false;

    this._frustumReceivers = [ vec4.create(), vec4.create(), vec4.create(), vec4.create(), vec4.create(), vec4.create() ];

    this._tmpMat = mat4.create();

    this._receivingStateset = new StateSet();

};

/** @lends ShadowedScene.prototype */
ShadowedScene.prototype = MACROUTILS.objectLibraryClass( MACROUTILS.objectInherit( Node.prototype, {

    getReceivingStateSet: function () {

        return this._receivingStateset;

    },

    getShadowTechniques: function () {
        return this._shadowTechniques;
    },

    addShadowTechnique: function ( technique ) {
        if ( this._shadowTechniques.length > 0 ) {
            if ( this._shadowTechniques.indexOf( technique ) !== -1 ) return;
        }

        this._shadowTechniques.push( technique );

        if ( technique.valid() ) {
            technique.setShadowedScene( this );
            technique.dirty();
        }
    },
    removeShadowTechnique: function ( technique ) {

        if ( this._shadowTechniques.length > 0 ) {
            var idx = this._shadowTechniques.indexOf( technique );
            if ( idx !== -1 ) {

                if ( this._shadowTechniques[ idx ].valid() ) {
                    this._shadowTechniques[ idx ].cleanSceneGraph();
                }
                this._shadowTechniques.splice( idx, 1 );
            }
        }
    },
    /** Clean scene graph from any shadow technique specific nodes, state and drawables.*/
    cleanSceneGraph: function () {
        for ( var i = 0, lt = this._shadowTechniques.length; i < lt; i++ ) {
            if ( this._shadowTechniques[ i ] && this._shadowTechniques[ i ].valid() ) {
                this._shadowTechniques[ i ].cleanSceneGraph();
            }
        }
    },

    /** Dirty any cache data structures held in the attached ShadowTechnique.*/
    dirty: function () {
        for ( var i = 0; i < this._shadowTechniques.length; i++ )
            this._shadowTechniques[ i ].dirty();
    },

    nodeTraverse: function ( nv ) {
        Node.prototype.traverse.call( this, nv );
    },

    traverse: function ( nv ) {

        // update the scene
        if ( nv.getVisitorType() === NodeVisitor.CULL_VISITOR ) {

            var i, st, lt = this._shadowTechniques.length;

            // cull Shadowed Scene
            if ( lt ) nv.pushStateSet( this._receivingStateset );
            this.nodeTraverse( nv );
            if ( lt ) nv.popStateSet();

            // cull Casters
            for ( i = 0; i < lt; i++ ) {
                st = this._shadowTechniques[ i ];
                // dirty check for user playing with shadows inside update traverse
                if ( st && st.valid() ) {

                    // those two checks
                    // here
                    // in case people update it from
                    // any update/cull/callback
                    if ( st.isDirty() )
                        st.init();

                    if ( st.isEnabled() || !st.isFilledOnce() ) {
                        st.updateShadowTechnique( nv );
                        st.cullShadowCasting( nv );
                    }
                }
            }

        } else {
            this.nodeTraverse( nv );
        }
    }


} ), 'osgShadow', 'ShadowedScene' );
MACROUTILS.setTypeID( ShadowedScene );

// same code like Node
CullVisitor.prototype[ ShadowedScene.typeID ] = CullVisitor.prototype[ Node.typeID ];

module.exports = ShadowedScene;
