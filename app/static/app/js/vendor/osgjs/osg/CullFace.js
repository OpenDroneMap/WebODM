'use strict';
var MACROUTILS = require( 'osg/Utils' );
var StateAttribute = require( 'osg/StateAttribute' );


/**
 *  Manage CullFace attribute
 *  @class CullFace
 */
var CullFace = function ( mode ) {
    StateAttribute.call( this );
    this.setMode( mode !== undefined ? mode : CullFace.BACK );
};

CullFace.DISABLE = 0x0;
CullFace.FRONT = 0x0404;
CullFace.BACK = 0x0405;
CullFace.FRONT_AND_BACK = 0x0408;

/** @lends CullFace.prototype */
CullFace.prototype = MACROUTILS.objectLibraryClass( MACROUTILS.objectInherit( StateAttribute.prototype, {

    attributeType: 'CullFace',

    cloneType: function () {
        return new CullFace();
    },

    setMode: function ( mode ) {
        var value = mode;
        if ( typeof value === 'string' ) value = CullFace[ value ];
        this._mode = value;
    },

    getMode: function () {
        return this._mode;
    },

    apply: function ( state ) {
        var gl = state.getGraphicContext();
        if ( this._mode === CullFace.DISABLE ) {
            gl.disable( gl.CULL_FACE );
        } else {
            gl.enable( gl.CULL_FACE );
            gl.cullFace( this._mode );
        }

    }
} ), 'osg', 'CullFace' );

module.exports = CullFace;
