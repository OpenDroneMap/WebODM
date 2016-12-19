'use strict';
var MACROUTILS = require( 'osg/Utils' );
var StateAttribute = require( 'osg/StateAttribute' );

var LineWidth = function ( lineWidth ) {
    StateAttribute.call( this );
    this.lineWidth = 1.0;
    if ( lineWidth !== undefined ) {
        this.lineWidth = lineWidth;
    }
};
LineWidth.prototype = MACROUTILS.objectLibraryClass( MACROUTILS.objectInherit( StateAttribute.prototype, {
    attributeType: 'LineWidth',
    cloneType: function () {
        return new LineWidth();
    },
    apply: function ( state ) {
        state.getGraphicContext().lineWidth( this.lineWidth );
    }
} ), 'osg', 'LineWidth' );

module.exports = LineWidth;
