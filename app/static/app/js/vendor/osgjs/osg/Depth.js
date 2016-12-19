'use strict';
var MACROUTILS = require( 'osg/Utils' );
var StateAttribute = require( 'osg/StateAttribute' );

var Depth = function ( func, near, far, writeMask ) {
    StateAttribute.call( this );

    this._func = Depth.LESS;
    this._near = 0.0;
    this._far = 1.0;
    this._writeMask = true;

    if ( func !== undefined ) {
        if ( typeof ( func ) === 'string' ) {
            this._func = Depth[ func ];
        } else {
            this._func = func;
        }
    }
    if ( near !== undefined ) {
        this._near = near;
    }
    if ( far !== undefined ) {
        this._far = far;
    }
    if ( writeMask !== undefined ) {
        this._writeMask = writeMask;
    }
};

Depth.DISABLE = 0x0000;
Depth.NEVER = 0x0200;
Depth.LESS = 0x0201;
Depth.EQUAL = 0x0202;
Depth.LEQUAL = 0x0203;
Depth.GREATER = 0x0204;
Depth.NOTEQUAL = 0x0205;
Depth.GEQUAL = 0x0206;
Depth.ALWAYS = 0x0207;

Depth.prototype = MACROUTILS.objectLibraryClass( MACROUTILS.objectInherit( StateAttribute.prototype, {
    attributeType: 'Depth',
    cloneType: function () {
        return new Depth();
    },
    setRange: function ( near, far ) {
        this._near = near;
        this._far = far;
    },
    setWriteMask: function ( mask ) {
        this._writeMask = mask;
    },
    getWriteMask: function () {
        return this._writeMask;
    },
    getFunc: function () {
        return this._func;
    },
    apply: function ( state ) {
        var gl = state.getGraphicContext();
        if ( this._func === 0 ) {
            gl.disable( gl.DEPTH_TEST );
        } else {
            gl.enable( gl.DEPTH_TEST );
            gl.depthFunc( this._func );
            gl.depthMask( this._writeMask );
            gl.depthRange( this._near, this._far );
        }
    }
} ), 'osg', 'Depth' );

module.exports = Depth;
