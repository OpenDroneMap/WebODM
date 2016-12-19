'use strict';
var DisplayGraphNode = require( 'osgUtil/DisplayGraphNode' );
var RenderBin = require( 'osg/RenderBin' );

var DisplayGraphRenderer = function ( selectables ) {

    this._selectables = selectables;
    this._nodeList = [];
    this._linkList = [];

    this._renderBinMap = new window.Map();
    this._renderBinStack = [];

    this._generatorID = 0;
    this._refID = 0; // invalide old _instanceID if we recreate the graph

    this._uniqueEdges = new window.Set();
};

DisplayGraphRenderer.prototype = {
    getColorFromClassName: DisplayGraphNode.prototype.getColorFromClassName,

    createGraph: function ( renderBin ) {
        this.reset();
        this.apply( renderBin );
    },

    reset: function () {
        this._renderBinMap.clear();
        this._renderBinStack.length = 0;
        this._generatorID = 0;
        this._refID++;

        this._nodeList.length = 0;
        this._linkList.length = 0;

        this._uniqueEdges.clear();
    },

    apply: function ( rb ) {

        var instanceID = rb.getInstanceID();
        if ( !this._renderBinMap.has( instanceID ) ) {
            this._renderBinMap.set( instanceID, rb );
        }

        this._renderBinStack.push( rb );

        // pre render stage if render stage node
        if ( rb.getPreRenderStageList ) {
            var preRenderList = rb.getPreRenderStageList();
            for ( var i = 0, ni = preRenderList.length; i < ni; ++i ) {
                this.apply( preRenderList[ i ].renderStage );
            }
        }

        // draw implementation
        // handle rs camera
        this.registerNode( rb );

        // post render stage if render stage node
        if ( rb.getPostRenderStageList ) {
            var postRenderList = rb.getPostRenderStageList();
            for ( var j = 0, nj = postRenderList.length; j < nj; ++j ) {
                this.apply( postRenderList[ j ].renderStage );
            }
        }

        this._renderBinStack.pop();
    },

    registerNode: function ( rb ) {

        var childID = rb.getInstanceID();

        this._nodeList.push( rb );

        // register bins
        var bins = rb._bins;
        var binKeys = window.Object.keys( bins );
        for ( var i = 0, ni = binKeys.length; i < ni; i++ ) {
            var bin = bins[ binKeys[ i ] ];
            this.apply( bin );
        }

        // register fine grained leafs
        if ( rb._leafs.length ) {
            for ( var j = 0, nj = rb._leafs.length; j < nj; j++ ) {
                this.createNodeAndSetID( childID, rb._leafs[ j ] );
            }
        }

        // register coarse grained leafs
        for ( var k = 0, nk = rb.stateGraphList.length; k < nk; k++ ) {
            var sg = rb.stateGraphList[ k ];
            this.createNodeAndSetID( childID, sg );
            var stateGraphID = sg._instanceID;
            for ( var l = 0, nl = sg.leafs.length; l < nl; l++ )
                this.createNodeAndSetID( stateGraphID, sg.leafs[ l ] );
        }


        // no parent no link
        if ( this._renderBinStack.length < 2 )
            return;

        var parentID = this._renderBinStack[ this._renderBinStack.length - 2 ].getInstanceID();
        this.createLink( parentID, childID );
    },

    createLink: function ( parent, child ) {
        var key = parent + '+' + child;
        if ( !this._uniqueEdges.has( key ) ) {
            this._linkList.push( {
                parentNode: parent,
                childrenNode: child
            } );
            this._uniqueEdges.add( key );
        }
    },

    createNodeAndSetID: function ( parentID, node ) {

        // register render leaf
        this._nodeList.push( node );

        // generate fake id < 0 because RenderLeaf does not inherit from Object
        if ( node._instanceID === undefined || ( node._instanceID < 0 && node._refID !== this._refID ) ) {
            node._instanceID = -1 - this._generatorID++;
            node._refID = this._refID;
        }

        this.createLink( parentID, node._instanceID );
    },

    generateRenderLeaf: function ( g, node ) {

        var instanceID = node._instanceID;
        var className = 'RenderLeaf';
        var geomName = node._geometry && node._geometry.getName() ? '\n' + node._geometry.getName() : 'Geometry';

        var label = className + ' ( ' + node._instanceID + ' )';
        label += '\n' + geomName + ' ( ' + node._geometry.getInstanceID() + ' )';

        this._selectables.set( instanceID.toString(), node );
        g.addNode( instanceID, {
            label: label,
            description: '',
            style: 'fill: ' + this.getColorFromClassName( className ) + ';stroke-width: 0px;'
        } );
    },

    generateStateGraph: function ( g, node ) {

        var instanceID = node._instanceID;
        var className = 'StateGraph';
        var label = className + ' ( ' + node._instanceID + ' )';
        label += '\n' + node.leafs.length + ' leafs';

        this._selectables.set( instanceID.toString(), node );
        g.addNode( instanceID, {
            label: label,
            description: '',
            style: 'fill: ' + this.getColorFromClassName( className ) + ';stroke-width: 0px;'
        } );
    },

    generateRenderStage: function ( g, node ) {

        var label = node.className() + ' ( ' + node._instanceID + ' )';
        if ( node.getName() ) label += '\n' + node.getName();
        label += '\nViewport ( ' + node.getViewport().width() + ' x ' + node.getViewport().height() + ' )';

        this._selectables.set( node.getInstanceID().toString(), node );
        g.addNode( node.getInstanceID(), {
            label: label,
            description: '',
            style: 'fill: ' + this.getColorFromClassName( node.className() ) + ';stroke-width: 0px;'
        } );

    },

    generateRenderBin: function ( g, rb ) {

        var label = rb.className() + ' ( ' + rb.getInstanceID() + ' )';
        if ( rb.getName() ) label += '\n' + rb.getName();

        var sortMode = '';
        if ( rb.getSortMode() === RenderBin.SORT_BACK_TO_FRONT )
            sortMode = 'SortMode: BackToFront';

        var description = 'BinNumber: ' + rb.getBinNumber() + '\n' + sortMode;

        this._selectables.set( rb.getInstanceID().toString(), rb );
        g.addNode( rb.getInstanceID(), {
            label: label,
            description: description,
            style: 'fill: ' + this.getColorFromClassName( rb.className() ) + ';stroke-width: 0px;'
        } );

    },

    // Subfunction of createGraph, will iterate to create all the node and link in dagre
    generateNodeAndLink: function ( g ) {
        for ( var i = 0, ni = this._nodeList.length; i < ni; i++ ) {

            var node = this._nodeList[ i ];

            // detect if RenderLeaf
            if ( node._geometry && node._depth !== undefined ) {
                this.generateRenderLeaf( g, node );

            } else if ( node.depth !== undefined && node.leafs && node.children ) {
                // it's StateGraph
                this.generateStateGraph( g, node );

            } else if ( node.className() === 'RenderStage' ) {
                this.generateRenderStage( g, node );

            } else {
                // it's a RenderBin
                this.generateRenderBin( g, node );
            }

        }

        for ( var j = 0, nj = this._linkList.length; j < nj; j++ ) {
            g.addEdge( null, this._linkList[ j ].parentNode, this._linkList[ j ].childrenNode );
        }
    }
};

module.exports = DisplayGraphRenderer;
