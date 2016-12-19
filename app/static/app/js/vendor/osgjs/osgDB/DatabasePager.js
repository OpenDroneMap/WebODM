'use strict';
var P = require( 'bluebird' );
var MACROUTILS = require( 'osg/Utils' );
var NodeVisitor = require( 'osg/NodeVisitor' );
var PagedLOD = require( 'osg/PagedLOD' );
var Timer = require( 'osg/Timer' );

/**
 * Database paging class which manages the loading of files
 * and synchronizing of loaded models with the main scene graph.
 *  @class DatabasePager
 */
var DatabasePager = function () {
    this._pendingRequests = [];
    this._pendingNodes = [];
    this._loading = false;
    this._progressCallback = undefined;
    this._lastCB = true;
    this._activePagedLODList = new Set();
    this._childrenToRemoveList = new Set();
    this._downloadingRequestsNumber = 0;
    this._maxRequestsPerFrame = 10;
    this._acceptNewRequests = true;
    // In OSG the targetMaximumNumberOfPagedLOD is 300 by default
    // here we set 75 as we need to be more strict with memory in a browser
    // This value can be setted using setTargetMaximumNumberOfPageLOD method.
    this._targetMaximumNumberOfPagedLOD = 75;
};

var DatabaseRequest = function () {
    this._loadedModel = undefined;
    this._group = undefined;
    this._url = undefined;
    this._function = undefined;
    this._timeStamp = 0.0;
    this._groupExpired = false;
    this._priority = 0.0;
};

var FindPagedLODsVisitor = function ( pagedLODList, frameNumber ) {
    NodeVisitor.call( this, NodeVisitor.TRAVERSE_ALL_CHILDREN );
    this._activePagedLODList = pagedLODList;
    this._frameNumber = frameNumber;
};
FindPagedLODsVisitor.prototype = MACROUTILS.objectInherit( NodeVisitor.prototype, {
    apply: function ( node ) {
        if ( node.getTypeID() === PagedLOD.getTypeID() ) {
            node.setFrameNumberOfLastTraversal( this._frameNumber );
            this._activePagedLODList.add( node );
        }
        this.traverse( node );
    }
} );

var ReleaseVisitor = function () {
    NodeVisitor.call( this, NodeVisitor.TRAVERSE_ALL_CHILDREN );
};
ReleaseVisitor.prototype = MACROUTILS.objectInherit( NodeVisitor.prototype, {
    apply: function ( node ) {
        // mark GLResources in nodes to be released
        node.releaseGLObjects();
        this.traverse( node );
    }
} );

var ExpirePagedLODVisitor = function () {
    NodeVisitor.call( this, NodeVisitor.TRAVERSE_ALL_CHILDREN );
    this._childrenList = [];
};

ExpirePagedLODVisitor.prototype = MACROUTILS.objectInherit( NodeVisitor.prototype, {

    apply: function ( node ) {
        if ( node.getTypeID() === PagedLOD.getTypeID() ) {
            this._childrenList.push( node );
            this._markRequestsExpired( node );
        }
        this.traverse( node );
    },

    removeExpiredChildrenAndFindPagedLODs: function ( plod, expiryTime, expiryFrame, removedChildren ) {
        if ( !plod.children.length ) return false;

        var sizeBefore = removedChildren.length;
        plod.removeExpiredChildren( expiryTime, expiryFrame, removedChildren );
        for ( var i = sizeBefore; i < removedChildren.length; i++ ) {
            removedChildren[ i ].accept( this );
        }
        return sizeBefore !== removedChildren.length;
    },

    _markRequestsExpired: function ( plod ) {
        var numRanges = plod._perRangeDataList.length;
        var request;
        for ( var i = 0; i < numRanges; i++ ) {
            request = plod.getDatabaseRequest( i );
            if ( request !== undefined ) {
                request._groupExpired = true;
                request._loadedModel = null;
            }
        }
    }
} );

DatabasePager.prototype = MACROUTILS.objectLibraryClass( {

    setTargetMaximumNumberOfPageLOD: function ( target ) {
        this._targetMaximumNumberOfPagedLOD = target;
    },

    getTargetMaximumNumberOfPageLOD: function () {
        return this._targetMaximumNumberOfPagedLOD;
    },

    setAcceptNewDatabaseRequests: function ( acceptNewRequests ) {
        this._acceptNewRequests = acceptNewRequests;
    },
    getAcceptNewDatabaseRequests: function () {
        return this._acceptNewRequests;
    },
    reset: function () {
        this._pendingRequests = [];
        this._pendingNodes = [];
        this._loading = false;
        this._lastCB = true;
        this._activePagedLODList.clear();
        this._childrenToRemoveList.clear();
        this._downloadingRequestsNumber = 0;
        this._maxRequestsPerFrame = 10;
        this._acceptNewRequests = true;
        this._targetMaximumNumberOfPagedLOD = 75;
    },

    updateSceneGraph: function ( frameStamp ) {
        // Progress callback
        if ( this._progressCallback !== undefined ) {
            // Maybe we should encapsulate this in a promise.
            this.executeProgressCallback();
        }
        // We need to control the time spent in DatabasePager tasks to
        // avoid making the rendering slow.
        // Probably we can have a time parameter to manage all the tasks.
        // Now it is fixed to 0.0025 ms to remove expired childs
        // and 0.005 ms  to add to the scene the loaded requests.

        // Remove expired nodes
        this.removeExpiredSubgraphs( frameStamp, 0.0025 );
        // Time to do the requests.
        this.takeRequests();
        // Add the loaded data to the graph
        this.addLoadedDataToSceneGraph( frameStamp, 0.005 );
    },


    executeProgressCallback: function () {
        if ( this._pendingRequests.length > 0 || this._pendingNodes.length > 0 ) {
            this._progressCallback( this._pendingRequests.length + this._downloadingRequestsNumber, this._pendingNodes.length );
            this._lastCB = false;
        } else {
            if ( !this._lastCB ) {
                this._progressCallback( this._pendingRequests.length + this._downloadingRequestsNumber, this._pendingNodes.length );
                this._lastCB = true;
            }
        }
    },

    setMaxRequestsPerFrame: function ( numRequests ) {
        this._maxRequestsPerFrame = numRequests;
    },

    getMaxRequestsPerFrame: function () {
        return this._maxRequestsPerFrame;
    },

    getRequestListSize: function () {
        return this._pendingRequests.length + this._downloadingRequestsNumber;
    },

    setProgressCallback: function ( cb ) {
        this._progressCallback = cb;
    },

    addLoadedDataToSceneGraph: function ( frameStamp, availableTime ) {

        if ( availableTime <= 0.0 ) return 0.0;

        // Prune the list of database requests.
        var elapsedTime = 0.0;
        var beginTime = Timer.instance().tick();
        this._pendingNodes.sort( function ( r1, r2 ) {
            return r2._timeStamp - r1._timeStamp;
        } );

        for ( var i = 0; i < this._pendingNodes.length; i++ ) {
            if ( elapsedTime > availableTime ) return 0.0;

            var request = this._pendingNodes.shift();
            var frameNumber = frameStamp.getFrameNumber();
            var timeStamp = frameStamp.getSimulationTime();

            // If the request is not expired, then add/register new childs
            if ( request._groupExpired === false ) {

                var plod = request._group;
                plod.setTimeStamp( plod.children.length, timeStamp );
                plod.setFrameNumber( plod.children.length, frameNumber );
                plod.addChildNode( request._loadedModel );

                // Register PagedLODs.
                if ( !this._activePagedLODList.has( plod ) ) {
                    this.registerPagedLODs( plod, frameNumber );
                } else {
                    this.registerPagedLODs( request._loadedModel, frameNumber );
                }

            } else {

                // Clean the request
                request._loadedModel = undefined;
                request = undefined;

            }
            elapsedTime = Timer.instance().deltaS( beginTime, Timer.instance().tick() );
        }
        availableTime -= elapsedTime;
        return availableTime;
    },

    isLoading: function () {
        return this._loading;
    },

    registerPagedLODs: function ( subgraph, frameNumber ) {
        if ( !subgraph ) return;
        subgraph.accept( new FindPagedLODsVisitor( this._activePagedLODList, frameNumber ) );
    },

    requestNodeFile: function ( func, url, node, timestamp, priority ) {
        // Check if we are currently accepting requests.
        if ( !this._acceptNewRequests ) return undefined;
        // We don't need to determine if the dbrequest is in the queue
        // That is already done in the PagedLOD, so we just create the request
        var dbrequest = new DatabaseRequest();
        dbrequest._group = node;
        dbrequest._function = func;
        dbrequest._url = url;
        dbrequest._timeStamp = timestamp;
        dbrequest._priority = priority;
        this._pendingRequests.push( dbrequest );
        return dbrequest;
    },

    takeRequests: function () {
        if ( this._pendingRequests.length ) {
            var numRequests = Math.min( this._maxRequestsPerFrame, this._pendingRequests.length );
            this._pendingRequests.sort( function ( r1, r2 ) {
                // Ask for newer requests first.
                var value = r1._timeStamp - r2._timeStamp;
                // Ask for the greater priority if the timestamp is the same.
                if ( value === 0 ) {
                    value = r1._priority - r2._priority;
                }
                return value;

            } );
            for ( var i = 0; i < numRequests; i++ ) {
                this._downloadingRequestsNumber++;
                this.processRequest( this._pendingRequests.shift() );
            }
        }
    },

    processRequest: function ( dbrequest ) {

        this._loading = true;
        var that = this;
        // Check if the request is valid;
        if ( dbrequest._groupExpired ) {
            //Notify.log( 'DatabasePager::processRequest() Request expired.' );
            that._downloadingRequestsNumber--;
            this._loading = false;
            return;
        }

        // Load from function
        if ( dbrequest._function !== undefined ) {
            this.loadNodeFromFunction( dbrequest._function, dbrequest._group ).then( function ( child ) {
                that._downloadingRequestsNumber--;
                dbrequest._loadedModel = child;
                that._pendingNodes.push( dbrequest );
                that._loading = false;
            } );

        } else if ( dbrequest._url !== '' ) { // Load from URL
            this.loadNodeFromURL( dbrequest._url ).then( function ( child ) {
                that._downloadingRequestsNumber--;
                dbrequest._loadedModel = child;
                that._pendingNodes.push( dbrequest );
                that._loading = false;
            } );
        }
    },

    loadNodeFromFunction: function ( func, plod ) {
        // Need to call with pagedLOD as parent, to be able to have multiresolution structures.
        var promise = ( func )( plod );
        // should func always return a promise ?
        if ( !promise ) return P.reject();
        if ( promise && promise.then ) return promise;
        return P.resolve( promise );
    },

    loadNodeFromURL: function ( url ) {
        var ReaderParser = require( 'osgDB/readerParser' );
        // Call to ReaderParser just in case there is a custom readNodeURL Callback
        // See osgDB/options.js and/or osgDB/Input.js
        // TODO: We should study if performance can be improved if separating the XHTTP request from
        // the parsing. This way several/many request could be done at the same time.
        // Also we should be able to cancel requests, so there is a need to have access
        // to the HTTPRequest Object
        return ReaderParser.readNodeURL( url );
    },

    releaseGLExpiredSubgraphs: function ( availableTime ) {

        if ( availableTime <= 0.0 ) return 0.0;
        // We need to test if we have time to flush
        var elapsedTime = 0.0;
        var beginTime = Timer.instance().tick();
        var that = this;

        this._childrenToRemoveList.forEach( function ( node ) {
            // If we don't have more time, break the loop.
            if ( elapsedTime > availableTime ) return;
            that._childrenToRemoveList.delete( node );
            node.accept( new ReleaseVisitor() );
            node.removeChildren();
            node = null;
            elapsedTime = Timer.instance().deltaS( beginTime, Timer.instance().tick() );
        } );

        availableTime -= elapsedTime;
        return availableTime;
    },

    removeExpiredSubgraphs: function ( frameStamp, availableTime ) {

        if ( frameStamp.getFrameNumber() === 0 ) return 0.0;

        var numToPrune = this._activePagedLODList.size - this._targetMaximumNumberOfPagedLOD;
        var expiryTime = frameStamp.getSimulationTime() - 0.1;
        var expiryFrame = frameStamp.getFrameNumber() - 1;
        // First traverse and remove inactive PagedLODs, as their children will
        // certainly have expired.
        // TODO: Then traverse active nodes if we still need to prune.
        if ( numToPrune > 0 ) {
            availableTime = this.removeExpiredChildren( numToPrune, expiryTime, expiryFrame, availableTime );
        }
        return availableTime;
    },

    removeExpiredChildren: function ( numToPrune, expiryTime, expiryFrame, availableTime ) {
        // Iterate over the activePagedLODList to remove expired children
        // We need to control the time spent in remove childs.
        var elapsedTime = 0.0;
        var beginTime = Timer.instance().tick();
        var that = this;
        var removedChildren = [];
        var expiredPagedLODVisitor = new ExpirePagedLODVisitor();

        this._activePagedLODList.forEach( function ( plod ) {
            // Check if we have time, else return 0
            if ( elapsedTime > availableTime ) return 0.0;
            if ( numToPrune < 0 ) return availableTime;
            // See if plod is still active, so we don't have to prune
            if ( expiryFrame < plod.getFrameNumberOfLastTraversal() ) return availableTime;
            expiredPagedLODVisitor.removeExpiredChildrenAndFindPagedLODs( plod, expiryTime, expiryFrame, removedChildren );
            for ( var i = 0; i < expiredPagedLODVisitor._childrenList.length; i++ ) {
                that._activePagedLODList.delete( expiredPagedLODVisitor._childrenList[ i ] );
                numToPrune--;
            }
            // Add to the remove list all the childs deleted
            for ( i = 0; i < removedChildren.length; i++ ) {
                that._childrenToRemoveList.add( removedChildren[ i ] );
            }
            expiredPagedLODVisitor._childrenList.length = 0;
            removedChildren.length = 0;
            elapsedTime = Timer.instance().deltaS( beginTime, Timer.instance().tick() );
        } );
        availableTime -= elapsedTime;
        return availableTime;
    }
}, 'osgDB', 'DatabasePager' );

module.exports = DatabasePager;
