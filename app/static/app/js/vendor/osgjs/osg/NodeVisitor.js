'use strict';

var NodeVisitor = function ( traversalMode ) {
    /*jshint bitwise: false */
    this.traversalMask = ~0x0;
    /*jshint bitwise: true */
    this.nodeMaskOverride = 0;
    this.traversalMode = traversalMode;
    if ( traversalMode === undefined ) {
        this.traversalMode = NodeVisitor.TRAVERSE_ALL_CHILDREN;
    }
    this.nodePath = [];
    this.visitorType = NodeVisitor.NODE_VISITOR;
    this._databaseRequestHandler = undefined;
    this._frameStamp = undefined;

    this.traverse = NodeVisitor._traversalFunctions[ this.traversalMode ];
    this.pushOntoNodePath = NodeVisitor._pushOntoNodePath[ this.traversalMode ];
    this.popFromNodePath = NodeVisitor._popFromNodePath[ this.traversalMode ];
};

//NodeVisitor.TRAVERSE_NONE = 0;
NodeVisitor.TRAVERSE_PARENTS = 1;
NodeVisitor.TRAVERSE_ALL_CHILDREN = 2;
NodeVisitor.TRAVERSE_ACTIVE_CHILDREN = 3;

NodeVisitor.NODE_VISITOR = 0;
NodeVisitor.UPDATE_VISITOR = 1;
NodeVisitor.CULL_VISITOR = 2;

// =================== Traversal functions ===============
var traverseParents = function traverseParents( node ) {
    node.ascend( this );
};

var traverseChildren = function traverseAllChildren( node ) {
    node.traverse( this );
};

// must be sync with TRAVERSE_ENUMS
NodeVisitor._traversalFunctions = [
    undefined,
    traverseParents,
    traverseChildren,
    traverseChildren
];

// =================== PushOntoNodePath functions ===============
var pushOntoNodePathParents = function ( node ) {
    this.nodePath.unshift( node );
};

var pushOntoNodePathChildren = function ( node ) {
    this.nodePath.push( node );
};

NodeVisitor._pushOntoNodePath = [
    undefined,
    pushOntoNodePathParents,
    pushOntoNodePathChildren,
    pushOntoNodePathChildren
];

// =================== PopOntoNodePath functions ===============
var popFromNodePathParents = function () {
    return this.nodePath.shift();
};

var popFromNodePathChildren = function () {
    this.nodePath.pop();
};

NodeVisitor._popFromNodePath = [
    undefined,
    popFromNodePathParents,
    popFromNodePathChildren,
    popFromNodePathChildren
];


NodeVisitor.prototype = {

    reset: function () {
        // to be used when you want to re-use a nv
        this.nodePath.length = 0;
    },

    setFrameStamp: function ( frameStamp ) {
        this._frameStamp = frameStamp;
    },

    getFrameStamp: function () {
        return this._frameStamp;
    },


    setNodeMaskOverride: function ( m ) {
        this.nodeMaskOverride = m;
    },
    getNodeMaskOverride: function () {
        return this.nodeMaskOverride;
    },

    setTraversalMask: function ( m ) {
        this.traversalMask = m;
    },
    getTraversalMask: function () {
        return this.traversalMask;
    },

    getNodePath: function () {
        return this.nodePath;
    },

    pushOntoNodePath: function ( node ) {
        NodeVisitor._pushOntoNodePath[ this.traversalMode ].call( this, node );
    },
    popFromNodePath: function () {
        NodeVisitor._popFromNodePath[ this.traversalMode ].call( this );
    },
    validNodeMask: function ( node ) {
        var nm = node.getNodeMask();
        /*jshint bitwise: false */
        return ( ( this.traversalMask & ( this.nodeMaskOverride | nm ) ) !== 0 );
        /*jshint bitwise: true */
    },
    apply: function ( node ) {
        this.traverse( node );
    },
    traverse: function ( node ) {
        NodeVisitor._traversalFunctions[ this.traversalMode ].call( this, node );
    },
    getVisitorType: function () {
        return this.visitorType;
    },
    setDatabaseRequestHandler: function ( dbpager ) {
        this._databaseRequestHandler = dbpager;
    },
    getDatabaseRequestHandler: function () {
        return this._databaseRequestHandler;
    }
};

module.exports = NodeVisitor;
