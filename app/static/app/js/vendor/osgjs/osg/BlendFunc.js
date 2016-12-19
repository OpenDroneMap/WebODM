'use strict';
var MACROUTILS = require( 'osg/Utils' );
var StateAttribute = require( 'osg/StateAttribute' );

/**
 *  Manage Blending mode
 *  @class BlendFunc
 */
var BlendFunc = function ( sourceRGB, destinationRGB, sourceAlpha, destinationAlpha ) {
    StateAttribute.call( this );
    this._sourceFactor = BlendFunc.DISABLE;
    this._destinationFactor = BlendFunc.DISABLE;
    this._sourceFactorAlpha = this._sourceFactor;
    this._destinationFactorAlpha = this._destinationFactor;
    this._separate = false;
    if ( sourceRGB !== undefined ) {
        this.setSource( sourceRGB );
    }
    if ( destinationRGB !== undefined ) {
        this.setDestination( destinationRGB );
    }

    if ( sourceAlpha !== undefined ) {
        this.setSourceAlpha( sourceAlpha );
    }
    if ( destinationAlpha !== undefined ) {
        this.setDestinationAlpha( destinationAlpha );
    }
};

BlendFunc.DISABLE = -1;
BlendFunc.ZERO = 0;
BlendFunc.ONE = 1;
BlendFunc.SRC_COLOR = 0x0300;
BlendFunc.ONE_MINUS_SRC_COLOR = 0x0301;
BlendFunc.SRC_ALPHA = 0x0302;
BlendFunc.ONE_MINUS_SRC_ALPHA = 0x0303;
BlendFunc.DST_ALPHA = 0x0304;
BlendFunc.ONE_MINUS_DST_ALPHA = 0x0305;
BlendFunc.DST_COLOR = 0x0306;
BlendFunc.ONE_MINUS_DST_COLOR = 0x0307;
BlendFunc.SRC_ALPHA_SATURATE = 0x0308;

/* Separate Blend Functions */
BlendFunc.BLEND_DST_RGB = 0x80C8;
BlendFunc.BLEND_SRC_RGB = 0x80C9;
BlendFunc.BLEND_DST_ALPHA = 0x80CA;
BlendFunc.BLEND_SRC_ALPHA = 0x80CB;
BlendFunc.CONSTANT_COLOR = 0x8001;
BlendFunc.ONE_MINUS_CONSTANT_COLOR = 0x8002;
BlendFunc.CONSTANT_ALPHA = 0x8003;
BlendFunc.ONE_MINUS_CONSTANT_ALPHA = 0x8004;
BlendFunc.BLEND_COLOR = 0x8005;


/** @lends BlendFunc.prototype */
BlendFunc.prototype = MACROUTILS.objectLibraryClass( MACROUTILS.objectInherit( StateAttribute.prototype, {
    /**
  StateAttribute type of BlendFunc
  @type String
   */
    attributeType: 'BlendFunc',
    /**
    Create an instance of this StateAttribute
    */
    cloneType: function () /**BlendFunc*/ {
        return new BlendFunc();
    },
    setSource: function ( f ) {
        this.setSourceRGB( f );
        this.setSourceAlpha( f );
    },
    getSource: function () {
        return this._sourceFactor;
    },
    setDestination: function ( f ) {
        this.setDestinationRGB( f );
        this.setDestinationAlpha( f );
    },
    getDestination: function () {
        return this._destinationFactor;
    },
    getSeparate: function () {
        return this._separate;
    },
    checkSeparate: function () {
        return ( this._sourceFactor !== this._sourceFactorAlpha ||
            this._destinationFactor !== this._destinationFactorAlpha );
    },
    setSourceRGB: function ( f ) {
        if ( typeof f === 'string' ) {
            this._sourceFactor = BlendFunc[ f ];
        } else {
            this._sourceFactor = f;
        }
        this._separate = this.checkSeparate();
    },
    getSourceRGB: function () {
        return this._sourceFactor;
    },
    setSourceAlpha: function ( f ) {
        if ( typeof f === 'string' ) {
            this._sourceFactorAlpha = BlendFunc[ f ];
        } else {
            this._sourceFactorAlpha = f;
        }
        this._separate = this.checkSeparate();
    },
    getSourceAlpha: function () {
        return this._sourceFactorAlpha;
    },
    setDestinationRGB: function ( f ) {
        if ( typeof f === 'string' ) {
            this._destinationFactor = BlendFunc[ f ];
        } else {
            this._destinationFactor = f;
        }
        this._separate = this.checkSeparate();
    },
    getDestinationRGB: function () {
        return this._destinationFactor;
    },
    setDestinationAlpha: function ( f ) {
        if ( typeof f === 'string' ) {
            this._destinationFactorAlpha = BlendFunc[ f ];
        } else {
            this._destinationFactorAlpha = f;
        }
        this._separate = this.checkSeparate();
    },
    getDestinationAlpha: function () {
        return this._destinationFactorAlpha;
    },

    /**
      Apply the mode, must be called in the draw traversal
      @param state
  */
    apply: function ( state ) {
        var gl = state.getGraphicContext();
        if ( this._sourceFactor === BlendFunc.DISABLE || this._destinationFactor === BlendFunc.DISABLE ) {
            gl.disable( gl.BLEND );
        } else {
            gl.enable( gl.BLEND );
            if ( this._separate ) {
                gl.blendFuncSeparate( this._sourceFactor, this._destinationFactor,
                    this._sourceFactorAlpha, this._destinationFactorAlpha );
            } else {
                gl.blendFunc( this._sourceFactor, this._destinationFactor );
            }
        }
    }
} ), 'osg', 'BlendFunc' );

module.exports = BlendFunc;
