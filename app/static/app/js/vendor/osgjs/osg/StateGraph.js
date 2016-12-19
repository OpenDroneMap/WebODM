'use strict';
var osgPool = require( 'osgUtil/osgPool' );


var StateGraph = function () {
    this.depth = 0;
    this.children = {};
    this.children.keys = [];
    this.leafs = [];
    this.stateset = undefined;
    this.parent = undefined;
};

StateGraph.prototype = {

    clean: function () {

        this.leafs.length = 0;
        this.stateset = undefined;
        this.parent = undefined;
        this.depth = 0;
        var children = this.children;
        var child;
        var key, keys = children.keys;

        for ( var i = 0, l = keys.length; i < l; i++ ) {

            key = keys[ i ];
            child = children[ key ];
            child.clean();
            osgPool.memoryPools.stateGraph.put( child );

        }

        this.children = {};
        keys.length = 0;
        this.children.keys = keys;
    },

    getStateSet: function () {
        return this.stateset;
    },

    findOrInsert: function ( stateset ) {

        var sg;
        var stateSetID = stateset.getInstanceID();
        var children = this.children;

        if ( !children[ stateSetID ] ) {

            //sg = new StateGraph();
            sg = osgPool.memoryPools.stateGraph.get();

            sg.parent = this;
            sg.depth = this.depth + 1;
            sg.stateset = stateset;
            children[ stateSetID ] = sg;
            children.keys.push( stateSetID );

        } else {

            sg = children[ stateSetID ];

        }
        return sg;
    }

};

StateGraph.moveStateGraph = function ( state, sgCurrentArg, sgNewArg ) {

    var stack = [];
    var sgNew = sgNewArg;
    var sgCurrent = sgCurrentArg;
    var i, l;
    if ( sgNew === sgCurrent || sgNew === undefined ) return;

    if ( sgCurrent === undefined ) {
        // push stateset from sgNew to root, and apply
        // stateset from root to sgNew
        do {
            if ( sgNew.stateset !== undefined ) {
                stack.push( sgNew.stateset );
            }
            sgNew = sgNew.parent;
        } while ( sgNew );

        for ( i = stack.length - 1, l = 0; i >= l; --i ) {
            state.pushStateSet( stack[ i ] );
        }
        return;

    } else if ( sgCurrent.parent === sgNew.parent ) {
        // first handle the typical case which is two state groups
        // are neighbours.

        // state has changed so need to pop old state.
        if ( sgCurrent.stateset !== undefined ) {
            state.popStateSet();
        }
        // and push new state.
        if ( sgNew.stateset !== undefined ) {
            state.pushStateSet( sgNew.stateset );
        }
        return;
    }

    // need to pop back up to the same depth as the new state group.
    while ( sgCurrent.depth > sgNew.depth ) {
        if ( sgCurrent.stateset !== undefined ) {
            state.popStateSet();
        }
        sgCurrent = sgCurrent.parent;
    }

    // use return path to trace back steps to sgNew.
    stack = [];

    // need to pop back up to the same depth as the curr state group.
    while ( sgNew.depth > sgCurrent.depth ) {
        if ( sgNew.stateset !== undefined ) {
            stack.push( sgNew.stateset );
        }
        sgNew = sgNew.parent;
    }

    // now pop back up both parent paths until they agree.

    // DRT - 10/22/02
    // should be this to conform with above case where two StateGraph
    // nodes have the same parent
    while ( sgCurrent !== sgNew ) {
        if ( sgCurrent.stateset !== undefined ) {
            state.popStateSet();
        }
        sgCurrent = sgCurrent.parent;

        if ( sgNew.stateset !== undefined ) {
            stack.push( sgNew.stateset );
        }
        sgNew = sgNew.parent;
    }

    for ( i = stack.length - 1, l = 0; i >= l; --i ) {
        state.pushStateSet( stack[ i ] );
    }
};

module.exports = StateGraph;
