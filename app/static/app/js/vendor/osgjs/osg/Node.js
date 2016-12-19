'use strict';
var MACROUTILS = require( 'osg/Utils' );
var Object = require( 'osg/Object' );
var BoundingBox = require( 'osg/BoundingBox' );
var BoundingSphere = require( 'osg/BoundingSphere' );
var StateSet = require( 'osg/StateSet' );
var NodeVisitor = require( 'osg/NodeVisitor' );
var Notify = require( 'osg/notify' );
var mat4 = require( 'osg/glMatrix' ).mat4;
var MatrixMemoryPool = require( 'osg/MatrixMemoryPool' );
var ComputeMatrixFromNodePath = require( 'osg/computeMatrixFromNodePath' );
var TransformEnums = require( 'osg/transformEnums' );


/**
 *  Node that can contains child node
 *  @class Node
 */
var Node = function () {
    Object.call( this );

    this.children = [];
    this._parents = [];
    /*jshint bitwise: false */
    this.nodeMask = ~0;
    /*jshint bitwise: true */

    this._boundingSphere = new BoundingSphere();
    this._boundingSphereComputed = false;

    this._boundingBox = new BoundingBox();
    this._boundingBoxComputed = false;

    this._updateCallbacks = [];
    this._cullCallback = undefined;
    this._cullingActive = true;
    this._numChildrenWithCullingDisabled = 0;
    this._numChildrenRequiringUpdateTraversal = 0;

    // it's a tmp object for internal use, do not use
    this._tmpBox = new BoundingBox();
};

Node._reservedMatrixStack = new MatrixMemoryPool();
var nodeGetMat = function () {
    var mat = Node._reservedMatrixStack.get.bind( Node._reservedMatrixStack );
    return mat4.identity( mat );
};

/** @lends Node.prototype */
Node.prototype = MACROUTILS.objectLibraryClass( MACROUTILS.objectInherit( Object.prototype, {

    /**
      Return StateSet and create it if it does not exist yet
      @type StateSet
   */
    getOrCreateStateSet: function () {
        if ( !this.stateset ) this.setStateSet( new StateSet() );
        return this.stateset;
    },

    getStateSet: function () {
        return this.stateset;
    },

    accept: function ( nv ) {
        if ( nv.validNodeMask( this ) ) {
            nv.pushOntoNodePath( this );
            nv.apply( this );
            nv.popFromNodePath();
        }
    },

    dirtyBound: function () {
        if ( this._boundingSphereComputed === true || this._boundingBoxComputed === true ) {
            this._boundingSphereComputed = false;
            this._boundingBoxComputed = false;
            var parents = this._parents;
            for ( var i = 0, l = parents.length; i < l; i++ ) {
                parents[ i ].dirtyBound();
            }
        }
    },

    setNodeMask: function ( mask ) {
        this.nodeMask = mask;
    },

    getNodeMask: function () {
        return this.nodeMask;
    },

    setStateSet: function ( stateSet ) {

        if ( this.stateset === stateSet ) return;

        var deltaUpdate = 0;

        if ( this.stateset ) {
            if ( this.stateset.requiresUpdateTraversal() ) deltaUpdate--;
            this.stateset.removeParent( this );
        }

        if ( stateSet ) {
            stateSet.addParent( this );
            if ( stateSet.requiresUpdateTraversal() ) ++deltaUpdate;
        }

        if ( deltaUpdate !== 0 )
            this.setNumChildrenRequiringUpdateTraversal( this.getNumChildrenRequiringUpdateTraversal() + deltaUpdate );

        this.stateset = stateSet;
    },

    _updateNumChildrenRequeringUpdateTraversal: function ( delta ) {

        if ( this._numChildrenRequiringUpdateTraversal === 0 && this._parents.length ) {
            // the number of callbacks has changed, need to pass this
            // on to parents so they know whether app traversal is
            // required on this subgraph.
            for ( var i = 0, l = this._parents.length; i < l; i++ ) {
                var parent = this._parents[ i ];
                var num = parent.getNumChildrenRequiringUpdateTraversal();
                parent.setNumChildrenRequiringUpdateTraversal( num + delta );
            }
        }
    },

    setNumChildrenRequiringUpdateTraversal: function ( num ) {

        // if no changes just return.
        if ( this._numChildrenRequiringUpdateTraversal === num ) return;

        // note, if _updateCallback is set then the
        // parents won't be affected by any changes to
        // _numChildrenRequiringUpdateTraversal so no need to inform them.
        if ( !this._updateCallbacks.length && this._parents.length ) {

            // need to pass on changes to parents.
            var delta = 0;
            if ( this._numChildrenRequiringUpdateTraversal > 0 ) --delta;
            if ( num > 0 ) ++delta;

            if ( delta !== 0 ) {
                // the number of callbacks has changed, need to pass this
                // on to parents so they know whether app traversal is
                // required on this subgraph.
                var parents = this._parents;
                for ( var i = 0, l = parents.length; i < l; i++ ) {
                    var parent = parents[ i ];
                    var parentNum = parent.getNumChildrenRequiringUpdateTraversal();
                    parent.setNumChildrenRequiringUpdateTraversal( parentNum + delta );
                }
            }
        }

        // finally update this objects value.
        this._numChildrenRequiringUpdateTraversal = num;

    },

    getNumChildrenRequiringUpdateTraversal: function () {
        return this._numChildrenRequiringUpdateTraversal;
    },

    /**
     <p>
      Set update node callback, called during update traversal.
      The Object must have the following method
      update(node, nodeVisitor) {}
      note, callback is responsible for scenegraph traversal so
      they must call traverse(node,nv) to ensure that the
      scene graph subtree (and associated callbacks) are traversed.
      </p>
      <p>
      Here a dummy UpdateCallback example
      </p>
      @example
      var DummyUpdateCallback = function() {};
      DummyUpdateCallback.prototype = {
          update: function(node, nodeVisitor) {
              return true;
          }
      };

      @param Oject callback
   */
    setUpdateCallback: function ( cb ) {
        Notify.warn( 'deprecated use instead addUpdateCallback/removeUpdateCallback' );
        if ( cb === this._updateCallbacks[ 0 ] || !cb ) return;

        var hasExistingCallback = Boolean( this._updateCallbacks.length );
        if ( !this._updateCallbacks.length )
            this.addUpdateCallback( cb );
        else
            this._updateCallbacks[ 0 ] = cb;

        if ( !hasExistingCallback )
            this._updateNumChildrenRequeringUpdateTraversal( 1 );
    },

    /** Get update node callback, called during update traversal.
      @type Oject
   */
    getUpdateCallback: function () {
        return this._updateCallbacks[ 0 ];
    },

    addUpdateCallback: function ( cb ) {
        var hasExistingCallback = Boolean( this._updateCallbacks.length );
        this._updateCallbacks.push( cb );

        // send the signal on first add
        if ( !hasExistingCallback )
            this._updateNumChildrenRequeringUpdateTraversal( 1 );
    },

    removeUpdateCallback: function ( cb ) {
        var arrayIdx = this._updateCallbacks.indexOf( cb );
        if ( arrayIdx === -1 ) return;
        this._updateCallbacks.splice( arrayIdx, 1 );

        // send the signal when no more callback
        if ( !this._updateCallbacks.length )
            this._updateNumChildrenRequeringUpdateTraversal( -1 );

    },
    getUpdateCallbackList: function () {
        return this._updateCallbacks;
    },


    /**
     <p>
      Set cull node callback, called during cull traversal.
      The Object must have the following method
      cull(node, nodeVisitor) {}
      note, callback is responsible for scenegraph traversal so
      they must return true to traverse.
      </p>
      <p>
      Here a dummy CullCallback example
      </p>
      @example
      var DummyCullCallback = function() {};
      DummyCullCallback.prototype = {
          cull: function(node, nodeVisitor) {
              return true;
          }
      };

      @param Oject callback
   */
    setCullCallback: function ( cb ) {
        this._cullCallback = cb;
    },
    getCullCallback: function () {
        return this._cullCallback;
    },

    hasChild: function ( child ) {
        for ( var i = 0, l = this.children.length; i < l; i++ ) {
            if ( this.children[ i ] === child ) {
                return true;
            }
        }
        return false;
    },

    addChild: function ( child ) {

        if ( this.children.indexOf( child ) !== -1 ) return undefined;

        this.children.push( child );
        child.addParent( this );
        this.dirtyBound();

        // could now require app traversal thanks to the new subgraph,
        // so need to check and update if required.
        if ( child.getNumChildrenRequiringUpdateTraversal() > 0 ||
            child.getUpdateCallbackList().length ) {
            this.setNumChildrenRequiringUpdateTraversal(
                this.getNumChildrenRequiringUpdateTraversal() + 1
            );
        }

        return child;
    },

    getChildren: function () {
        return this.children;
    },
    getNumChildren: function () {
        return this.children.length;
    },
    getChild: function ( num ) {
        return this.children[ num ];
    },
    getParents: function () {
        return this._parents;
    },

    addParent: function ( parent ) {
        this._parents.push( parent );
    },

    removeParent: function ( parent ) {
        var idx = this._parents.indexOf( parent );
        if ( idx === -1 ) return;
        this._parents.splice( idx, 1 );
    },

    removeChildren: function () {
        var children = this.children;
        var nbChildren = children.length;
        if ( !nbChildren ) return;

        var updateCallbackRemoved = 0;

        for ( var i = 0; i < nbChildren; i++ ) {
            var child = children[ i ];
            child.removeParent( this );
            if ( child.getNumChildrenRequiringUpdateTraversal() > 0 || child.getUpdateCallbackList().length ) ++updateCallbackRemoved;
        }

        children.length = 0;
        if ( updateCallbackRemoved )
            this.setNumChildrenRequiringUpdateTraversal( this.getNumChildrenRequiringUpdateTraversal() - updateCallbackRemoved );

        this.dirtyBound();
    },

    // preserve order
    removeChild: function ( child ) {

        var children = this.children;
        var id = children.indexOf( child );
        if ( id === -1 ) return;

        child.removeParent( this );
        children.splice( id, 1 );

        if ( child.getNumChildrenRequiringUpdateTraversal() > 0 || child.getUpdateCallbackList().length )
            this.setNumChildrenRequiringUpdateTraversal( this.getNumChildrenRequiringUpdateTraversal() - 1 );

    },

    traverse: function ( visitor ) {
        var children = this.children;
        for ( var i = 0, l = children.length; i < l; i++ ) {
            var child = children[ i ];
            child.accept( visitor );
        }
    },

    ascend: function ( visitor ) {
        var parents = this._parents;
        for ( var i = 0, l = parents.length; i < l; i++ ) {
            var parent = parents[ i ];
            parent.accept( visitor );
        }
    },

    getBoundingBox: function () {
        if ( !this._boundingBoxComputed ) {
            this.computeBoundingBox( this._boundingBox );
            this._boundingBoxComputed = true;
        }
        return this._boundingBox;
    },

    computeBoundingBox: function ( bbox ) {

        // circular dependency... not sure if the global visitor instance should be instancied here
        var ComputeBoundsVisitor = require( 'osg/ComputeBoundsVisitor' );
        var cbv = ComputeBoundsVisitor.instance = ComputeBoundsVisitor.instance || new ComputeBoundsVisitor();
        cbv.setNodeMaskOverride( ~0x0 ); // traverse everything to be consistent with computeBoundingSphere
        cbv.reset();

        cbv.apply( this );
        bbox.copy( cbv.getBoundingBox() );
        return bbox;
    },

    getBoundingSphere: function () {
        return this.getBound();
    },

    getBound: function () {
        if ( !this._boundingSphereComputed ) {
            this.computeBoundingSphere( this._boundingSphere );
            this._boundingSphereComputed = true;
        }
        return this._boundingSphere;
    },

    computeBoundingSphere: function ( bSphere ) {

        var children = this.children;
        var l = children.length;

        bSphere.init();
        if ( l === 0 ) return bSphere;

        var cc, i;
        var bb = this._tmpBox;
        bb.init();
        for ( i = 0; i < l; i++ ) {
            cc = children[ i ];
            if ( cc.referenceFrame !== TransformEnums.ABSOLUTE_RF ) {
                bb.expandByBoundingSphere( cc.getBound() );
            }
        }
        if ( !bb.valid() ) return bSphere;

        bSphere.set( bb.center( bSphere.center() ), 0.0 );
        for ( i = 0; i < l; i++ ) {
            cc = children[ i ];
            if ( cc.referenceFrame !== TransformEnums.ABSOLUTE_RF ) {
                bSphere.expandRadiusBySphere( cc.getBound() );
            }
        }
        return bSphere;
    },

    // matrixCreate allow user handling of garbage collection of matrices
    getWorldMatrices: ( function () {
        var CollectParentPaths = function () {
            this.nodePaths = [];
            this.halt = undefined;
            NodeVisitor.call( this, NodeVisitor.TRAVERSE_PARENTS );
        };
        CollectParentPaths.prototype = MACROUTILS.objectInherit( NodeVisitor.prototype, {
            reset: function () {
                this.nodePath.length = 0;
                this.nodePaths.length = 0;
            },
            apply: function ( node ) {
                if ( node._parents.length === 0 || node === this.halt || node.referenceFrame === TransformEnums.ABSOLUTE_RF ) {
                    // copy
                    this.nodePaths.push( this.nodePath.slice( 0 ) );
                } else {
                    this.traverse( node );
                }
            }
        } );
        var collected = new CollectParentPaths();
        collected.setNodeMaskOverride( ~0x0 ); // traverse everything

        return function computeLocalToWorldList( halt, matrixCreate ) {
            collected.reset();
            collected.halt = halt;

            this.accept( collected );
            var matrixList = [];

            var matrixGenerator = matrixCreate || mat4.create;
            for ( var i = 0, l = collected.nodePaths.length; i < l; i++ ) {
                var np = collected.nodePaths[ i ];
                var m = matrixGenerator();
                if ( np.length !== 0 ) {
                    ComputeMatrixFromNodePath.computeLocalToWorld( np, true, m );
                }
                matrixList.push( m );
            }

            return matrixList;
        };

    } )(),

    // same as getWorldMatrices GC: Perf WIN
    getWorldMatrix: function ( halt, matrix ) {

        // pass allocator on master
        var matrixList = this.getWorldMatrices( halt, nodeGetMat );

        if ( matrixList.length === 0 ) {

            mat4.identity( matrix );

        } else {

            mat4.copy( matrix, matrixList[ 0 ] );

        }

        Node._reservedMatrixStack.reset();
        return matrix;

    },

    setCullingActive: function ( value ) {
        if ( this._cullingActive === value ) return;
        if ( this._numChildrenWithCullingDisabled === 0 && this._parents.length > 0 ) {
            var delta = 0;
            if ( !this._cullingActive ) --delta;
            if ( !value ) ++delta;
            if ( delta !== 0 ) {
                for ( var i = 0, k = this._parents.length; i < k; i++ ) {
                    this._parents[ i ].setNumChildrenWithCullingDisabled( this._parents[ i ].getNumChildrenWithCullingDisabled() + delta );
                }
            }
        }
        this._cullingActive = value;
    },

    getCullingActive: function () {
        return this._cullingActive;
    },

    isCullingActive: function () {
        return this._numChildrenWithCullingDisabled === 0 && this._cullingActive && this.getBound().valid();
    },

    setNumChildrenWithCullingDisabled: function ( num ) {
        if ( this._numChildrenWithCullingDisabled === num ) return;
        if ( this._cullingActive && this._parents.length > 0 ) {
            var delta = 0;
            if ( this._numChildrenWithCullingDisabled > 0 ) --delta;
            if ( num > 0 ) ++delta;
            if ( delta !== 0 ) {
                for ( var i = 0, k = this._parents.length; i < k; i++ ) {
                    this._parents[ i ].setNumChildrenWithCullingDisabled( this._parents[ i ].getNumChildrenWithCullingDisabled() + delta );
                }
            }
        }
        this._numChildrenWithCullingDisabled = num;
    },

    getNumChildrenWithCullingDisabled: function () {
        return this._numChildrenWithCullingDisabled;
    },

    releaseGLObjects: function () {
        if ( this.stateset !== undefined ) this.stateset.releaseGLObjects();
    }


} ), 'osg', 'Node' );
MACROUTILS.setTypeID( Node );


module.exports = Node;
