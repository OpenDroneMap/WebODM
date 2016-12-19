'use strict';

var Notify = require( 'osg/notify' );

/*
use EXT_disjoint_timer_queryto time webgl calls GPU side average over multiple frames

If timestamp feature is not supported, we virtualize the query by splitting and adding 
dummy queries, that way it should handle both nested and interleaved queries.

Also, if you time the same queryID multiple time in the same frame, it will sum the different 
queries, that way you can track a particular of gl command for examples

*/

var TimerGPU = function ( gl ) {

    this._enabled = false;

    if ( gl ) {

        var ext = gl.getExtension( 'EXT_disjoint_timer_query' );
        if ( !ext ) return this;

        // https://github.com/KhronosGroup/WebGL/blob/master/sdk/tests/conformance/extensions/ext-disjoint-timer-query.html#L102
        // run the page if strange results
        // to validate you gpu/browser has correct gpu queries support
        this._hasTimeElapsed = ext.getQueryEXT( ext.TIME_ELAPSED_EXT, ext.QUERY_COUNTER_BITS_EXT ) >= 30;
        this._hasTimeStamp = ext.getQueryEXT( ext.TIMESTAMP_EXT, ext.QUERY_COUNTER_BITS_EXT ) >= 30;

        if ( !this._hasTimeElapsed && !this._hasTimeStamp ) {
            return this;
        }

        // no timestamp means not start/end absolute time
        // which means each start must be followed by a end
        // BEFORE any other start (of other queryID)
        if ( !this._hasTimeStamp ) Notify.debug( 'Warning: do not use interleaved GPU query' );

        this._gl = gl;
        this._glTimer = ext;
        this._enabled = true;

    }

    this._frameAverageCount = 10;

    this._glQueries = [];
    this._queriesByID = {};
    this._userQueries = []; // for timestamp, it's the same as _glQueries

    // stuffs used to virtualize query (no timestamp)
    this._queryCount = 0;
    this._nbOpened = 0;
};

TimerGPU.FRAME_COUNT = 0;

TimerGPU.instance = function ( gl ) {

    if ( !TimerGPU._instance ) {
        TimerGPU._instance = new TimerGPU( gl );
    } else if ( gl && TimerGPU._instance.getContext() !== gl ) {
        TimerGPU._instance.setContext( gl );
    }
    return TimerGPU._instance;

};

TimerGPU.prototype = {

    getContext: function () {
        return this._gl;
    },
    setContext: function ( gl ) {
        this._gl = gl;
    },
    setFrameAverageCount: function ( val ) {
        this._frameAverageCount = val;
    },

    clearQueries: function () {
        var glQueries = this._glQueries;
        for ( var i = 0, nbQueries = glQueries.length; i < nbQueries; ++i ) {
            var query = glQueries[ i ];
            this._glTimer.deleteQueryEXT( query._pollingStartQuery );
            if ( query._pollingEndQuery ) this._glTimer.deleteQueryEXT( query );
        }

        this._userQueries.length = 0;
        this._glQueries.length = 0;
        this._queriesByID = {};
    },

    supportTimeStamp: function () {
        return this._hasTimeStamp;
    },

    // many browser doesn't yet have
    // the marvellous gpu timers
    enable: function () {
        // enable only if we have the extension
        this._enabled = this._glTimer;
    },

    disable: function () {
        this._enabled = false;
    },
    isEnabled: function () {
        return this._enabled;
    },

    setCallback: function ( cb ) {
        this._callback = cb;
    },

    createUserQuery: function ( queryID ) {
        var query;
        if ( this._hasTimeStamp ) {
            query = this.createGLQuery();
        } else {
            query = {
                _startIndex: 0,
                _endIndex: 0
            };
        }

        query._id = queryID;
        query._frame = TimerGPU.FRAME_COUNT;
        query._isOpened = true;
        query._siblings = []; // if the query is called multiple time in the same frame

        return query;
    },

    createGLQuery: function () {
        var query = {};
        query._isWaiting = false; // wait typically 1 or 2 frames
        query._pollingStartQuery = undefined; // gl query object
        query._pollingEndQuery = undefined; // gl query object (timestamp only)
        query._averageTimer = 0.0; // cumulative average time
        query._resultCount = 0; // cumulative average count

        if ( this._hasTimeStamp ) query._pollingEndQuery = this._glTimer.createQueryEXT();
        query._pollingStartQuery = this._glTimer.createQueryEXT();

        this._glQueries.push( query );

        return query;
    },

    getOrCreateLastGLQuery: function () {
        var query = this._glQueries[ this._queryCount - 1 ];
        if ( query ) return query;

        query = this._glQueries[ this._queryCount - 1 ] = this.createGLQuery();

        return query;
    },

    beginCurrentQuery: function () {
        if ( this._nbOpened === 0 ) return;

        this._queryCount++;

        var query = this.getOrCreateLastGLQuery();
        if ( !query._isWaiting ) {
            this._glTimer.beginQueryEXT( this._glTimer.TIME_ELAPSED_EXT, query._pollingStartQuery );
        }
    },

    endCurrentQuery: function () {
        if ( this._nbOpened === 0 ) return;

        if ( !this.getOrCreateLastGLQuery()._isWaiting ) {
            this._glTimer.endQueryEXT( this._glTimer.TIME_ELAPSED_EXT );
        }
    },

    getAvailableQueryByID: function ( queryID ) {
        var query = this._queriesByID[ queryID ];
        if ( !query ) {
            query = this._queriesByID[ queryID ] = this.createUserQuery( queryID );
            this._userQueries.push( query );
            return query;
        }

        if ( query._frame === TimerGPU.FRAME_COUNT ) {

            if ( query._isOpened ) return query;

            var siblings = query._siblings;
            for ( var i = 0, nbSiblings = siblings.length; i < nbSiblings; ++i ) {
                var qsib = siblings[ i ];
                if ( qsib._frame !== TimerGPU.FRAME_COUNT || qsib._isOpened ) {
                    qsib._frame = TimerGPU.FRAME_COUNT;
                    return qsib;
                }
            }

            var newQuery = this.createUserQuery();
            siblings.push( newQuery );
            return newQuery;
        }

        query._frame = TimerGPU.FRAME_COUNT;

        return query;
    },

    // start recording time if query already exist, don't recreate
    start: function ( queryID ) {

        // If timing currently disabled or glTimer does not exist, exit early.
        if ( !this._enabled ) {
            return undefined;
        }

        var query = this.getAvailableQueryByID( queryID );
        query._isOpened = true;

        if ( this._hasTimeStamp ) {

            if ( !query._isWaiting ) this._glTimer.queryCounterEXT( query._pollingStartQuery, this._glTimer.TIMESTAMP_EXT );

        } else {

            this.endCurrentQuery();

            this._nbOpened++;
            query._startIndex = this._queryCount;

            this.beginCurrentQuery();

        }

    },

    // stop query recording (if running) polls for results
    end: function ( queryID ) {

        if ( !this._enabled ) {
            return;
        }

        var query = this.getAvailableQueryByID( queryID );
        query._isOpened = false;

        if ( this._hasTimeStamp ) {

            if ( !query._isWaiting ) this._glTimer.queryCounterEXT( query._pollingEndQuery, this._glTimer.TIMESTAMP_EXT );

        } else {

            this.endCurrentQuery();

            query._endIndex = this._queryCount;
            this._nbOpened--;

            this.beginCurrentQuery();

        }

    },

    computeQueryAverageTime: function ( query ) {
        var average = 0;
        var glQueries = this._glQueries;

        for ( var i = query._startIndex; i < query._endIndex; ++i ) {
            var glAvg = glQueries[ i ]._averageTimer;
            if ( glAvg < 0 ) return -1;
            average += glAvg;
        }

        return average;
    },

    computeFullAverageTime: function ( query ) {
        var average = this.computeQueryAverageTime( query );

        if ( average < 0 ) return -1;

        var siblings = query._siblings;
        for ( var i = 0, nbSiblings = siblings.length; i < nbSiblings; ++i ) {
            var qsib = siblings[ i ];
            if ( qsib._frame !== TimerGPU.FRAME_COUNT - 1 )
                continue;

            var sibAvg = this.computeQueryAverageTime( qsib );
            if ( sibAvg < 0 ) return -1;
            average += sibAvg;
        }

        return average;
    },

    pollQueries: function () {

        TimerGPU.FRAME_COUNT++;
        this._queryCount = 0;
        this._nbOpened = 0;

        if ( !this._enabled || !this._callback ) {
            return;
        }

        var glQueries = this._glQueries;
        var nbGlQueries = glQueries.length;
        var i;

        // all timer are corrupted, clear the queries
        var disjoint = this._gl.getParameter( this._glTimer.GPU_DISJOINT_EXT );
        if ( disjoint ) {
            for ( i = 0; i < nbGlQueries; ++i ) {
                glQueries[ i ]._isWaiting = false;
            }
            return;
        }


        // update average time for each queries
        for ( i = 0; i < nbGlQueries; ++i ) {
            this.pollQuery( glQueries[ i ] );
        }

        var userQueries = this._userQueries;
        var nbUserQueries = userQueries.length;

        for ( i = 0; i < nbUserQueries; ++i ) {
            var query = userQueries[ i ];
            var average = this.computeFullAverageTime( query );
            if ( average > 0 ) {
                this._callback( average, query._id );
            }
        }
    },

    pollQuery: function ( query ) {
        query._isWaiting = false;

        // last to be queried
        var lastQuery = this._hasTimeStamp ? query._pollingEndQuery : query._pollingStartQuery;

        // wait till results are ready
        var available = this._glTimer.getQueryObjectEXT( lastQuery, this._glTimer.QUERY_RESULT_AVAILABLE_EXT );
        if ( !available ) {
            query._isWaiting = true;
            return 0;
        }

        var timeElapsed;

        if ( this._hasTimeStamp ) {

            var startTime = this._glTimer.getQueryObjectEXT( query._pollingStartQuery, this._glTimer.QUERY_RESULT_EXT );
            var endTime = this._glTimer.getQueryObjectEXT( lastQuery, this._glTimer.QUERY_RESULT_EXT );
            timeElapsed = endTime - startTime;

        } else {

            timeElapsed = this._glTimer.getQueryObjectEXT( lastQuery, this._glTimer.QUERY_RESULT_EXT );

        }

        query._resultCount++;

        // restart cumulative average every frameAveragecount frames
        if ( query._resultCount > this._frameAverageCount ) {
            query._averageTimer = 0.0;
            query._resultCount = 1;
        }

        // https://en.wikipedia.org/wiki/Moving_average#Cumulative_moving_average
        query._averageTimer = query._averageTimer + ( ( timeElapsed - query._averageTimer ) / ( query._resultCount ) );

        return query._averageTimer;
    }

};

module.exports = TimerGPU;
