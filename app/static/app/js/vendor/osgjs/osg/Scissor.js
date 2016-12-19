'use strict';
var MACROUTILS = require( 'osg/Utils' );
var StateAttribute = require( 'osg/StateAttribute' );

var Scissor = function ( x, y, w, h ) {

    StateAttribute.call( this );

    this._x = x !== undefined ? x : -1;
    this._y = y !== undefined ? y : -1;
    this._width = w !== undefined ? w : -1;

    this._height = h !== undefined ? h : -1;
};

Scissor.prototype = MACROUTILS.objectLibraryClass( MACROUTILS.objectInherit( StateAttribute.prototype, {

    attributeType: 'Scissor',

    cloneType: function () {
        return new Scissor();
    },

    apply: function ( state ) {

        var gl = state.getGraphicContext();
        if ( this._x !== -1 ) {

            gl.enable( gl.SCISSOR_TEST );
            gl.scissor( this._x, this._y, this._width, this._height );

        } else {

            gl.disable( gl.SCISSOR_TEST );

        }
    },

    setScissor: function ( x, y, width, height ) {

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
    }


} ), 'osg', 'Scissor' );

module.exports = Scissor;
