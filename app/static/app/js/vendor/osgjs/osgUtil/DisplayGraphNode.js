'use strict';
var MACROUTILS = require( 'osg/Utils' );
var NodeVisitor = require( 'osg/NodeVisitor' );
var MorphGeometry = require( 'osgAnimation/MorphGeometry' );

var DisplayGraphNode = function ( selectables ) {
    NodeVisitor.call( this, NodeVisitor.TRAVERSE_ALL_CHILDREN );

    this._selectables = selectables;
    this._nodeList = [];
    this._linkList = [];

    // don't reference twice same node
    this._uniqueNodes = new window.Set();
    this._uniqueEdges = new window.Set();
};

DisplayGraphNode.prototype = MACROUTILS.objectInherit( NodeVisitor.prototype, {
    getColorFromClassName: function ( name ) {
        switch ( name ) {
        case 'ShadowedScene':
            return '#3D3D3D';
        case 'Camera':
            return '#AB7BCF';
        case 'RenderBin':
            return '#59778B';
        case 'LightSource':
            return '#53967D';
        case 'RenderStage':
            return '#DDCC55';
        case 'RenderLeaf':
        case 'Geometry':
            return '#FFCC55';
        case 'RigGeometry':
            return '#DD8800';
        case 'MorphGeometry':
            return '#AA5500';
        case 'MatrixTransform':
            return '#CE697E';
        case 'StateSet':
            return '#0099FF';
        case 'StateGraph':
        case 'Skeleton':
            return '#96999E';
        case 'Bone':
            return '#A9DEAA';
        case 'Node':
            return '#FFFFFF';
        default:
            return '#FF00AA';
        }
    },

    createGraph: function ( root ) {
        this.reset();
        root.accept( this );
    },

    reset: function () {
        this._nodeList.length = 0;
        this._linkList.length = 0;
        this._uniqueNodes.clear();
        this._uniqueEdges.clear();
    },

    apply: function ( node ) {
        if ( node._isNormalDebug )
            return;

        if ( !this._uniqueNodes.has( node.getInstanceID() ) ) {
            this._uniqueNodes.add( node.getInstanceID() );
            this._nodeList.push( node );
        }

        if ( this.nodePath.length >= 2 ) {
            var parentID = this.nodePath[ this.nodePath.length - 2 ].getInstanceID();
            var childID = node.getInstanceID();
            var key = parentID + '+' + childID;
            if ( !this._uniqueEdges.has( key ) ) {
                this._linkList.push( {
                    parentNode: parentID,
                    childrenNode: childID
                } );
                this._uniqueEdges.add( key );
            }
        }

        this.traverse( node );
    },

    // Create an array to display the matrix
    createMatrixGrid: function ( node, matrixArray ) {

        var nodeMatrix = '';

        nodeMatrix += '<table><tr><td>' + matrixArray[ 0 ] + '</td>';
        nodeMatrix += '<td>' + matrixArray[ 4 ] + '</td>';
        nodeMatrix += '<td>' + matrixArray[ 8 ] + '</td>';
        nodeMatrix += '<td>' + matrixArray[ 12 ] + '</td></tr>';

        nodeMatrix += '<tr><td>' + matrixArray[ 1 ] + '</td>';
        nodeMatrix += '<td>' + matrixArray[ 5 ] + '</td>';
        nodeMatrix += '<td>' + matrixArray[ 9 ] + '</td>';
        nodeMatrix += '<td>' + matrixArray[ 13 ] + '</td></tr>';

        nodeMatrix += '<tr><td>' + matrixArray[ 2 ] + '</td>';
        nodeMatrix += '<td>' + matrixArray[ 6 ] + '</td>';
        nodeMatrix += '<td>' + matrixArray[ 10 ] + '</td>';
        nodeMatrix += '<td>' + matrixArray[ 14 ] + '</td></tr>';

        nodeMatrix += '<tr><td>' + matrixArray[ 3 ] + '</td>';
        nodeMatrix += '<td>' + matrixArray[ 7 ] + '</td>';
        nodeMatrix += '<td>' + matrixArray[ 11 ] + '</td>';
        nodeMatrix += '<td>' + matrixArray[ 15 ] + '</td></tr></table>';

        return nodeMatrix;
    },

    getLabel: function ( obj ) {
        var label = obj.className() + ' (' + obj.getInstanceID() + ')';
        if ( obj.getName && obj.getName() ) label += '\n' + obj.getName();
        return label;
    },

    generateNode: function ( g, node ) {
        var description = '';
        if ( node.getMatrix && node.getMatrix() ) {
            description += '<br /><br />' + this.createMatrixGrid( node, node.getMatrix() );
        }

        this._selectables.set( node.getInstanceID().toString(), node );
        g.addNode( node.getInstanceID(), {
            label: this.getLabel( node ),
            description: description,
            style: 'fill: ' + this.getColorFromClassName( node.className() ) + ';stroke-width: 0px;'
        } );
    },

    generateStateSet: function ( g, node ) {
        var stateSet = node.getStateSet();
        var stateSetID = stateSet.getInstanceID();

        var label = this.getLabel( stateSet );
        label += '\nNbTexture : ' + stateSet.getNumTextureAttributeLists();

        if ( !g.hasNode( stateSetID ) ) {

            this._selectables.set( stateSetID.toString(), stateSet );
            g.addNode( stateSetID, {
                label: label,
                style: 'fill: ' + this.getColorFromClassName( stateSet.className() ) + ';stroke-width: 0px;'
            } );
        }

        g.addEdge( null, node.getInstanceID(), stateSetID, {
            style: 'stroke: ' + this.getColorFromClassName( stateSet.className() ) + ';'
        } );
    },

    generateSourceGeometry: function ( g, node ) {
        var sourceGeom = node.getSourceGeometry();
        var sourceGeomID = sourceGeom.getInstanceID();

        this._selectables.set( sourceGeomID.toString(), sourceGeom );
        g.addNode( sourceGeomID, {
            label: this.getLabel( sourceGeom ),
            style: 'fill: ' + this.getColorFromClassName( sourceGeom.className() ) + ';stroke-width: 0px;'
        } );

        g.addEdge( null, node.getInstanceID(), sourceGeomID, {
            style: 'stroke: ' + this.getColorFromClassName( sourceGeom.className() ) + ';'
        } );
    },

    // Subfunction of createGraph, will iterate to create all the node and link in dagre
    generateNodeAndLink: function ( g ) {

        for ( var i = 0, ni = this._nodeList.length; i < ni; i++ ) {
            var node = this._nodeList[ i ];

            // node
            this.generateNode( g, node );

            // adds statesets node
            if ( node.getStateSet() ) {
                this.generateStateSet( g, node );
            }

            // adds source geometry node
            if ( node.getSourceGeometry && node.getSourceGeometry() instanceof MorphGeometry ) {
                this.generateSourceGeometry( g, node );
            }
        }

        for ( var j = 0, nj = this._linkList.length; j < nj; j++ ) {
            g.addEdge( null, this._linkList[ j ].parentNode, this._linkList[ j ].childrenNode );
        }
    }
} );

module.exports = DisplayGraphNode;
