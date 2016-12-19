'use strict';
var MACROUTILS = require( 'osg/Utils' );
var Node = require( 'osg/Node' );
var Notify = require( 'osg/notify' );
var WebGLCaps = require( 'osg/WebGLCaps' );
var DrawElements = require( 'osg/DrawElements' );
var BufferArrayProxy = require( 'osg/BufferArrayProxy' );

/**
 * Geometry manage array and primitives to draw a geometry.
 * @class Geometry
 */

var Geometry = function () {

    Node.call( this );

    // Use proxy to detect change in vertex attributes
    // you should use setVertexAttribute but if you dont
    if ( window.Proxy ) {

        var self = this;

        this._attributes = {};
        this._primitives = [];
        this.attributes = new Proxy( this._attributes, {
            set: function ( obj, prop, value ) {
                var old = obj[ prop ];
                if ( old !== value ) {
                    obj[ prop ] = value;
                    self.dirty();
                }
                return true;
            }
        } );

        var push = function () {
            this.push.apply( this, arguments );
            self.dirty();

        }.bind( this._primitives );

        var pop = function () {
            this.pop();
            self.dirty();

        }.bind( this._primitives );

        this.primitives = new Proxy( this._primitives, {
            get: function ( obj, key ) {
                if ( key === 'push' ) return push;
                if ( key === 'pop' ) return pop;
                return obj[ key ];
            }
        } );

    } else {

        this.attributes = {};
        this.primitives = [];
        this._primitives = this.primitives;
        this._attributes = this.attributes;

    }

    // function is generated for each Shader Program ID
    // which generates a a special "draw"
    // TODO: could be upon hash of combination of attributes
    // (as multiple shader Programs can use same combination of attributes)
    this._cacheDrawCall = {};

    // VAO cached data, per combination of vertex buffer
    // program id also the cache key
    this._extVAO = undefined;
    this._vao = {};
    this._cacheVertexAttributeBufferList = {};

    // null means the kdTree builder will skip the kdTree creation
    this._shape = undefined;

};

/**
 * enableVAO flag
 * We rely on Proxy to detect changes in vertextes attributes list or in primitives
 * list. If you dont have Proxy and you still want to use the VAO code path, replace
 * OSG.osg.Geometry.enableVAO = true at the begining of your application, but be sure to
 * not change vertexes attributes without calling dirty after.
 */
Geometry.enableVAO = Boolean( window.Proxy );
if ( Geometry.enableVAO ) Notify.info( 'enable VAO' );


/** @lends Geometry.prototype */
Geometry.prototype = MACROUTILS.objectLibraryClass( MACROUTILS.objectInherit( Node.prototype, {

    releaseGLObjects: function () {

        if ( this.stateset !== undefined ) this.stateset.releaseGLObjects();

        var keys = window.Object.keys( this._attributes );
        var value;
        var i, l;

        for ( i = 0, l = keys.length; i < l; i++ ) {
            value = this._attributes[ keys[ i ] ];
            value.releaseGLObjects();
        }

        for ( var j = 0, h = this._primitives.length; j < h; j++ ) {
            var prim = this._primitives[ j ];
            if ( prim.getIndices !== undefined ) {
                if ( prim.getIndices() !== undefined && prim.getIndices() !== null ) {
                    prim.indices.releaseGLObjects();
                }
            }
        }

        this.releaseVAO();

    },

    releaseVAO: function () {

        if ( !this._extVAO ) return;

        var keys = window.Object.keys( this._vao );
        for ( var i = 0, l = keys.length; i < l; i++ ) {
            var prgID = keys[ i ];
            if ( this._vao[ prgID ] ) {
                var vao = this._vao[ prgID ];
                this._extVAO.deleteVertexArrayOES( vao );
                this._vao[ prgID ] = undefined;
            }
        }
    },

    dirty: function () {
        this._cacheDrawCall = {};
        this.releaseVAO();
    },

    getPrimitives: function () {
        // Notify.warn( 'deprecated use instead getPrimitiveSetList' );
        return this.getPrimitiveSetList();
    },

    getAttributes: function () {
        // Notify.warn( 'deprecated use instead getVertexAttributeList' );
        return this.getVertexAttributeList();
    },

    getShape: function () {
        return this._shape;
    },

    setShape: function ( shape ) {
        this._shape = shape;
    },

    getVertexAttributeList: function () {
        return this.attributes;
    },

    /**
     * Return the primitiveset list
     * If you modify something inside this array
     * you must call dirty() on the Geometry
     */
    getPrimitiveSetList: function () {
        return this.primitives;
    },

    /**
     * Set the buffer array on the attribute name key
     * key is often something like Vertex, Normal, Color, ...
     * for classic geometry
     *
     * if you change a buffer a dirty will be automatically
     * called to rebuild the VAO if needed.
     */
    setVertexAttribArray: function ( key, array ) {
        if ( this._attributes[ key ] !== array ) {
            this._attributes[ key ] = array;
            this.dirty();
        }
    },

    _generateVertexSetup: function ( validAttributeKeyList, validAttributeIndexList, includeFirstIndexBuffer ) {

        // generate setup for vertex attribute
        // will be used as setup for vao or as is without vao
        var vertexAttributeSetup = [ '//generated by Geometry::implementation',
            'state.lazyDisablingOfVertexAttributes();',
            'var attr;'
        ];

        for ( var i = 0, l = validAttributeKeyList.length; i < l; i++ ) {

            vertexAttributeSetup.push( 'attr = this._attributes[\'' + validAttributeKeyList[ i ] + '\'];' );
            vertexAttributeSetup.push( 'if ( attr.BufferArrayProxy ) attr = attr.getBufferArray();' );
            vertexAttributeSetup.push( 'if ( !attr.isValid() ) return;' );
            vertexAttributeSetup.push( 'state.setVertexAttribArray(' + validAttributeIndexList[ i ] + ', attr, attr.getNormalize() );' );

        }

        vertexAttributeSetup.push( 'state.applyDisablingOfVertexAttributes();' );

        if ( includeFirstIndexBuffer )
            vertexAttributeSetup.push( 'state.setIndexArray( this._primitives[ 0 ].getIndices() );' );

        return vertexAttributeSetup;
    },

    _generatePrimitive: function ( primitives, hasVertexColor, optimizeVAO ) {

        var primitiveSetup = [
            hasVertexColor ? 'state.enableVertexColor();' : 'state.disableVertexColor();'
        ];

        if ( optimizeVAO ) {
            return primitiveSetup.concat( [
                'var primitive = this._primitives[ 0 ];',
                'var indexes = primitive.getIndices();',
                'if ( indexes.isDirty() ) {;',
                '  indexes.bind( gl );',
                '  indexes.compile( gl );',
                '};',
                'primitive.drawElements( state );'
            ] );
        }


        primitiveSetup.push( 'var primitives = this._primitives;' );
        for ( var j = 0, m = primitives.length; j < m; j++ )
            primitiveSetup.push( 'primitives[' + j + '].draw(state);' );

        return primitiveSetup;
    },

    /**
     *  Generate a function specific to the Geometry/Program
     *  two version one using VAO and a regular one
     */
    generateDrawCommand: ( function () {

        var validAttributeList = [];
        var validAttributeKeyList = [];

        return function ( state, program, prgID ) {

            var attributesCacheKeys = program._attributesCache.getKeys();
            var attributesCacheMap = program._attributesCache;
            var geometryVertexAttributes = this.getVertexAttributeList();

            validAttributeKeyList.length = 0;
            validAttributeList.length = 0;

            // 1 - register valid vertex attributes and color flag

            var attribute, i, l, j, m, key, attr;

            var extVAO = this._extVAO;
            var listVABuff = extVAO ? [] : undefined;

            var hasVertexColor = false;

            for ( i = 0, l = attributesCacheKeys.length; i < l; i++ ) {

                key = attributesCacheKeys[ i ];
                attribute = attributesCacheMap[ key ];
                attr = geometryVertexAttributes[ key ];

                if ( attr === undefined ) continue;

                var attributeBuffer = this._attributes[ key ];

                // dont use VAO if we have BufferArrayProxy
                // typically used for morphing
                if ( attributeBuffer instanceof BufferArrayProxy ) {
                    attributeBuffer = attributeBuffer.getBufferArray();
                    extVAO = false;
                }

                if ( !attributeBuffer.isValid() ) return undefined;

                // store for later usage at draw time/update
                if ( extVAO ) listVABuff.push( attributeBuffer );

                if ( !hasVertexColor && key === 'Color' )
                    hasVertexColor = true;

                validAttributeKeyList.push( key );
                validAttributeList.push( attribute );
            }


            var autogeneratedFunction;
            var functionName;

            // generate specific function using VAO or standard
            if ( extVAO ) {

                this._cacheVertexAttributeBufferList[ prgID ] = listVABuff;

                // if there is only one drawElement we can put the index buffer
                // in the vao
                var optimizeIndexBufferVAO = ( this._primitives.length === 1 && this._primitives[ 0 ] instanceof DrawElements );

                var vertexAttributeSetup = this._generateVertexSetup( validAttributeKeyList, validAttributeList, optimizeIndexBufferVAO );

                state.clearVertexAttribCache();
                var vao = this._extVAO.createVertexArrayOES();
                state.setVertexArrayObject( vao );
                this._vao[ prgID ] = vao;

                // evaluate the vertexAttribute setup to register into the vao
                /*jshint evil: true */
                var vertexSetupCommand = new Function( 'state', vertexAttributeSetup.join( '\n' ) );
                /*jshint evil: false */
                vertexSetupCommand.call( this, state );

                // setup the program
                var vaoSetup = [
                    'var gl = state.getGraphicContext();',
                    'var vao = this._vao[ ' + prgID + ' ] ',
                    'var hasChanged = state.setVertexArrayObject( vao );',
                    'if ( hasChanged ) {',
                    '  var vaList = this._cacheVertexAttributeBufferList[ ' + prgID + ' ];',
                    '  var va;'
                ];
                for ( j = 0, m = listVABuff.length; j < m; j++ ) {
                    vaoSetup.push( '  va = vaList[ ' + j + '];' );
                    vaoSetup.push( '  if ( va.isDirty() ) {;' );
                    vaoSetup.push( '    va.bind( gl );' );
                    vaoSetup.push( '    va.compile( gl );' );
                    vaoSetup.push( '  };' );
                }
                vaoSetup.push( '}' );

                autogeneratedFunction = vaoSetup.concat( this._generatePrimitive( this._primitives, hasVertexColor, optimizeIndexBufferVAO ) ).join( '\n' );
                functionName = 'GeometryDrawImplementationCacheVAO';

            } else {

                autogeneratedFunction = this._generateVertexSetup( validAttributeKeyList, validAttributeList, false ).concat( this._generatePrimitive( this._primitives, hasVertexColor, false ) ).join( '\n' );
                functionName = 'GeometryDrawImplementationCache';

            }

            /*jshint evil: true */
            // name the function
            // http://stackoverflow.com/questions/5905492/dynamic-function-name-in-javascript
            var drawCommand = ( new Function( 'state', 'return function ' + functionName + '( state ) { ' + autogeneratedFunction + '}' ) )();
            /*jshint evil: false */

            this._cacheDrawCall[ prgID ] = drawCommand;
            return drawCommand;
        };

    } )(),

    drawImplementation: function ( state ) {

        var program = state.getLastProgramApplied();
        var prgID = program.getInstanceID();

        var cachedDraw = this._cacheDrawCall[ prgID ];

        // most of the time we should use vao
        if ( this._extVAO && !this._vao[ prgID ] ) state.setVertexArrayObject( null );

        if ( cachedDraw === undefined ) {

            if ( !this._primitives.length ) return;

            // no cache for this combination of vertex attributes
            // compute new Draw Call

            if ( this._extVAO === undefined && Geometry.enableVAO ) { // will be null if not supported
                var extVAO = WebGLCaps.instance( state.getGraphicContext() ).getWebGLExtension( 'OES_vertex_array_object' );
                this._extVAO = extVAO;
            }

            cachedDraw = this.generateDrawCommand( state, program, prgID );
        }

        cachedDraw.call( this, state );

    },

    setBound: function ( bb ) {
        this._boundingBox = bb;
        this._boundingBoxComputed = true;
    },

    computeBoundingBox: function ( boundingBox ) {

        boundingBox.init();

        var vertexArray = this.getVertexAttributeList().Vertex;
        if ( vertexArray && vertexArray.getElements() && vertexArray.getItemSize() > 2 ) {
            var vertexes = vertexArray.getElements();
            var itemSize = vertexArray.getItemSize();

            var min = boundingBox.getMin();
            var max = boundingBox.getMax();

            var minx = min[ 0 ];
            var miny = min[ 1 ];
            var minz = min[ 2 ];
            var maxx = max[ 0 ];
            var maxy = max[ 1 ];
            var maxz = max[ 2 ];

            // if the box is un-initialized min=Inf and max=-Inf
            // we can't simply write if(x > min) [...] else (x < max) [...]
            // most of the time the else condition is run so it's a kinda useless
            // optimization anyway
            for ( var idx = 0, l = vertexes.length; idx < l; idx += itemSize ) {
                var v1 = vertexes[ idx ];
                var v2 = vertexes[ idx + 1 ];
                var v3 = vertexes[ idx + 2 ];
                if ( v1 < minx ) minx = v1;
                if ( v1 > maxx ) maxx = v1;
                if ( v2 < miny ) miny = v2;
                if ( v2 > maxy ) maxy = v2;
                if ( v3 < minz ) minz = v3;
                if ( v3 > maxz ) maxz = v3;
            }

            min[ 0 ] = minx;
            min[ 1 ] = miny;
            min[ 2 ] = minz;
            max[ 0 ] = maxx;
            max[ 1 ] = maxy;
            max[ 2 ] = maxz;
        }

        return boundingBox;
    },

    computeBoundingSphere: function ( boundingSphere ) {
        boundingSphere.init();
        var bb = this.getBoundingBox();
        boundingSphere.expandByBoundingBox( bb );
        return boundingSphere;
    }


} ), 'osg', 'Geometry' );

Geometry.appendVertexAttributeToList = function ( from, to, postfix ) {

    var keys = window.Object.keys( from );
    var key, keyPostFix;

    for ( var i = 0, l = keys.length; i < l; i++ ) {

        key = keys[ i ];
        keyPostFix = key;
        if ( postfix !== undefined )
            keyPostFix += '_' + postfix;

        to[ keyPostFix ] = from[ key ];

    }

};


MACROUTILS.setTypeID( Geometry );

module.exports = Geometry;
