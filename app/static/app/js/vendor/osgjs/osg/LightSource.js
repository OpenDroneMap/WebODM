'use strict';
var MACROUTILS = require( 'osg/Utils' );
var Node = require( 'osg/Node' );
var TransformEnums = require( 'osg/transformEnums' );
var vec3 = require( 'osg/glMatrix' ).vec3;

/**
 *  LightSource is a positioned node to use with StateAttribute Light
 *  @class LightSource
 */
var LightSource = function () {
    Node.call( this );
    this._light = undefined;
    this._referenceFrame = TransformEnums.RELATIVE_RF;
};

/** @lends LightSource.prototype */
LightSource.prototype = MACROUTILS.objectLibraryClass( MACROUTILS.objectInherit( Node.prototype, {
    getLight: function () {
        return this._light;
    },
    setLight: function ( light ) {
        this._light = light;
    },
    setReferenceFrame: function ( value ) {
        this._referenceFrame = value;
    },
    getReferenceFrame: function () {
        return this._referenceFrame;
    },
    computeBoundingSphere: ( function () {
        var tmp = vec3.create();

        return function ( bsphere ) {
            Node.prototype.computeBoundingSphere.call( this, bsphere );

            if ( this._light !== undefined && this._referenceFrame === TransformEnums.RELATIVE_RF ) {
                var position = this._light.getPosition();

                if ( position[ 3 ] !== 0.0 ) {
                    bsphere.expandByvec3( vec3.scale( tmp, position, 1.0 / position[ 3 ] ) );
                }
            }

            return bsphere;
        };
    } )()

} ), 'osg', 'LightSource' );

MACROUTILS.setTypeID( LightSource );

module.exports = LightSource;
