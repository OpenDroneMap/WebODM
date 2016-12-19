'use strict';
var MACROUTILS = require( 'osg/Utils' );
var Notify = require( 'osg/notify' );
var Object = require( 'osg/Object' );
var osgMath = require( 'osg/math' );


/**
 * RenderBin base class. Renderbin contains geometries to be rendered as a group,
 * renderbins are rendered once each.  They can improve efficiency or
 * use different rendering algorithms.
 * A renderBin can contain further renderBins producing a tree hierarchy of renderBins.
 *
 * https://github.com/openscenegraph/osg/blob/master/include/osgUtil/RenderBin#L27-L32
 */
var RenderBin = function ( sortMode ) {
    Object.call( this );

    this._leafs = [];
    this.positionedAttribute = [];
    this.stateGraphList = [];

    RenderBin.prototype.init.call( this, sortMode );
};

RenderBin.SORT_BY_STATE = 0;
RenderBin.SORT_BACK_TO_FRONT = 1;
RenderBin.SORT_FRONT_TO_BACK = 2;


// change it at runtime for default RenderBin if needed
RenderBin.defaultSortMode = RenderBin.SORT_BY_STATE;

RenderBin.BinPrototypes = {
    RenderBin: function () {
        return RenderBin.getOrCreate().init();
    },
    DepthSortedBin: function () {
        return RenderBin.getOrCreate().init( RenderBin.SORT_BACK_TO_FRONT );
    }
};


var sortBackToFrontFunction = function ( a, b ) {
    return b._depth - a._depth;
};


var sortFrontToBackFunction = function ( a, b ) {
    return a._depth - b._depth;
};

var sortBinNumberFunction = function ( a, b ) {
    return a._binNum - b._binNum;
};


RenderBin.prototype = MACROUTILS.objectLibraryClass( MACROUTILS.objectInherit( Object.prototype, {

    init: function ( sortMode ) {

        this._leafs.length = 0;
        this.positionedAttribute.length = 0;
        this._renderStage = undefined;
        this._bins = {};
        this.stateGraphList.length = 0;
        this._parent = undefined;
        this._binNum = 0;

        this._sorted = false;
        this._sortMode = sortMode !== undefined ? sortMode : RenderBin.defaultSortMode;

        this._drawCallback = undefined;

        return this;
    },

    _createRenderBin: function ( binName ) {

        // default render bin constructor
        var renderBinConstructor = RenderBin.BinPrototypes.RenderBin;

        if ( binName && RenderBin.BinPrototypes[ binName ] )
            renderBinConstructor = RenderBin.BinPrototypes[ binName ];

        return renderBinConstructor();
    },

    getStateGraphList: function () {
        return this.stateGraphList;
    },

    copyLeavesFromStateGraphListToRenderLeafList: function () {

        this._leafs.splice( 0, this._leafs.length );
        var detectedNaN = false;

        for ( var i = 0, l = this.stateGraphList.length; i < l; i++ ) {
            var leafs = this.stateGraphList[ i ].leafs;
            for ( var j = 0, k = leafs.length; j < k; j++ ) {
                var leaf = leafs[ j ];
                if ( osgMath.isNaN( leaf._depth ) ) {
                    detectedNaN = true;
                } else {
                    this._leafs.push( leaf );
                }
            }
        }

        if ( detectedNaN ) {
            Notify.debug( 'warning: RenderBin::copyLeavesFromStateGraphListToRenderLeafList() detected NaN depth values, database may be corrupted.' );
        }
        // empty the render graph list to prevent it being drawn along side the render leaf list (see drawImplementation.)
        this.stateGraphList.splice( 0, this.stateGraphList.length );
    },

    getSortMode: function () {
        return this._sortMode;
    },

    sortBackToFront: function () {
        this.copyLeavesFromStateGraphListToRenderLeafList();
        this._leafs.sort( sortBackToFrontFunction );
    },

    sortFrontToBack: function () {
        this.copyLeavesFromStateGraphListToRenderLeafList();
        this._leafs.sort( sortFrontToBackFunction );
    },

    sortImplementation: function () {
        var SortMode = RenderBin;
        switch ( this._sortMode ) {
        case SortMode.SORT_BACK_TO_FRONT:
            this.sortBackToFront();
            break;
        case SortMode.SORT_FRONT_TO_BACK:
            this.sortFrontToBack();
            break;
        case SortMode.SORT_BY_STATE:
            // do nothing
            break;
        }
    },

    sort: function () {
        if ( this._sorted ) {
            return;
        }

        var bins = this._bins;
        var keys = window.Object.keys( bins );
        for ( var i = 0, l = keys.length; i < l; i++ ) {
            bins[ keys[ i ] ].sort();
        }
        this.sortImplementation();

        this._sorted = true;
    },

    setParent: function ( parent ) {
        this._parent = parent;
    },

    getParent: function () {
        return this._parent;
    },

    getBinNumber: function () {
        return this._binNum;
    },

    findOrInsert: function ( binNum, binName ) {
        var bin = this._bins[ binNum ];

        if ( !bin ) {
            bin = this._createRenderBin( binName );
            bin._parent = this;
            bin._binNum = binNum;
            bin._renderStage = this._renderStage;
            this._bins[ binNum ] = bin;
        }

        return bin;
    },

    getStage: function () {
        return this._renderStage;
    },

    addStateGraph: function ( sg ) {
        this.stateGraphList.push( sg );
    },

    reset: function () {
        this.stateGraphList.length = 0;
        this._bins = {};
        this.positionedAttribute.length = 0;
        this._leafs.length = 0;
        this._sorted = false;
    },

    draw: function ( state, previousRenderLeaf ) {

        var previousLeaf = previousRenderLeaf;
        // use callback drawImplementation if exist
        if ( this._drawCallback && this._drawCallback.drawImplementation ) {
            previousLeaf = this._drawCallback.drawImplementation( this, state, previousLeaf );
        } else {
            previousLeaf = this.drawImplementation( state, previousLeaf );
        }

        return previousLeaf;
    },

    applyPositionedAttribute: function ( state, positionedAttributes ) {
        // the idea is to set uniform 'globally' in uniform map.
        for ( var index = 0, l = positionedAttributes.length; index < l; index++ ) {
            var element = positionedAttributes[ index ];
            // add or set uniforms in state
            var stateAttribute = element[ 1 ];
            var matrix = element[ 0 ];
            state.setGlobalDefaultAttribute( stateAttribute );
            stateAttribute.apply( state );
            stateAttribute.applyPositionedUniform( matrix, state );
            state.haveAppliedAttribute( stateAttribute );
        }
    },

    drawImplementation: function ( state, previousRenderLeaf ) {

        var previousLeaf = previousRenderLeaf;
        var binsKeys = window.Object.keys( this._bins );
        var bins = this._bins;

        var binsArray = [];

        for ( var i = 0, l = binsKeys.length; i < l; i++ ) {
            var k = binsKeys[ i ];
            binsArray.push( bins[ k ] );
        }

        binsArray.sort( sortBinNumberFunction );

        var current = 0;
        var end = binsArray.length;

        var bin;
        // draw pre bins
        for ( ; current < end; current++ ) {
            bin = binsArray[ current ];
            if ( bin.getBinNumber() > 0 ) {
                break;
            }
            previousLeaf = bin.draw( state, previousLeaf );
        }

        // draw leafs
        previousLeaf = this.drawLeafs( state, previousLeaf );

        // draw post bins
        for ( ; current < end; current++ ) {
            bin = binsArray[ current ];
            previousLeaf = bin.draw( state, previousLeaf );
        }
        return previousLeaf;
    },


    drawLeafs: function ( state, previousRenderLeaf ) {

        var stateList = this.stateGraphList;
        var leafs = this._leafs;
        var previousLeaf = previousRenderLeaf;
        var leaf;


        // draw fine grained ordering.
        for ( var d = 0, dl = leafs.length; d < dl; d++ ) {
            leaf = leafs[ d ];
            leaf.render( state, previousLeaf );
            previousLeaf = leaf;
        }


        // draw coarse grained ordering.
        for ( var i = 0, l = stateList.length; i < l; i++ ) {

            var sg = stateList[ i ];

            for ( var j = 0, ll = sg.leafs.length; j < ll; j++ ) {

                leaf = sg.leafs[ j ];
                leaf.render( state, previousLeaf );
                previousLeaf = leaf;

            }
        }
        return previousLeaf;
    }
} ), 'osg', 'RenderBin' );


RenderBin.getOrCreate = function () {

    var l = RenderBin._reservedStack[ RenderBin._reservedStackCurrent++ ];
    if ( RenderBin._reservedStackCurrent === RenderBin._reservedStack.length ) {
        RenderBin._reservedStack.push( new RenderBin() );
    }
    return l;

};

RenderBin.resetStack = function () {
    RenderBin._reservedStackCurrent = 0;
};

RenderBin._reservedStack = [ new RenderBin() ];
RenderBin._reservedStackCurrent = 0;

module.exports = RenderBin;
