'use strict';
var MACROUTILS = require( 'osg/Utils' );
var StateAttribute = require( 'osg/StateAttribute' );


var ColorMask = function ( red, green, blue, alpha ) {

    StateAttribute.call( this );

    this._colorMask = [ true, true, true, true ];
    this.setMask( red, green, blue, alpha );
};

ColorMask.prototype = MACROUTILS.objectLibraryClass( MACROUTILS.objectInherit( StateAttribute.prototype, {

    attributeType: 'ColorMask',

    cloneType: function () {
        return new ColorMask();
    },

    setMask: function ( red, green, blue, alpha ) {

        if ( red !== undefined &&
            green !== undefined &&
            blue !== undefined &&
            alpha !== undefined ) {

            this._colorMask[ 0 ] = red;
            this._colorMask[ 1 ] = green;
            this._colorMask[ 2 ] = blue;
            this._colorMask[ 3 ] = alpha;
        }
    },

    apply: function ( state ) {
        var gl = state.getGraphicContext();
        var colorMask = this._colorMask;
        gl.colorMask( colorMask[ 0 ], colorMask[ 1 ], colorMask[ 2 ], colorMask[ 3 ] );
    }

} ), 'osg', 'ColorMask' );

module.exports = ColorMask;
