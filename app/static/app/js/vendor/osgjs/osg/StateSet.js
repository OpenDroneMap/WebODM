'use strict';
var Map = require( 'osg/Map' );
var Notify = require( 'osg/notify' );
var Object = require( 'osg/Object' );
var StateAttribute = require( 'osg/StateAttribute' );
var MACROUTILS = require( 'osg/Utils' );


/** Stores a set of modes and attributes which represent a set of OpenGL state.
 *  Notice that a \c StateSet contains just a subset of the whole OpenGL state.
 * <p>In OSG, each \c Drawable and each \c Node has a reference to a
 * \c StateSet. These <tt>StateSet</tt>s can be shared between
 * different <tt>Drawable</tt>s and <tt>Node</tt>s (that is, several
 * <tt>Drawable</tt>s and <tt>Node</tt>s can reference the same \c StateSet).
 * Indeed, this practice is recommended whenever possible,
 * as this minimizes expensive state changes in the graphics pipeline.
 */
var StateSet = function () {
    Object.call( this );

    this._parents = [];
    this.attributeMap = new Map();

    this.textureAttributeMapList = [];

    this._binName = undefined;
    this._binNumber = 0;

    // put the shader generator name in an AttributePair
    // so that we can use the mask value
    this._shaderGeneratorPair = null;

    this._updateCallbackList = [];

    this.uniforms = new Map();

    this._drawID = -1; // used by the RenderLeaf to decide if it should apply the stateSet
};

StateSet.AttributePair = function ( attr, value ) {
    this._object = attr;
    this._value = value;
};

StateSet.AttributePair.prototype = {
    getShaderGeneratorName: function () {
        return this._object;
    },
    getAttribute: function () {
        return this._object;
    },
    getUniform: function () {
        return this._object;
    },
    getValue: function () {
        return this._value;
    }
};


StateSet.prototype = MACROUTILS.objectLibraryClass( MACROUTILS.objectInherit( Object.prototype, {

    setDrawID: function ( id ) {
        this._drawID = id;
    },

    getDrawID: function () {
        return this._drawID;
    },

    getAttributePair: function ( attribute, value ) {
        return new StateSet.AttributePair( attribute, value );
    },

    addUniform: function ( uniform, originalMode ) {
        var mode = originalMode !== undefined ? originalMode : StateAttribute.ON;
        var name = uniform.getName();
        this.uniforms[ name ] = this.getAttributePair( uniform, mode );
        this.uniforms.dirty();
    },

    addParent: function ( node ) {
        this._parents.push( node );
    },

    removeParent: function ( node ) {
        var idx = this._parents.indexOf( node );
        if ( idx === -1 ) return;
        this._parents.splice( idx, 1 );
    },

    removeUniform: function ( uniform ) {
        this.uniforms.remove( uniform.getName() );
    },

    removeUniformByName: function ( uniformName ) {
        this.uniforms.remove( uniformName );
    },

    getUniform: function ( uniform ) {
        var uniformMap = this.uniforms;
        if ( uniformMap[ uniform ] ) return uniformMap[ uniform ].getAttribute();
        return undefined;
    },

    getUniformList: function () {
        return this.uniforms;
    },

    setTextureAttributeAndModes: function ( unit, attribute, originalMode ) {
        var mode = originalMode !== undefined ? originalMode : StateAttribute.ON;
        this._setTextureAttribute( unit, this.getAttributePair( attribute, mode ) );
    },

    setTextureAttributeAndMode: function ( unit, attribute, mode ) {
        Notify.log( 'StateSet.setTextureAttributeAndMode is deprecated, insteady use setTextureAttributeAndModes' );
        this.setTextureAttributeAndModes( unit, attribute, mode );
    },

    getNumTextureAttributeLists: function () {
        return this.textureAttributeMapList.length;
    },

    getTextureAttribute: function ( unit, attribute ) {
        if ( this.textureAttributeMapList[ unit ] === undefined ) return undefined;

        var textureMap = this.textureAttributeMapList[ unit ];
        if ( textureMap[ attribute ] === undefined ) return undefined;

        return textureMap[ attribute ].getAttribute();
    },

    removeTextureAttribute: function ( unit, attributeName ) {
        if ( this.textureAttributeMapList[ unit ] === undefined ) return;

        var textureAttributeMap = this.textureAttributeMapList[ unit ];
        if ( textureAttributeMap[ attributeName ] === undefined ) return;


        textureAttributeMap.remove( attributeName );
        this.textureAttributeMapList[ unit ].dirty();
    },

    getAttribute: function ( attributeType ) {
        if ( this.attributeMap[ attributeType ] === undefined ) {
            return undefined;
        }
        return this.attributeMap[ attributeType ].getAttribute();
    },

    setAttributeAndModes: function ( attribute, originalMode ) {
        var mode = originalMode !== undefined ? originalMode : StateAttribute.ON;
        this._setAttribute( this.getAttributePair( attribute, mode ) );
    },

    setAttributeAndMode: function ( attribute, mode ) {
        Notify.log( 'StateSet.setAttributeAndMode is deprecated, insteady use setAttributeAndModes' );
        this.setAttributeAndModes( attribute, mode );
    },

    setAttribute: function ( attribute, originalMode ) {
        var mode = originalMode !== undefined ? originalMode : StateAttribute.ON;
        this._setAttribute( this.getAttributePair( attribute, mode ) );
    },

    // TODO: check if it's an attribute type or a attribute to remove it
    removeAttribute: function ( attributeName ) {

        if ( this.attributeMap[ attributeName ] !== undefined ) {
            delete this.attributeMap[ attributeName ];
            this.attributeMap.dirty();
        }
    },

    setRenderingHint: function ( hint ) {
        if ( hint === 'OPAQUE_BIN' ) {
            this.setRenderBinDetails( 0, 'RenderBin' );
        } else if ( hint === 'TRANSPARENT_BIN' ) {
            this.setRenderBinDetails( 10, 'DepthSortedBin' );
        } else {
            this.setRenderBinDetails( 0, '' );
        }
    },

    getUpdateCallbackList: function () {
        return this._updateCallbackList;
    },

    removeUpdateCallback: function ( cb ) {
        var idx = this._updateCallbackList.indexOf( cb );
        if ( idx === -1 ) return;
        this._updateCallbackList.splice( idx, 1 );

        if ( this._updateCallbackList.length === 0 ) {
            var parents = this._parents;
            for ( var i = 0, l = parents.length; i < l; i++ ) {
                var parent = parents[ i ];
                parent.setNumChildrenRequiringUpdateTraversal( parent.getNumChildrenRequiringUpdateTraversal() - 1 );
            }
        }
    },

    requiresUpdateTraversal: function () {
        return !!this._updateCallbackList.length;
    },

    addUpdateCallback: function ( cb ) {

        var dontNoticeParents = Boolean( this._updateCallbackList.length );
        this._updateCallbackList.push( cb );

        // parent alreay know we have update callback
        if ( dontNoticeParents ) return;

        var parents = this._parents;
        for ( var i = 0, l = parents.length; i < l; i++ ) {
            var parent = parents[ i ];
            parent.setNumChildrenRequiringUpdateTraversal( parent.getNumChildrenRequiringUpdateTraversal() + 1 );
        }
    },

    hasUpdateCallback: function ( cb ) {
        return this._updateCallbackList.indexOf( cb ) !== -1;
    },

    setRenderBinDetails: function ( num, binName ) {
        this._binNumber = num;
        this._binName = binName;
    },
    getAttributeMap: function () {
        return this.attributeMap;
    },
    getBinNumber: function () {
        return this._binNumber;
    },
    getBinName: function () {
        return this._binName;
    },
    setBinNumber: function ( binNum ) {
        this._binNumber = binNum;
    },
    setBinName: function ( binName ) {
        this._binName = binName;
    },
    getAttributeList: function () {
        var attributeMap = this.attributeMap;
        var attributeMapKeys = attributeMap.getKeys();

        var l = attributeMapKeys.length;
        var list = [];
        for ( var i = 0; i < l; i++ ) {
            list.push( attributeMap[ attributeMapKeys[ i ] ] );
        }
        return list;
    },
    setShaderGeneratorName: function ( generatorName, mask ) {
        this._shaderGeneratorPair = this.getAttributePair( generatorName, mask );
    },
    getShaderGeneratorPair: function () {
        return this._shaderGeneratorPair;
    },
    getShaderGeneratorName: function () {
        return this._shaderGeneratorPair ? this._shaderGeneratorPair.getShaderGeneratorName() : undefined;
    },
    releaseGLObjects: function () {
        for ( var i = 0, j = this.textureAttributeMapList.length; i < j; i++ ) {
            this.getTextureAttribute( i, 'Texture' ).releaseGLObjects();
        }
        var list = this.getAttributeList();
        for ( i = 0, j = list.length; i < j; i++ ) {
            // Remove only if we have releaseGLObject method.
            if ( list[ i ]._object.releaseGLObjects ) {
                list[ i ]._object.releaseGLObjects();
            }
        }
    },
    _getUniformMap: function () {
        return this.uniforms;
    },

    // for internal use, you should not call it directly
    _setTextureAttribute: function ( unit, attributePair ) {

        if ( this.textureAttributeMapList[ unit ] === undefined ) {
            this.textureAttributeMapList[ unit ] = new Map();
        }

        var name = attributePair.getAttribute().getTypeMember();
        var textureUnitAttributeMap = this.textureAttributeMapList[ unit ];

        textureUnitAttributeMap[ name ] = attributePair;
        textureUnitAttributeMap.dirty();

    },

    // for internal use, you should not call it directly
    _setAttribute: function ( attributePair ) {

        var name = attributePair.getAttribute().getTypeMember();
        this.attributeMap[ name ] = attributePair;
        this.attributeMap.dirty();

    }

} ), 'osg', 'StateSet' );

module.exports = StateSet;
