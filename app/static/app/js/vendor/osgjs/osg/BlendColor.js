'use strict';
var MACROUTILS = require( 'osg/Utils' );
var StateAttribute = require( 'osg/StateAttribute' );
var vec4 = require( 'osg/glMatrix' ).vec4;

/**
 *  Manage BlendColor attribute
 *  @class
 *  @memberOf osg
 *  @extends StateAttribute
 */
var BlendColor = function ( color ) {
    StateAttribute.call( this );
    this._constantColor = vec4.create();
    vec4.set( this._constantColor, 1.0, 1.0, 1.0, 1.0 );
    if ( color !== undefined ) {
        this.setConstantColor( color );
    }
};

/**
 * @lends BlendColor.prototype
 */
BlendColor.prototype = MACROUTILS.objectLibraryClass( MACROUTILS.objectInherit( StateAttribute.prototype, {
    attributeType: 'BlendColor',
    cloneType: function () {
        return new BlendColor();
    },

    /**
     *
     * @param {} color
     */
    setConstantColor: function ( color ) {
        vec4.copy( this._constantColor, color );
    },
    getConstantColor: function () {
        return this._constantColor;
    },
    apply: function ( state ) {
        var gl = state.getGraphicContext();
        gl.blendColor( this._constantColor[ 0 ],
            this._constantColor[ 1 ],
            this._constantColor[ 2 ],
            this._constantColor[ 3 ] );
    }
} ), 'osg', 'BlendColor' );

module.exports = BlendColor;
