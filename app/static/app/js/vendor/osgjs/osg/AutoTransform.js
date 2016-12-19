'use strict';

var MACROUTILS = require( 'osg/Utils' );
var Transform = require( 'osg/Transform' );
var vec3 = require( 'osg/glMatrix' ).vec3;
var vec4 = require( 'osg/glMatrix' ).vec4;
var quat = require( 'osg/glMatrix' ).quat;
var mat4 = require( 'osg/glMatrix' ).mat4;
var NodeVisitor = require( 'osg/NodeVisitor' );
var TransformEnums = require( 'osg/transformEnums' );
var Node = require( 'osg/Node' );

/** AutoTransform is a derived form of Transform that automatically
 * scales or rotates to keep its children aligned with screen coordinates.
 * W.r.t. AutorotateModes only rotate to screen is supported right now.
 * More AutorotateModes modes should be addressed in the future.
 * @class AutoTransform
 */

var AutoTransform = function () {
    Transform.call( this );
    this._matrix = mat4.create();
    this._position = vec3.create();
    this._matrixDirty = true;
    this._scale = vec3.fromValues( 1.0, 1.0, 1.0 );
    this._minimumScale = 0;
    this._maximumScale = Number.MAX_VALUE;
    this._rotation = quat.create();
    this._pivotPoint = vec3.create();
    this._autoScaleToScreen = false;
    this._autoRotateToScreen = false;
    this._cachedMatrix = mat4.create();
    this._firstTimeToInitEyePoint = true;
    this._autoScaleTransitionWidthRatio = 0.25;
    this._billboardAttribute = undefined;
    this._previousWidth = 0.0;
    this._previousHeight = 0.0;
    this._previousProjection = mat4.create();
    this._previousModelView = mat4.create();
    this._previousPosition = vec3.create();
};

/** @lends Autotransform.prototype */
AutoTransform.prototype = MACROUTILS.objectLibraryClass( MACROUTILS.objectInherit( Transform.prototype, {

    getMatrix: function () {
        return this._matrix;
    },

    setMatrix: function ( m ) {
        this._matrix = m;
        this.dirtyBound();
    },

    setPosition: function ( pos ) {
        this._position = pos;
        this._matrixDirty = true;
        this.dirtyBound();
    },
    getPosition: function () {
        return this._position;
    },

    setRotation: function ( q ) {
        this._rotation = q;
        this._matrixDirty = true;
        this.dirtyBound();
    },

    getRotation: function () {
        return this._rotation;
    },

    setScale: function ( scale ) {
        this.setScaleFromvec3( vec3.fromValues( scale, scale, scale ) );
    },

    setScaleFromvec3: function ( scaleVec ) {
        this._scale = scaleVec;
        this._matrixDirty = true;
        this.dirtyBound();
    },

    getScale: function () {
        return this._scale;
    },

    setMinimumScale: function ( minimumScale ) {
        this._minimumScale = minimumScale;
    },

    getMinimumScale: function () {
        return this._minimumScale;
    },

    setMaximumScale: function ( maximumScale ) {
        this._maximumScale = maximumScale;
    },

    getMaximumScale: function () {
        return this._maximumScale;
    },

    setAutoScaleToScreen: function ( autoScaleToScreen ) {
        this._autoScaleToScreen = autoScaleToScreen;
        this._matrixDirty = true;
    },

    getAutoScaleToScreen: function () {
        return this._autoScaleToScreen;
    },

    setAutoRotateToScreen: function ( value ) {
        this._autoRotateToScreen = value;
    },

    getAutoRotateToScreen: function () {
        return this._autoRotateToScreen;
    },

    setAutoScaleTransitionWidthRatio: function ( autoScaleTransitionWidthRatio ) {
        this._autoScaleTransitionWidthRatio = autoScaleTransitionWidthRatio;
    },

    getAutoScaleTransitionWidthRatio: function () {
        return this._autoScaleTransitionWidthRatio;
    },

    // local to "local world" (not Global World)
    computeLocalToWorldMatrix: function ( matrix /*, nodeVisitor */ ) {
        if ( this._matrixDirty ) this.computeMatrix();
        if ( this.referenceFrame === TransformEnums.RELATIVE_RF ) {
            mat4.mul( matrix, matrix, this._matrix );
        } else {
            mat4.copy( matrix, this._matrix );
        }
    },

    computeMatrix: ( function () {
        var neg = vec3.create();
        var tmpMat = mat4.create();
        return function () {
            if ( !this._matrixDirty ) return;
            mat4.fromQuat( this._matrix, this._rotation );

            mat4.fromTranslation( tmpMat, this._position );
            mat4.mul( this._matrix, tmpMat, this._matrix );
            mat4.scale( this._matrix, this._matrix, this._scale );
            mat4.translate( this._matrix, this._matrix, vec3.neg( neg, this._pivotPoint ) );
            this._matrixDirty = false;
        };

    } )(),

    computeWorldToLocalMatrix: ( function () {
        var neg = vec3.create();
        var rotInverse = quat.create();
        var scaleInverse = vec3.create();
        var tmpMat = mat4.create();

        return function ( matrix /*, nodeVisitor */ ) {
            if ( this.scale[ 0 ] === 0.0 && this.scale[ 1 ] === 0.0 && this.scale[ 2 ] === 0.0 ) {
                return false;
            }
            scaleInverse[ 0 ] = 1.0 / this._scale[ 0 ];
            scaleInverse[ 1 ] = 1.0 / this._scale[ 1 ];
            scaleInverse[ 2 ] = 1.0 / this._scale[ 2 ];
            if ( this.referenceFrame === TransformEnums.RELATIVE_RF ) {

                mat4.fromTranslation( tmpMat, vec3.neg( neg, this._position ) );
                mat4.mul( matrix, tmpMat, matrix );

                if ( !quat.zeroRotation( this._rotation ) ) {
                    mat4.fromQuat( tmpMat, quat.invert( rotInverse, this._rotation ) );
                    mat4.mul( matrix, tmpMat, matrix );
                }
                mat4.fromScaling( tmpMat, scaleInverse );
                mat4.mul( matrix, tmpMat, matrix );

                mat4.fromTranslation( tmpMat, this._pivotPoint );
                mat4.mul( matrix, tmpMat, matrix );

            } else { // absolute
                mat4.fromQuat( this._matrix, quat.invert( rotInverse, this._rotation ) );
                mat4.translate( matrix, matrix, vec3.neg( neg, this._position ) );

                mat4.fromScaling( tmpMat, scaleInverse );
                mat4.mul( matrix, tmpMat, matrix );

                mat4.fromTranslation( tmpMat, this._pivotPoint );
                mat4.mul( matrix, tmpMat, matrix );

            }
            return true;
        };
    } )(),

    computeBound: ( function () {
        var matrix = mat4.create();
        return function ( bSphere ) {
            if ( this._autoScaleToScreen && this._firstTimeToInitEyePoint )
                return bSphere;
            Node.prototype.computeBound.call( this, bSphere );
            if ( !bSphere.valid() ) {
                return bSphere;
            }
            mat4.identity( matrix );
            // local to local world (not Global World)
            this.computeLocalToWorldMatrix( matrix );
            //Matrix.transformBoundingSphere( matrix, bSphere, bSphere );
            bSphere.transformMat4( bSphere, matrix );
            return bSphere;
        };
    } )(),

    accept: ( function () {

        return function ( visitor ) {
            if ( visitor.getVisitorType() === NodeVisitor.CULL_VISITOR ) {

                var width = visitor.getViewport().width();
                var height = visitor.getViewport().height();
                var projMat = visitor.getCurrentProjectionMatrix();
                var modelViewMat = visitor.getCurrentModelViewMatrix();
                var position = this._position;
                var doUpdate = this._firstTimeToInitEyePoint;
                if ( !this._firstTimeToInitEyePoint ) {
                    if ( width !== this._previousWidth || height !== this._previousHeight ) {
                        doUpdate = true;
                    } else if ( !mat4.exactEquals( projMat, this._previousProjection ) ) {
                        doUpdate = true;
                    } else if ( !mat4.exactEquals( modelViewMat, this._previousModelView ) ) {
                        doUpdate = true;
                    } else if ( !vec3.exactEquals( position, this._previousPosition ) ) {
                        doUpdate = true;
                    }
                }
                this._firstTimeToInitEyePoint = false;
                if ( doUpdate ) {
                    if ( this._autoScaleToScreen ) {
                        var viewport = visitor.getViewport();
                        var psvector = this.computePixelSizeVector( viewport, projMat, modelViewMat );
                        var v = vec4.fromValues( this._position[ 0 ], this._position[ 1 ], this._position[ 2 ], 1.0 );
                        var pixelSize = vec4.dot( v, psvector );
                        pixelSize = 0.48 / pixelSize;
                        var size = 1.0 / pixelSize;
                        if ( this._autoScaleTransitionWidthRatio > 0.0 ) {
                            var c, b, a;
                            if ( this._minimumScale > 0.0 ) {
                                var j = this._minimumScale;
                                var i = ( this._maximumScale < Number.MAX_VALUE ) ?
                                    this._minimumScale + ( this._maximumScale - this._minimumScale ) * this._autoScaleTransitionWidthRatio :
                                    this._minimumScale * ( 1.0 + this._autoScaleTransitionWidthRatio );
                                c = 1.0 / ( 4.0 * ( i - j ) );
                                b = 1.0 - 2.0 * c * i;
                                a = j + b * b / ( 4.0 * c );
                                var k = -b / ( 2.0 * c );
                                if ( size < k ) size = this._minimumScale;
                                else if ( size < i ) size = a + b * size + c * ( size * size );
                            }
                            if ( this._maximumScale < Number.MAX_VALUE ) {
                                var n = this._maximumScale;
                                var m = ( this._minimumScale > 0.0 ) ?
                                    this._maximumScale + ( this._minimumScale - this._maximumScale ) * this._autoScaleTransitionWidthRatio :
                                    this._maximumScale * ( 1.0 - this._autoScaleTransitionWidthRatio );
                                c = 1.0 / ( 4.0 * ( m - n ) );
                                b = 1.0 - 2.0 * c * m;
                                a = n + b * b / ( 4.0 * c );
                                var p = -b / ( 2.0 * c );

                                if ( size > p ) size = this._maximumScale;
                                else if ( size > m ) size = a + b * size + c * ( size * size );
                            }
                        }
                        this.setScale( size );
                    }
                    if ( this._autoRotateToScreen ) {
                        var rotation = quat.create();
                        mat4.getRotation( rotation, modelViewMat );
                        this.setRotation( quat.invert( rotation, rotation ) );
                    }
                    this._previousWidth = width;
                    this._previousHeight = height;
                    vec3.copy( this._previousPosition, position );
                    mat4.copy( this._previousProjection, projMat );
                    mat4.copy( this._previousModelView, modelViewMat );
                }
            }

            Node.prototype.accept.call( this, visitor );
        };
    } )(),

    computePixelSizeVector: ( function () {
        var scale00 = vec3.create();
        var scale10 = vec3.create();
        return function ( W, P, M ) {
            // Where W = viewport, P = ProjectionMatrix, M = ModelViewMatrix
            // Comment from OSG:
            // pre adjust P00,P20,P23,P33 by multiplying them by the viewport window matrix.
            // here we do it in short hand with the knowledge of how the window matrix is formed
            // note P23,P33 are multiplied by an implicit 1 which would come from the window matrix.

            // scaling for horizontal pixels
            var P00 = P[ 0 ] * W.width() * 0.5;
            var P20_00 = P[ 8 ] * W.width() * 0.5 + P[ 11 ] * W.width() * 0.5;
            vec3.set( scale00, M[ 0 ] * P00 + M[ 2 ] * P20_00,
                M[ 4 ] * P00 + M[ 6 ] * P20_00,
                M[ 8 ] * P00 + M[ 10 ] * P20_00 );

            // scaling for vertical pixels
            var P10 = P[ 5 ] * W.height() * 0.5;
            var P20_10 = P[ 9 ] * W.height() * 0.5 + P[ 11 ] * W.height() * 0.5;
            vec3.set( scale10, M[ 1 ] * P10 + M[ 2 ] * P20_10,
                M[ 5 ] * P10 + M[ 6 ] * P20_10,
                M[ 9 ] * P10 + M[ 10 ] * P20_10 );

            var P23 = P[ 11 ];
            var P33 = P[ 15 ];
            var pixelSizeVector = vec4.fromValues( M[ 2 ] * P23, M[ 6 ] * P23, M[ 10 ] * P23, M[ 14 ] * P23 + M[ 15 ] * P33 );

            var scaleRatio = 0.7071067811 / Math.sqrt( vec3.sqrLen( scale00 ) + vec3.sqrLen( scale10 ) );
            vec4.scale( pixelSizeVector, pixelSizeVector, scaleRatio );
            return pixelSizeVector;
        };
    } )()


} ), 'osg', 'AutoTransform' );
MACROUTILS.setTypeID( AutoTransform );

module.exports = AutoTransform;
