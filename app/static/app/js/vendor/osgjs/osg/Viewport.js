'use strict';
var MACROUTILS = require( 'osg/Utils' );
var StateAttribute = require( 'osg/StateAttribute' );
var mat4 = require( 'osg/glMatrix' ).mat4;
var vec3 = require( 'osg/glMatrix' ).vec3;

var Viewport = function ( x, y, w, h ) {
    StateAttribute.call( this );

    this._x = x !== undefined ? x : 0;
    this._y = y !== undefined ? y : 0;
    this._width = w !== undefined ? w : 800;
    this._height = h !== undefined ? h : 600;
};

Viewport.prototype = MACROUTILS.objectLibraryClass( MACROUTILS.objectInherit( StateAttribute.prototype, {

    attributeType: 'Viewport',

    cloneType: function () {
        return new Viewport();
    },

    apply: function ( state ) {
        var gl = state.getGraphicContext();
        gl.viewport( this._x, this._y, this._width, this._height );
    },

    setViewport: function ( x, y, width, height ) {
        this._x = x;
        this._y = y;
        this._width = width;
        this._height = height;
    },

    x: function () {
        return this._x;
    },

    y: function () {
        return this._y;
    },

    width: function () {
        return this._width;
    },

    height: function () {
        return this._height;
    },

    computeWindowMatrix: ( function () {
        var translate = mat4.create();
        var scale = mat4.create();
        var unitVec = vec3.fromValues( 1.0, 1.0, 1.0 );
        return function ( destination ) {
            // res = Matrix offset * Matrix scale * Matrix translate
            mat4.fromTranslation( translate, unitVec );
            mat4.fromScaling( scale, [ 0.5 * this._width, 0.5 * this._height, 0.5 ] );
            var offset = mat4.fromTranslation( destination, vec3.fromValues( this._x, this._y, 0.0 ) );

            return mat4.mul( offset, offset, mat4.mul( scale, scale, translate ) );

        };
    } )()

} ), 'osg', 'Viewport' );

module.exports = Viewport;
