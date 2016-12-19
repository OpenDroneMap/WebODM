/**
 * Authors:
 *  Tuan.kuranes <tuan.kuranes@gmail.com> Jerome Etienne <Jerome.etienne@gmail.com>
 */

'use strict';
var osgPool = {};
osgPool.memoryPools = {};

/*
 *  TODO: Add stats & reports for developper per application  finer calibration (max, min, average)
 *  TODO: Debug Mode: check if not putting object twice, etc.
 *  USAGE: osg.memoryPools.stateGraph = new OsgObjectMemoryPool(osg.StateGraph).grow(50);
 */
osgPool.OsgObjectMemoryPool = function ( ObjectClassName ) {
    return {
        _memPool: [],
        reset: function () {
            this._memPool = [];
            return this;
        },
        put: function ( obj ) {
            this._memPool.push( obj );
        },
        get: function () {
            if ( this._memPool.length > 0 ) {
                return this._memPool.pop();
            }
            this.grow();
            return this.get();
        },
        grow: function ( sizeAddParam ) {
            var sizeAdd;
            if ( sizeAddParam === undefined ) {
                sizeAdd = ( this._memPool.length > 0 ) ? this._memPool.length * 2 : 20;
            } else {
                sizeAdd = sizeAddParam;
            }
            var i = this._memPool.length;
            while ( i++ < sizeAdd ) this._memPool.push( new ObjectClassName() );
            return this;
        }
    };
};

/*
 *  USAGE: osg.memoryPools.arrayPool = new OsgArrayMemoryPool();
 *  mymatrix = osg.memoryPools.arrayPool.get(16);
 *  // do use matrix, etc..
 *  osg.memoryPools.arrayPool.put(mymatrix);
 */
osgPool.OsgArrayMemoryPool = function () {
    return {
        _mempoolofPools: [],
        reset: function () {
            this._memPoolofPools = {};
            return this;
        },
        put: function ( obj ) {
            if ( !this._memPoolofPools[ obj.length ] )
                this._memPoolofPools[ obj.length ] = [];
            this._memPoolofPools[ obj.length ].push( obj );
        },
        get: function ( arraySize ) {
            if ( !this._memPoolofPools[ arraySize ] )
                this._memPoolofPools[ arraySize ] = [];
            else if ( this._memPoolofPools.length > 0 )
                return this._memPool.pop();
            this.grow( arraySize );
            return this.get();
        },
        grow: function ( arraySize, sizeAdd ) {
            if ( sizeAdd === undefined ) sizeAdd = ( this._memPool.length > 0 ) ? this._memPool.length * 2 : 5;
            var i = this._memPool.length;
            while ( i++ < sizeAdd ) this._memPool.push( new Array( arraySize ) );
            return this;
        }
    };
};
/*
 *  USAGE: osg.memoryPools.OsgObjectMemoryStack = new OsgArrayMemoryStack(ctor);
 *         For a stack of object that you reset each frame.
 */
osgPool.OsgObjectMemoryStack = function ( ObjectClassName ) {
    return {
        _current: 0,
        _memPool: [ new ObjectClassName() ],
        reset: function () {
            this._current = 0;
            return this;
        },
        get: function () {
            var obj = this._memPool[ this._current++ ];
            if ( this._current >= this._memPool.length ) {
                this._memPool.push( new ObjectClassName() );
            }
            return obj;
        }
    };
};

module.exports = osgPool;
