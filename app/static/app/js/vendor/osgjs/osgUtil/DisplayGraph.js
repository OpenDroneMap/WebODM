'use strict';

var DisplayGraphRenderer = require( 'osgUtil/DisplayGraphRenderer' );
var DisplayGraphNode = require( 'osgUtil/DisplayGraphNode' );
var Notify = require( 'osg/notify' );

var $;

var init$ = function () {
    try {
        $ = require( 'jquery' );
    } catch ( e ) {
        Notify.warn( 'You will not be able to use osgUtil.DisplayGraph until you add jQuery in your page' );
    }
};

// Simple tooltips implementation
var SimpleTooltips = function ( options ) {

    this.options = options;
    var css = document.createElement( 'style' );
    css.type = 'text/css';
    css.innerHTML = [
        '.osgDebugSimpleTooltip {',
        'display: none;',
        'position: absolute;',
        'margin-left: 10px;',
        'border-radius: 4px;',
        'padding: 10px;',
        'background: rgba(0,0,0,.9);',
        'color: #ffffff;',
        '}',
        '.osgDebugSimpleTooltip:before {',
        'content: ',
        ';',
        'position: absolute;',
        'left: -10px;',
        'top: 8px;',
        'border: 10px solid transparent;',
        'border-width: 10px 10px 10px 0;',
        'border-right-color: rgba(0,0,0,.9);',
        '}'
    ].join( '\n' );
    document.getElementsByTagName( 'head' )[ 0 ].appendChild( css );

    this.el = document.createElement( 'div' );
    this.el.className = 'osgDebugSimpleTooltip';
    document.body.appendChild( this.el );
    var nodes = document.querySelectorAll( this.options.selector );
    for ( var i = 0; i < nodes.length; i++ ) {
        nodes[ i ].addEventListener( 'mouseover', this.showTooltip.bind( this ), false );
        nodes[ i ].addEventListener( 'mouseout', this.hideTooltip.bind( this ), false );
    }
};
SimpleTooltips.prototype = {
    showTooltip: function ( e ) {
        if ( !$ ) return;

        var target = e.currentTarget;
        this.el.innerHTML = target.getAttribute( 'title' );
        this.el.style.display = 'block';
        this.el.style.left = $( target ).position().left + $( target ).get( 0 ).getBoundingClientRect().width + 'px';
        this.el.style.top = $( target ).position().top + 'px';
    },
    hideTooltip: function () {
        this.el.style.display = 'none';
    }
};

var DisplayGraph = function () {

    init$();
    if ( !$ ) return;

    // indexed with instanceID, references nodes, stateSet, sourceGeometry...
    // referenced with strings !
    this._selectables = new window.Map();

    this._graphNode = new DisplayGraphNode( this._selectables );
    this._graphRender = new DisplayGraphRenderer( this._selectables );

    this._displayNode = true;
    this._displayRenderer = false;

    // callback when selecting a node
    this._cbSelect = undefined;

    this._focusedElement = 'graph';
    this._idToDomElement = new window.Map();

    this._$svg = $( '<svg width=100% height=100%></svg>' );
    $( 'body' ).append( this._$svg );

    this._css = '.node {text-align: center;cursor: pointer;}.node rect {stroke: #FFF;}.edgePath path {stroke: #FFF;fill: none;}table {text-align: right;}svg {position: absolute;left: 0px;top: 0px;}.osgDebugButton {position: absolute;left: 15px;top: 15px;z-index: 5;border: 0;background: #65a9d7;background: -webkit-gradient(linear, left top, left bottom, from(#3e779d), to(#65a9d7));background: -webkit-linear-gradient(top, #3e779d, #65a9d7);background: -moz-linear-gradient(top, #3e779d, #65a9d7);background: -ms-linear-gradient(top, #3e779d, #65a9d7);background: -o-linear-gradient(top, #3e779d, #65a9d7);padding: 5px 10px;-webkit-border-radius: 7px;-moz-border-radius: 7px;border-radius: 7px;-webkit-box-shadow: rgba(0,0,0,1) 0 1px 0;-moz-box-shadow: rgba(0,0,0,1) 0 1px 0;box-shadow: rgba(0,0,0,1) 0 1px 0;text-shadow: rgba(0,0,0,.4) 0 1px 0;color: white;font-size: 15px;font-family: Helvetica, Arial, Sans-Serif;text-decoration: none;vertical-align: middle;}.osgDebugButton:hover {border-top-color: #28597a;background: #28597a;color: #ccc;}.osgDebugButton:active {border-top-color: #1b435e;background: #1b435e;}.osgDebugSimpleTooltip .osgDebugName {font-weight: bold;color: #60b1fc;margin: 0;}.osgDebugSimpleTooltip .osgDebugDescription {margin: 0;}';
};

DisplayGraph.instance = function () {
    if ( !DisplayGraph._instance )
        DisplayGraph._instance = new DisplayGraph();
    return DisplayGraph._instance;
};

DisplayGraph.prototype = {
    getColorFromClassName: DisplayGraphNode.prototype.getColorFromClassName,

    setCallbackSelect: function ( cb ) {
        this._cbSelect = cb;
    },

    reset: function () {
        if ( !$ ) return;

        this._selectables.clear();
        this._$svg.empty();
        this._focusedElement = 'scene';
        $( '.osgDebugButton' ).hide();
    },

    setDisplayGraphRenderer: function ( bool ) {
        this._displayRenderer = bool;
    },

    createRenderGraph: function ( renderStage ) {
        // called by renderer
        this._graphRender.createGraph( renderStage );
        this.displayGraph();
    },

    createGraph: function ( root ) {
        if ( !$ ) return;
        this.reset();

        this._displayNode = !!root;
        if ( root ) {
            this._graphNode.createGraph( root );
        }

        // check if asynchronous is necessary
        if ( !this._displayRenderer ) {
            this.displayGraph();
        } else {
            // circular dependency
            require( 'osgViewer/Renderer' ).debugGraph = true;
        }
    },

    // Create and display a dagre d3 graph
    displayGraph: function () {
        if ( !$ ) return;
        if ( window.d3 && window.dagreD3 ) {
            this._createGraphApply();
            return;
        }

        var d3url = '//cdnjs.cloudflare.com/ajax/libs/d3/3.4.13/d3.min.js';
        var dagreurl = '//cdn.jsdelivr.net/dagre-d3/0.2.9/dagre-d3.min.js';

        var cb = this._createGraphApply.bind( this );
        $.getScript( d3url ).done( function () {
            $.getScript( dagreurl ).done( cb );
        } );
    },

    _createGraphApply: function () {
        var diGraph = new window.dagreD3.Digraph();
        if ( this._displayNode ) this._graphNode.generateNodeAndLink( diGraph );
        if ( this._displayRenderer ) this._graphRender.generateNodeAndLink( diGraph );


        // Add the style of the graph
        this.injectStyleElement();
        $( '.osgDebugButton' ).show();

        // Create the renderer
        var renderer = this.renderer = new window.dagreD3.Renderer();

        // Set up an SVG group so that we can translate the final graph.
        var svg = window.d3.select( this._$svg.get( 0 ) );
        var svgGroup = svg.append( 'g' );

        // Set initial zoom to 75%
        var initialScale = 0.75;
        var oldZoom = renderer.zoom();
        renderer.zoom( function ( g, argSVG ) {
            var zoom = oldZoom( g, argSVG );

            zoom.scale( initialScale ).event( argSVG );
            return zoom;
        } );

        // Simple function to style the tooltip for the given node.
        var styleTooltip = function ( instanceID, description ) {
            // instanceID is used by onNodeSelect to retrieve the node
            return '<p class="osgDebugName">' + instanceID + '</p><pre class="osgDebugDescription">' + description + '</pre>';
        };

        var idToDom = this._idToDomElement;
        // Override drawNodes to set up the hover.
        var oldDrawNodes = renderer.drawNodes();
        renderer.drawNodes( function ( g, argSVG ) {
            var svgNodes = oldDrawNodes( g, argSVG );

            // Set the title on each of the nodes and use tipsy to display the tooltip on hover
            svgNodes.attr( 'title', function ( d ) {
                idToDom.set( d, this );
                return styleTooltip( d, g.node( d ).description || '' );
            } );

            return svgNodes;
        } );

        // Run the renderer. This is what draws the final graph.
        renderer.run( diGraph, svgGroup );

        this.tooltip = new SimpleTooltips( {
            selector: '.node'
        } );

        // Do a console log of the node (or stateset) and save it in window.*
        $( '.node' ).click( this.onNodeSelect.bind( this ) );
        this.focusOnGraph();
    },

    selectNode: function ( node ) {
        var id = node.getInstanceID();
        var dom = this._idToDomElement.get( id );
        if ( dom )
            $( dom ).click();
    },

    onNodeSelect: function ( e ) {
        var target = e.currentTarget;
        var identifier = $( target.getAttribute( 'title' ) )[ 0 ].innerHTML;
        var selectables = this._selectables;

        // color the node back
        if ( this.lastNode ) {
            this.lastNode.style.fill = this.lastColor;
        }

        // non selectables nodes
        var elt = selectables.get( identifier );
        if ( !elt )
            return;

        this.lastNode = target.childNodes[ 0 ];
        this.lastColor = this.lastNode.style.fill;
        target.childNodes[ 0 ].style.fill = '#f00';

        window.activeNode = elt;
        Notify.info( 'window.activeNode is set with the node below !' );
        Notify.log( window.activeNode );
        Notify.log( '\n' );

        if ( this._cbSelect )
            this._cbSelect( elt );
    },

    focusOnScene: function () {
        $( '.osgDebugButton' ).text( 'Access to the graph' );
        this._$svg.css( 'zIndex', '-2' );
        this._focusedElement = 'scene';
    },

    focusOnGraph: function () {
        $( '.osgDebugButton' ).text( 'Access to the scene' );
        this._$svg.css( 'zIndex', '2' );
        $( '.osgDebugSimpleTooltip' ).css( 'zIndex', '3' );
        this._focusedElement = 'graph';
    },

    // Apply all the style
    injectStyleElement: function () {
        if ( this._cssInjected )
            return;
        this._cssInjected = true;

        $( 'body' ).append( '<button class="osgDebugButton">Access to the scene</button>' );
        $( '.osgDebugButton' ).click( function () {
            if ( this._focusedElement === 'scene' )
                this.focusOnGraph();
            else
                this.focusOnScene();
        }.bind( this ) );

        var css = document.createElement( 'style' );
        css.type = 'text/css';
        css.innerHTML = this._css;
        document.getElementsByTagName( 'head' )[ 0 ].appendChild( css );
    }
};

module.exports = DisplayGraph;
