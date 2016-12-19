'use strict';
var Node = require( 'osg/Node' );
var MatrixTransform = require( 'osg/MatrixTransform' );
var Notify = require( 'osg/notify' );
var Depth = require( 'osg/Depth' );
var BlendFunc = require( 'osg/BlendFunc' );
var CullFace = require( 'osg/CullFace' );
var Uniform = require( 'osg/Uniform' );
var vec2 = require( 'osg/glMatrix' ).vec2;
var vec3 = require( 'osg/glMatrix' ).vec3;
var vec4 = require( 'osg/glMatrix' ).vec4;
var mat4 = require( 'osg/glMatrix' ).mat4;
var quat = require( 'osg/glMatrix' ).quat;
var IntersectionVisitor = require( 'osgUtil/IntersectionVisitor' );
var LineSegmentIntersector = require( 'osgUtil/LineSegmentIntersector' );
var GizmoGeometry = require( 'osgUtil/gizmoGeometry' );
var TransformEnums = require( 'osg/transformEnums' );
var MACROUTILS = require( 'osg/Utils' );


var getCanvasCoord = function ( vec, e ) {
    vec[ 0 ] = e.offsetX === undefined ? e.layerX : e.offsetX;
    vec[ 1 ] = e.offsetY === undefined ? e.layerY : e.offsetY;
};

var HideCullCallback = function () {};
HideCullCallback.prototype = {
    cull: function () {
        return false;
    }
};

var blendAttribute = new BlendFunc( BlendFunc.SRC_ALPHA, BlendFunc.ONE_MINUS_SRC_ALPHA );

var LineCustomIntersector = function ( testPlane ) {
    this._testPlane = testPlane; // intersection plane or line
    this._inter = vec3.create(); // translate distance
    LineSegmentIntersector.call( this );
};
LineCustomIntersector.prototype = MACROUTILS.objectInherit( LineSegmentIntersector.prototype, {
    setTestPlane: function ( testPlane ) {
        this._testPlane = testPlane; // intersection plane or line
    },
    getTranslateDistance: function () {
        return this._inter;
    },
    enter: ( function () {
        var axis = vec3.create();
        var dir = vec3.create();

        return function ( node ) {
            if ( node._nbAxis === undefined )
                return true;

            vec3.init( axis );
            axis[ node._nbAxis ] = 1.0;
            if ( !this._testPlane ) {
                // intersection line line
                vec3.normalize( dir, vec3.sub( dir, this._iEnd, this._iStart ) );

                var a01 = -vec3.dot( dir, axis );
                var b0 = vec3.dot( this._iStart, dir );
                var det = Math.abs( 1.0 - a01 * a01 );

                var b1 = -vec3.dot( this._iStart, axis );
                vec3.init( this._inter );
                this._inter[ node._nbAxis ] = ( a01 * b0 - b1 ) / det;
            } else {
                // intersection line plane
                var dist1 = vec3.dot( this._iStart, axis );
                var dist2 = vec3.dot( this._iEnd, axis );
                // ray copplanar to triangle
                if ( dist1 === dist2 )
                    return false;
                // intersection between ray and triangle
                var val = -dist1 / ( dist2 - dist1 );
                this._inter[ 0 ] = this._iStart[ 0 ] + ( this._iEnd[ 0 ] - this._iStart[ 0 ] ) * val;
                this._inter[ 1 ] = this._iStart[ 1 ] + ( this._iEnd[ 1 ] - this._iStart[ 1 ] ) * val;
                this._inter[ 2 ] = this._iStart[ 2 ] + ( this._iEnd[ 2 ] - this._iStart[ 2 ] ) * val;
            }
            return false;
        };
    } )(),
    intersect: function () {
        return false;
    }
} );

// The MT node can be detected as such because they
// have a '_nbAxis' property on them (x=0, y=1, z=2)
//
// MatrixTransform _________________________________________
//           |                    |                         |
//    ____ Rotate             Translate               TranslatePlane
//   |     / | \                / | \                     / | \
//   MT   MT MT MT             MT MT MT                  MT MT MT
//   |     \ | /                \ | /                     \ | /
// FullArc  \|/                  \|/                       \|/
//       ____|_____            ___|________              ___|________
//      |          |          |            |            |            |
//   DrawArc   HideNode   DrawArrow    HideNode     DrawPlane    HideNode
//                 |                       |                         |
//              PickArc                PickArrow                  PickPlane
//
var NodeGizmo = function ( viewer ) {
    MatrixTransform.call( this );

    this._tmask = 1; // traversal mask when picking the scene

    // We can set this boolean to true if we want to insert a MatrixTransform just
    // before the picked geometry.
    // Otherwise, we simply select the first MatrixTransform with an 'editMask' property
    this._autoInsertMT = false;

    this._viewer = viewer;
    this._canvas = viewer.getGraphicContext().canvas;
    this._manipulator = viewer.getManipulator();

    this._rotateNode = new MatrixTransform();
    this._translateNode = new MatrixTransform();
    this._planeNode = new MatrixTransform();

    this._rotateInLocal = true; // local vs world space
    this._translateInLocal = true; // local vs world space
    this._showAngle = new MatrixTransform();

    //for realtime picking
    this._downCanvasCoord = vec2.create();
    this._hoverNode = null; // the hovered x/y/z MT node
    this._keepHoverColor = vec4.create();

    // for editing
    this._isEditing = false;

    this._editLineOrigin = vec3.create();
    this._editLineDirection = vec3.create();
    this._editOffset = vec3.create();

    // cached matrices when starting the editing operations
    this._editLocal = mat4.create();
    this._editWorldTrans = mat4.create();
    this._editWorldScaleRot = mat4.create();
    this._editInvWorldScaleRot = mat4.create();

    // red line, it can be useful as helpers too
    this._debugNode = new Node();

    this._lastDistToEye = 0.0; // see updateGizmo comment

    this._attachedNode = null;
    this.attachToGeometry( null );

    // Intersectors
    this._lsi = new LineCustomIntersector();
    this._origIntersect = vec3.create();
    this._dstIntersect = vec3.create();
    this._iv = new IntersectionVisitor();
    this._iv.setIntersector( this._lsi );

    this.init();
};

// picking masks
NodeGizmo.NO_PICK = 1 << 0;

NodeGizmo.PICK_ARC_X = 1 << 1;
NodeGizmo.PICK_ARC_Y = 1 << 2;
NodeGizmo.PICK_ARC_Z = 1 << 3;

NodeGizmo.PICK_ARROW_X = 1 << 4;
NodeGizmo.PICK_ARROW_Y = 1 << 5;
NodeGizmo.PICK_ARROW_Z = 1 << 6;

NodeGizmo.PICK_PLANE_X = 1 << 7;
NodeGizmo.PICK_PLANE_Y = 1 << 8;
NodeGizmo.PICK_PLANE_Z = 1 << 9;

NodeGizmo.NO_FULL_CIRCLE = 1 << 10; // don't display the full non pickable circle (visual cue)

NodeGizmo.PICK_ARC = NodeGizmo.PICK_ARC_X | NodeGizmo.PICK_ARC_Y | NodeGizmo.PICK_ARC_Z;
NodeGizmo.PICK_ARROW = NodeGizmo.PICK_ARROW_X | NodeGizmo.PICK_ARROW_Y | NodeGizmo.PICK_ARROW_Z;
NodeGizmo.PICK_PLANE = NodeGizmo.PICK_PLANE_X | NodeGizmo.PICK_PLANE_Y | NodeGizmo.PICK_PLANE_Z;

NodeGizmo.PICK_GIZMO = NodeGizmo.PICK_ARC | NodeGizmo.PICK_ARROW | NodeGizmo.PICK_PLANE;

NodeGizmo.prototype = MACROUTILS.objectInherit( MatrixTransform.prototype, {

    setRotateInLocal: function ( bool ) {
        this._rotateInLocal = bool;
    },

    setTranslateInLocal: function ( bool ) {
        this._translateInLocal = bool;
    },

    setTraversalMask: function ( tmask ) {
        this._tmask = tmask;
    },

    init: function () {
        this.getOrCreateStateSet().setAttributeAndModes( new Depth( Depth.DISABLE ) );
        this.getOrCreateStateSet().setAttributeAndModes( new CullFace( CullFace.DISABLE ) );

        var UpdateCallback = function () {};
        UpdateCallback.prototype = {
            update: this.updateGizmo.bind( this )
        };
        this.addUpdateCallback( new UpdateCallback() );
        this.addChild( this.initNodeTranslate() );
        this.addChild( this.initNodeTranslatePlane() );
        this.addChild( this.initNodeRotate() );
        if ( this._debugNode ) {
            this._debugNode.addChild( GizmoGeometry.createDebugLineGeometry() );
            this.addChild( this._debugNode );
            this._debugNode.setNodeMask( 0x0 );
        }

        var canvas = this._canvas;
        canvas.addEventListener( 'mousemove', this.onMouseMove.bind( this ) );
        canvas.addEventListener( 'mousedown', this.onMouseDown.bind( this ) );
        canvas.addEventListener( 'mouseup', this.onMouseUp.bind( this ) );
        canvas.addEventListener( 'mouseout', this.onMouseUp.bind( this ) );
    },

    attachToNodePath: function ( nodepath ) {
        var node;
        if ( nodepath ) {
            for ( var i = nodepath.length - 1; i >= 0; --i ) {
                var editMask = nodepath[ i ].editMask || 0;
                if ( editMask & NodeGizmo.PICK_GIZMO ) {
                    node = nodepath[ i ];
                    break;
                }
            }
        }
        if ( !node ) {
            this._attachedNode = null;
            this.setNodeMask( 0x0 );
            return;
        }

        this._attachedNode = node;
        this.updateGizmoMask();
    },

    attachToMatrixTransform: function ( node ) {
        if ( !node ) {
            this._attachedNode = null;
            this.setNodeMask( 0x0 );
            return;
        }
        if ( node.editMask === undefined )
            node.editMask = NodeGizmo.PICK_GIZMO;

        this._attachedNode = node;
        this.updateGizmoMask();
    },

    attachToGeometry: function ( argNode ) {

        var node = argNode;

        if ( !node ) {
            this._attachedNode = null;
            this.setNodeMask( 0x0 );
            return;
        }

        // insert MatrixTransform node before geometry node
        var pr = node.getParents();
        if ( pr[ 0 ].editMask === undefined ) {
            var imt = new MatrixTransform();
            while ( pr.length > 0 ) {
                pr[ 0 ].addChild( imt );
                pr[ 0 ].removeChild( node );
            }
            imt.addChild( node );
            imt.editMask = NodeGizmo.PICK_GIZMO;
            node = imt;
        } else {
            node = pr[ 0 ];
        }

        this._attachedNode = node;
        this.updateGizmoMask();
    },

    updateGizmoMask: function () {
        if ( !this._attachedNode ) {
            this.setNodeMask( 0x0 );
            return;
        }

        var mask = this._attachedNode.editMask;

        this.setNodeMask( mask & NodeGizmo.PICK_GIZMO ? NodeGizmo.NO_PICK : 0x0 );

        this._translateNode.setNodeMask( mask & NodeGizmo.PICK_ARROW ? NodeGizmo.PICK_ARROW : 0x0 );
        this._rotateNode.setNodeMask( mask & NodeGizmo.PICK_ARC ? NodeGizmo.PICK_ARC : 0x0 );
        this._planeNode.setNodeMask( mask & NodeGizmo.PICK_PLANE ? NodeGizmo.PICK_PLANE : 0x0 );

        var transChildren = this._translateNode.getChildren();
        transChildren[ 0 ].setNodeMask( mask & NodeGizmo.PICK_ARROW_X ? NodeGizmo.PICK_ARROW_X : 0x0 );
        transChildren[ 1 ].setNodeMask( mask & NodeGizmo.PICK_ARROW_Y ? NodeGizmo.PICK_ARROW_Y : 0x0 );
        transChildren[ 2 ].setNodeMask( mask & NodeGizmo.PICK_ARROW_Z ? NodeGizmo.PICK_ARROW_Z : 0x0 );

        // children 0 is full arc
        var rotChildren = this._rotateNode.getChildren();
        rotChildren[ 0 ].setNodeMask( mask & NodeGizmo.NO_FULL_CIRCLE ? 0x0 : NodeGizmo.NO_PICK );
        rotChildren[ 1 ].setNodeMask( mask & NodeGizmo.PICK_ARC_X ? NodeGizmo.PICK_ARC_X : 0x0 );
        rotChildren[ 2 ].setNodeMask( mask & NodeGizmo.PICK_ARC_Y ? NodeGizmo.PICK_ARC_Y : 0x0 );
        rotChildren[ 3 ].setNodeMask( mask & NodeGizmo.PICK_ARC_Z ? NodeGizmo.PICK_ARC_Z : 0x0 );

        var planeChildren = this._planeNode.getChildren();
        planeChildren[ 0 ].setNodeMask( mask & NodeGizmo.PICK_PLANE_X ? NodeGizmo.PICK_PLANE_X : 0x0 );
        planeChildren[ 1 ].setNodeMask( mask & NodeGizmo.PICK_PLANE_Y ? NodeGizmo.PICK_PLANE_Y : 0x0 );
        planeChildren[ 2 ].setNodeMask( mask & NodeGizmo.PICK_PLANE_Z ? NodeGizmo.PICK_PLANE_Z : 0x0 );
    },

    onNodeHovered: ( function () {
        var hoverColor = vec4.fromValues( 1.0, 1.0, 0.0, 1.0 );

        return function ( hit ) {

            if ( this._hoverNode )
                this._hoverNode.getStateSet().getUniform( 'uColor' ).setFloat4( this._keepHoverColor );
            if ( !hit ) {
                this._hoverNode = null;
                return;
            }

            // stop at the first X/Y/Z matrix node
            var np = hit.nodepath;
            var i = np.length - 1;
            var node = np[ i ];
            while ( node._nbAxis === undefined ) {
                if ( i === 0 )
                    return;
                node = np[ --i ];
            }

            var unif = node.getStateSet().getUniform( 'uColor' );
            this._hoverNode = node;
            vec4.copy( this._keepHoverColor, unif.getInternalArray() );
            unif.setFloat4( hoverColor );
        };
    } )(),

    initNodeRotate: function () {
        var drawArcXYZ = GizmoGeometry.createTorusGeometry( 1.0, 0.01, 6, 64, Math.PI * 2 );
        var drawArc = GizmoGeometry.createTorusGeometry( 1.0, 0.01, 6, 64, Math.PI );
        var pickArc = GizmoGeometry.createTorusGeometry( 1.0, 0.1, 6, 64, Math.PI );

        var mtXYZ = new MatrixTransform();
        var mtX = new MatrixTransform();
        var mtY = new MatrixTransform();
        var mtZ = new MatrixTransform();
        mtX._nbAxis = 0;
        mtY._nbAxis = 1;
        mtZ._nbAxis = 2;

        var hideNode = new Node();
        hideNode.setCullCallback( new HideCullCallback() );
        hideNode.addChild( pickArc );

        // set masks
        drawArcXYZ.setNodeMask( NodeGizmo.NO_PICK );
        drawArc.setNodeMask( NodeGizmo.NO_PICK );
        mtX.setNodeMask( NodeGizmo.PICK_ARC_X );
        mtY.setNodeMask( NodeGizmo.PICK_ARC_Y );
        mtZ.setNodeMask( NodeGizmo.PICK_ARC_Z );

        mtXYZ.addChild( drawArcXYZ );
        mtX.addChild( drawArc );
        mtY.addChild( drawArc );
        mtZ.addChild( drawArc );

        mtX.addChild( hideNode );
        mtY.addChild( hideNode );
        mtZ.addChild( hideNode );

        mtXYZ.getOrCreateStateSet().addUniform( Uniform.createFloat4( vec4.fromValues( 0.2, 0.2, 0.2, 1.0 ), 'uColor' ) );
        mtX.getOrCreateStateSet().addUniform( Uniform.createFloat4( vec4.fromValues( 1.0, 0.0, 0.0, 1.0 ), 'uColor' ) );
        mtY.getOrCreateStateSet().addUniform( Uniform.createFloat4( vec4.fromValues( 0.0, 1.0, 0.0, 1.0 ), 'uColor' ) );
        mtZ.getOrCreateStateSet().addUniform( Uniform.createFloat4( vec4.fromValues( 0.0, 0.0, 1.0, 1.0 ), 'uColor' ) );

        var showAngle = this._showAngle;
        showAngle.getOrCreateStateSet().setAttributeAndModes( blendAttribute );
        showAngle.setNodeMask( 0x0 );
        showAngle.getOrCreateStateSet().addUniform( Uniform.createFloat3( vec3.fromValues( 1.0, 0.0, 0.0 ), 'uBase' ) );
        showAngle.getOrCreateStateSet().addUniform( Uniform.createFloat( 0.0, 'uAngle' ) );
        showAngle.addChild( GizmoGeometry.createQuadCircleGeometry() );

        var rotate = this._rotateNode;
        rotate.setNodeMask( NodeGizmo.PICK_ARC );
        rotate.addChild( mtXYZ );
        rotate.addChild( mtX );
        rotate.addChild( mtY );
        rotate.addChild( mtZ );
        rotate.addChild( showAngle );
        return rotate;
    },

    initNodeTranslate: function () {
        var aHeight = 1.5;
        var aConeHeight = 0.3;
        var pickStart = 0.5; // offset (because of the picking plane)
        var pickHeight = ( aHeight - pickStart + aConeHeight ) * 1.1;

        // cone arrow
        var mtCone = new MatrixTransform();
        mat4.fromTranslation( mtCone.getMatrix(), vec3.fromValues( 0.0, 0.0, aHeight + aConeHeight * 0.5 ) );
        mtCone.addChild( GizmoGeometry.createCylinderGeometry( 0.0, 0.07, aConeHeight, 32, 1, true, true ) );
        // arrow base
        var mtArrow = new MatrixTransform();
        mat4.fromTranslation( mtArrow.getMatrix(), vec3.fromValues( 0.0, 0.0, aHeight * 0.5 ) );
        mtArrow.addChild( GizmoGeometry.createCylinderGeometry( 0.01, 0.01, aHeight, 32, 1, true, true ) );
        // draw arrow
        var drawArrow = new Node();
        drawArrow.addChild( mtArrow );
        drawArrow.addChild( mtCone );

        var pickArrow = GizmoGeometry.createCylinderGeometry( 0.1, 0.1, pickHeight, 32, 1, true, true );

        var mtX = new MatrixTransform();
        var mtY = new MatrixTransform();
        var mtZ = new MatrixTransform();
        mtX._nbAxis = 0;
        mtY._nbAxis = 1;
        mtZ._nbAxis = 2;

        mat4.fromRotation( mtX.getMatrix(), Math.PI * 0.5, vec3.fromValues( 0.0, 1.0, 0.0 ) );
        mat4.fromRotation( mtY.getMatrix(), -Math.PI * 0.5, vec3.fromValues( 1.0, 0.0, 0.0 ) );

        var hideNode = new MatrixTransform();
        hideNode.setCullCallback( new HideCullCallback() );
        mat4.fromTranslation( hideNode.getMatrix(), vec3.fromValues( 0.0, 0.0, pickStart + pickHeight * 0.5 ) );
        hideNode.addChild( pickArrow );

        // set masks
        drawArrow.setNodeMask( NodeGizmo.NO_PICK );
        mtX.setNodeMask( NodeGizmo.PICK_ARROW_X );
        mtY.setNodeMask( NodeGizmo.PICK_ARROW_Y );
        mtZ.setNodeMask( NodeGizmo.PICK_ARROW_Z );

        mtX.addChild( drawArrow );
        mtY.addChild( drawArrow );
        mtZ.addChild( drawArrow );

        mtX.addChild( hideNode );
        mtY.addChild( hideNode );
        mtZ.addChild( hideNode );

        mtX.getOrCreateStateSet().addUniform( Uniform.createFloat4( vec4.fromValues( 1.0, 0.0, 0.0, 1.0 ), 'uColor' ) );
        mtY.getOrCreateStateSet().addUniform( Uniform.createFloat4( vec4.fromValues( 0.0, 1.0, 0.0, 1.0 ), 'uColor' ) );
        mtZ.getOrCreateStateSet().addUniform( Uniform.createFloat4( vec4.fromValues( 0.0, 0.0, 1.0, 1.0 ), 'uColor' ) );

        var translate = this._translateNode;
        translate.setNodeMask( NodeGizmo.PICK_ARROW );
        translate.addChild( mtX );
        translate.addChild( mtY );
        translate.addChild( mtZ );
        return translate;
    },

    initNodeTranslatePlane: function () {
        var mtPlane = new MatrixTransform();
        mat4.fromTranslation( mtPlane.getMatrix(), vec3.fromValues( 0.5, 0.5, 0.0 ) );
        mat4.mul( mtPlane.getMatrix(), mat4.fromScaling( mat4.create(), vec3.fromValues( 0.5, 0.5, 1.0 ) ), mtPlane.getMatrix() );
        mtPlane.addChild( GizmoGeometry.createPlaneGeometry() );

        var mtX = new MatrixTransform();
        var mtY = new MatrixTransform();
        var mtZ = new MatrixTransform();
        mtX._nbAxis = 0;
        mtY._nbAxis = 1;
        mtZ._nbAxis = 2;

        mat4.fromRotation( mtX.getMatrix(), -Math.PI * 0.5, vec3.fromValues( 0.0, 1.0, 0.0 ) );
        mat4.fromRotation( mtY.getMatrix(), Math.PI * 0.5, vec3.fromValues( 1.0, 0.0, 0.0 ) );

        // set masks
        mtX.setNodeMask( NodeGizmo.PICK_PLANE_X );
        mtY.setNodeMask( NodeGizmo.PICK_PLANE_Y );
        mtZ.setNodeMask( NodeGizmo.PICK_PLANE_Z );

        mtX.addChild( mtPlane );
        mtY.addChild( mtPlane );
        mtZ.addChild( mtPlane );

        mtX.getOrCreateStateSet().addUniform( Uniform.createFloat4( vec4.fromValues( 1.0, 0.0, 0.0, 0.3 ), 'uColor' ) );
        mtY.getOrCreateStateSet().addUniform( Uniform.createFloat4( vec4.fromValues( 0.0, 1.0, 0.0, 0.3 ), 'uColor' ) );
        mtZ.getOrCreateStateSet().addUniform( Uniform.createFloat4( vec4.fromValues( 0.0, 0.0, 1.0, 0.3 ), 'uColor' ) );

        var plane = this._planeNode;
        plane.setNodeMask( NodeGizmo.PICK_PLANE );
        plane.getOrCreateStateSet().setAttributeAndModes( blendAttribute );
        plane.addChild( mtX );
        plane.addChild( mtY );
        plane.addChild( mtZ );
        return plane;
    },

    updateArcRotation: ( function () {
        var qTmp = quat.create();
        var quatx = quat.setAxisAngle( quat.create(), [ 0.0, 1.0, 0.0 ], -Math.PI * 0.5 );
        var quaty = quat.setAxisAngle( quat.create(), [ 1.0, 0.0, 0.0 ], -Math.PI * 0.5 );
        return function ( eye ) {
            var rotateNode = this._rotateNode;
            var arcs = rotateNode.getChildren();
            // eye arc
            qTmp[ 0 ] = -eye[ 1 ];
            qTmp[ 1 ] = eye[ 0 ];
            qTmp[ 2 ] = 0.0;
            qTmp[ 3 ] = 1.0 + eye[ 2 ];
            quat.normalize( qTmp, qTmp );
            mat4.fromQuat( arcs[ 0 ].getMatrix(), qTmp );
            // x arc
            quat.setAxisAngle( qTmp, [ 1.0, 0.0, 0.0 ], Math.atan2( eye[ 2 ], eye[ 1 ] ) );
            quat.mul( qTmp, qTmp, quatx );
            mat4.fromQuat( arcs[ 1 ].getMatrix(), qTmp );
            // y arc
            quat.setAxisAngle( qTmp, [ 0.0, 1.0, 0.0 ], Math.atan2( -eye[ 0 ], -eye[ 2 ] ) );
            quat.mul( qTmp, qTmp, quaty );
            mat4.fromQuat( arcs[ 2 ].getMatrix(), qTmp );
            // z arc
            quat.setAxisAngle( qTmp, [ 0.0, 0.0, 1.0 ], Math.atan2( -eye[ 0 ], eye[ 1 ] ) );
            mat4.fromQuat( arcs[ 3 ].getMatrix(), qTmp );

            arcs[ 1 ].dirtyBound();
            arcs[ 2 ].dirtyBound();
            arcs[ 3 ].dirtyBound();
        };
    } )(),

    getTransformType: function ( node ) {
        var n = node;
        while ( n.getParents().length > 0 ) {
            if ( n.referenceFrame !== undefined && n.referenceFrame === TransformEnums.ABSOLUTE_RF )
                return TransformEnums.ABSOLUTE_RF;
            n = n.getParents()[ 0 ];
        }
        return TransformEnums.RELATIVE_RF;
    },

    updateGizmo: ( function () {
        var eye = vec3.create();
        var trVec = vec3.create();
        var tmpVec = vec3.create();

        var temp = mat4.create();
        var trWorld = mat4.create();
        var invScale = mat4.create();
        var scGiz = mat4.create();

        return function () {
            if ( !this._attachedNode )
                return;
            var ttype = this.getTransformType( this._attachedNode );
            this.setReferenceFrame( ttype );
            this.setCullingActive( ttype === TransformEnums.RELATIVE_RF );
            var worldMat = this._attachedNode.getWorldMatrices()[ 0 ];

            // world trans
            mat4.getTranslation( trVec, worldMat );
            mat4.fromTranslation( trWorld, trVec );

            // normalize gizmo size
            var scaleFactor = 3.0;
            if ( ttype === TransformEnums.ABSOLUTE_RF ) {
                eye[ 0 ] = eye[ 1 ] = eye[ 2 ] = 0.0;
                tmpVec[ 0 ] = tmpVec[ 1 ] = tmpVec[ 2 ] = 1.0;
            } else {
                // normalize gizmo size relative to screen size
                var proj = this._viewer.getCamera().getProjectionMatrix();
                var scaleFov = this._canvas.clientWidth * 0.023 * proj[ 0 ];
                this._manipulator.getEyePosition( eye );
                // while we are editing we don't normalize the gizmo
                // it gives a better depth feedback, especially if we are editing a geometry that has
                // a constant screen size (for example an icon)
                this._lastDistToEye = this._isEditing ? this._lastDistToEye : vec3.distance( trVec, eye );
                scaleFactor *= this._lastDistToEye / scaleFov;
            }
            mat4.fromScaling( scGiz, [ scaleFactor, scaleFactor, scaleFactor ] );

            // gizmo node
            mat4.mul( this.getMatrix(), trWorld, scGiz );

            vec3.sub( eye, eye, trVec );
            vec3.normalize( eye, eye );

            // rotate node
            if ( this._rotateInLocal || this._translateInLocal ) {
                // world scale
                mat4.getScale( tmpVec, worldMat );
                mat4.fromScaling( invScale, tmpVec );
                mat4.invert( invScale, invScale );

                mat4.mul( temp, worldMat, invScale );
                temp[ 12 ] = temp[ 13 ] = temp[ 14 ] = 0.0;

                if ( this._translateInLocal ) {
                    mat4.copy( this._translateNode.getMatrix(), temp );
                    mat4.copy( this._planeNode.getMatrix(), temp );
                }

                if ( this._rotateInLocal ) {
                    mat4.copy( this._rotateNode.getMatrix(), temp );
                    mat4.invert( temp, temp );
                    vec3.transformMat4( eye, eye, temp );
                }
            } else {
                mat4.identity( this._rotateNode.getMatrix() );
            }

            this.updateArcRotation( eye );

            this._rotateNode.dirtyBound();
            this._translateNode.dirtyBound();
            this._planeNode.dirtyBound();

            if ( this._isEditing )
                mat4.copy( this._showAngle.getMatrix(), this._hoverNode.getMatrix() );
        };
    } )(),

    computeNearestIntersection: ( function () {
        var sortByRatio = function ( a, b ) {
            return a.ratio - b.ratio;
        };
        var coord = vec2.create();

        return function ( e, tmask ) {
            getCanvasCoord( coord, e );

            // canvas to webgl coord
            var viewer = this._viewer;
            var canvas = this._canvas;
            var x = coord[ 0 ] * ( viewer._canvasWidth / canvas.clientWidth );
            var y = ( canvas.clientHeight - coord[ 1 ] ) * ( viewer._canvasHeight / canvas.clientHeight );

            var hits = this._viewer.computeIntersections( x, y, tmask );

            if ( hits.length === 0 )
                return undefined;

            hits.sort( sortByRatio );
            return hits[ 0 ];
        };
    } )(),

    setOnlyGizmoPicking: function () {
        // enable picking only for the gizmo
        this._viewer.getCamera().addChild( this );
        this._viewer.getSceneData().setNodeMask( 0x0 );
        this.setNodeMask( ~0x0 );
    },

    setOnlyScenePicking: function () {
        this._viewer.getCamera().removeChild( this );
        this._viewer.getSceneData().setNodeMask( ~0x0 );
        this.setNodeMask( NodeGizmo.NO_PICK );
    },

    pickGizmo: function ( e, tmask ) {
        this.setOnlyGizmoPicking();
        var hit = this.computeNearestIntersection( e, tmask );
        this.setOnlyScenePicking();
        return hit;
    },

    getCanvasPositionFromWorldPoint: ( function () {
        var mat = mat4.create();

        return function ( worldPoint, out ) {
            var cam = this._viewer.getCamera();

            var screenPoint = out;
            if ( !out ) {
                Notify.warn( 'deprecated, use out argument for result ' );
                screenPoint = vec3.create();
            }

            if ( cam.getViewport() ) {
                cam.getViewport().computeWindowMatrix( mat );
            } else {
                mat4.identity( mat );
            }

            mat4.mul( mat, mat, cam.getProjectionMatrix() );
            if ( this.getReferenceFrame() === TransformEnums.RELATIVE_RF )
                mat4.mul( mat, mat, cam.getViewMatrix() );

            vec3.transformMat4( screenPoint, worldPoint, mat );

            // canvas to webgl coord
            var viewer = this._viewer;
            var canvas = this._canvas;
            screenPoint[ 0 ] = screenPoint[ 0 ] / ( viewer._canvasWidth / canvas.clientWidth );
            screenPoint[ 1 ] = canvas.clientHeight - screenPoint[ 1 ] / ( viewer._canvasHeight / canvas.clientHeight );
            return screenPoint;
        };
    } )(),

    onMouseDown: function ( e ) {
        getCanvasCoord( this._downCanvasCoord, e );
        if ( !this._hoverNode || !this._attachedNode )
            return;
        this._viewer._eventProxy.StandardMouseKeyboard._enable = false;

        this.saveEditMatrices();
        var nm = this._hoverNode.getParents()[ 0 ].getNodeMask();
        this._isEditing = true;

        if ( nm & NodeGizmo.PICK_ARC ) {
            this._translateNode.setNodeMask( 0x0 );
            this._planeNode.setNodeMask( 0x0 );
            this.startRotateEdit( e );
        } else if ( nm & NodeGizmo.PICK_ARROW ) {
            this._rotateNode.setNodeMask( 0x0 );
            this._planeNode.setNodeMask( 0x0 );
            this.startTranslateEdit( e );
        } else if ( nm & NodeGizmo.PICK_PLANE ) {
            this._rotateNode.setNodeMask( 0x0 );
            this._translateNode.setNodeMask( 0x0 );
            this.startPlaneEdit( e );
        }
    },

    saveEditMatrices: function () {
        mat4.copy( this._editLocal, this._attachedNode.getMatrix() );
        // save the world translation
        var wm = this._attachedNode.getWorldMatrices()[ 0 ];
        mat4.fromTranslation( this._editWorldTrans, vec3.fromValues( wm[ 12 ], wm[ 13 ], wm[ 14 ] ) );
        // save the inv of world rotation + scale
        mat4.copy( this._editWorldScaleRot, wm );
        // removes translation
        this._editWorldScaleRot[ 12 ] = this._editWorldScaleRot[ 13 ] = this._editWorldScaleRot[ 14 ] = 0.0;
        mat4.invert( this._editInvWorldScaleRot, this._editWorldScaleRot );
    },

    startRotateEdit: function ( e ) {
        var gizmoMat = this._rotateNode.getWorldMatrices()[ 0 ];

        // center of gizmo on screen
        var projCenter = vec3.create();
        vec3.transformMat4( projCenter, projCenter, gizmoMat );
        this.getCanvasPositionFromWorldPoint( projCenter, projCenter );

        // pick rotate gizmo
        var hit = this.pickGizmo( e, this._hoverNode.getNodeMask() | NodeGizmo.PICK_ARC );
        if ( !hit ) return;

        // compute tangent direction
        var sign = this._hoverNode._nbAxis === 0 ? -1.0 : 1.0;
        var tang = vec3.create();
        tang[ 0 ] = sign * hit.point[ 1 ];
        tang[ 1 ] = -sign * hit.point[ 0 ];
        tang[ 2 ] = hit.point[ 2 ];

        // project tangent on screen
        var projArc = vec3.create();
        vec3.transformMat4( projArc, tang, this._hoverNode.getMatrix() );
        vec3.transformMat4( projArc, projArc, gizmoMat );
        this.getCanvasPositionFromWorldPoint( projArc, projArc );

        var dir = this._editLineDirection;
        vec2.sub( dir, projArc, projCenter );
        vec2.normalize( dir, dir );

        // show angle
        this._showAngle.setNodeMask( NodeGizmo.NO_PICK );
        hit.point[ 2 ] = 0.0;
        var stateAngle = this._showAngle.getStateSet();
        stateAngle.getUniform( 'uAngle' ).setFloat( 0.0 );
        stateAngle.getUniform( 'uBase' ).setVec3( vec3.normalize( hit.point, hit.point ) );

        getCanvasCoord( this._editLineOrigin, e );
    },

    startTranslateEdit: function ( e ) {
        var origin = this._editLineOrigin;
        var dir = this._editLineDirection;

        // 3d origin (center of gizmo)
        var gizmoMat = this._translateNode.getWorldMatrices()[ 0 ];
        mat4.getTranslation( origin, gizmoMat );

        // 3d direction
        vec3.init( dir );
        dir[ this._hoverNode._nbAxis ] = 1.0;
        if ( this._translateInLocal ) {
            vec3.transformMat4( dir, dir, this._editWorldScaleRot );
            vec3.normalize( dir, dir );
        }
        vec3.add( dir, origin, dir );

        // project on canvas
        this.getCanvasPositionFromWorldPoint( origin, origin );
        this.getCanvasPositionFromWorldPoint( dir, dir );

        vec2.sub( dir, dir, origin );
        vec2.normalize( dir, dir );

        var offset = this._editOffset;
        getCanvasCoord( offset, e );
        vec2.sub( offset, offset, origin );
    },

    startPlaneEdit: function ( e ) {
        var origin = this._editLineOrigin; // just used to determine the 2d offset

        // 3d origin (center of gizmo)
        var gizmoMat = this._planeNode.getWorldMatrices()[ 0 ];
        mat4.getTranslation( origin, gizmoMat );

        // project on canvas
        this.getCanvasPositionFromWorldPoint( origin, origin );

        var offset = this._editOffset;
        getCanvasCoord( offset, e );
        vec2.sub( offset, offset, origin );
    },

    drawLineCanvasDebug: function ( x1, y1, x2, y2 ) {
        this._debugNode.setNodeMask( NodeGizmo.NO_PICK );
        var buffer = this._debugNode.getChildren()[ 0 ].getAttributes().Vertex;
        buffer.getElements()[ 0 ] = ( ( x1 / this._canvas.clientWidth ) * 2 ) - 1.0;
        buffer.getElements()[ 1 ] = ( ( ( this._canvas.clientHeight - y1 ) / this._canvas.clientHeight ) ) * 2 - 1.0;
        buffer.getElements()[ 2 ] = ( ( x2 / this._canvas.clientWidth ) * 2 ) - 1.0;
        buffer.getElements()[ 3 ] = ( ( ( this._canvas.clientHeight - y2 ) / this._canvas.clientHeight ) ) * 2 - 1.0;
        buffer.dirty();
    },

    pickAndSelect: function ( e ) {
        this.setNodeMask( 0x0 );
        var hit = this.computeNearestIntersection( e, this._tmask );
        if ( this._autoInsertMT )
            this.attachToGeometry( hit ? hit.nodepath[ hit.nodepath.length - 1 ] : hit );
        else
            this.attachToNodePath( hit ? hit.nodepath : hit );
    },

    onMouseUp: function ( e ) {
        var smk = this._viewer._eventProxy.StandardMouseKeyboard;
        if ( smk._enable === false ) {
            smk._enable = true;
            this._viewer._eventProxy.StandardMouseKeyboard.mouseup( e );
        }
        if ( this._debugNode )
            this._debugNode.setNodeMask( 0x0 );

        var v = vec2.create();
        getCanvasCoord( v, e );
        if ( vec2.distance( v, this._downCanvasCoord ) === 0.0 )
            this.pickAndSelect( e );

        this._showAngle.setNodeMask( 0x0 );
        this._isEditing = false;
        if ( !this._hoverNode )
            return;
        this.updateGizmoMask();
    },

    onMouseMove: function ( e ) {
        if ( !this._attachedNode )
            return;
        var hit;
        if ( this._isEditing === false ) {
            hit = this.pickGizmo( e, NodeGizmo.PICK_GIZMO );
            this.onNodeHovered( hit );
            return;
        }

        if ( !this._hoverNode )
            return;

        var par = this._hoverNode.getParents()[ 0 ];
        if ( par === this._rotateNode )
            this.updateRotateEdit( e );
        else if ( par === this._translateNode )
            this.updateTranslateEdit( e );
        else if ( par === this._planeNode )
            this.updatePlaneEdit( e );
    },

    updateRotateEdit: ( function () {
        var mrot = mat4.create();
        var vec = vec2.create();
        var right = vec3.fromValues( 1.0, 0.0, 0.0 );
        var upy = vec3.fromValues( 0.0, 1.0, 0.0 );
        var upz = vec3.fromValues( 0.0, 0.0, 1.0 );
        return function ( e ) {

            var origin = this._editLineOrigin;
            var dir = this._editLineDirection;

            getCanvasCoord( vec, e );
            vec2.sub( vec, vec, origin );
            var dist = vec2.dot( vec, dir );

            if ( this._debugNode )
                this.drawLineCanvasDebug( origin[ 0 ], origin[ 1 ], origin[ 0 ] + dir[ 0 ] * dist, origin[ 1 ] + dir[ 1 ] * dist );

            var angle = 7 * dist / Math.min( this._canvas.clientWidth, this._canvas.clientHeight );
            angle %= ( Math.PI * 2 );
            var nbAxis = this._hoverNode._nbAxis;
            if ( nbAxis === 0 )
                mat4.fromRotation( mrot, -angle, right );
            else if ( nbAxis === 1 )
                mat4.fromRotation( mrot, -angle, upy );
            else if ( nbAxis === 2 )
                mat4.fromRotation( mrot, -angle, upz );

            this._showAngle.getOrCreateStateSet().getUniform( 'uAngle' ).setFloat( nbAxis === 0 ? -angle : angle );

            if ( !this._rotateInLocal ) {
                mat4.mul( mrot, this._editInvWorldScaleRot, mrot );
                mat4.mul( mrot, mrot, this._editWorldScaleRot );
            }

            mat4.mul( this._attachedNode.getMatrix(), this._editLocal, mrot );

            this._attachedNode.dirtyBound();
        };
    } )(),

    updateTranslateEdit: ( function () {
        var vec = vec2.create();
        var tra = vec3.create();

        return function ( e ) {

            var origin = this._editLineOrigin;
            var dir = this._editLineDirection;

            getCanvasCoord( vec, e );
            vec2.sub( vec, vec, origin );
            vec2.sub( vec, vec, this._editOffset );

            var dist = vec2.dot( vec, dir );
            vec[ 0 ] = origin[ 0 ] + dir[ 0 ] * dist;
            vec[ 1 ] = origin[ 1 ] + dir[ 1 ] * dist;

            if ( this._debugNode )
                this.drawLineCanvasDebug( origin[ 0 ], origin[ 1 ], vec[ 0 ], vec[ 1 ] );

            // canvas to webgl coord
            var viewer = this._viewer;
            var canvas = this._canvas;
            var coordx = vec[ 0 ] * ( viewer._canvasWidth / canvas.clientWidth );
            var coordy = ( canvas.clientHeight - vec[ 1 ] ) * ( viewer._canvasHeight / canvas.clientHeight );

            // project 2D point on the 3d line
            this._lsi.reset();
            this._lsi.setTestPlane( false );
            this._lsi.set( vec3.set( this._origIntersect, coordx, coordy, 0.0 ),
                vec3.set( this._dstIntersect, coordx, coordy, 1.0 ) );
            this._iv.reset();
            this._iv.setTraversalMask( this._hoverNode.getNodeMask() );

            mat4.copy( this.getMatrix(), this._editWorldTrans );

            this.setOnlyGizmoPicking();
            this._viewer._camera.accept( this._iv );
            this.setOnlyScenePicking();

            if ( !this._translateInLocal ) {
                vec3.transformMat4( tra, this._lsi.getTranslateDistance(), this._editInvWorldScaleRot );
            } else {
                mat4.getScale( tra, this._editInvWorldScaleRot );

                var inter = this._lsi.getTranslateDistance();
                vec3.mul( tra, tra, inter );
            }

            mat4.translate( this._attachedNode.getMatrix(), this._editLocal, tra );

            this._attachedNode.dirtyBound();
        };
    } )(),

    updatePlaneEdit: ( function () {
        var vec = vec2.create();
        var tra = vec3.create();

        return function ( e ) {
            getCanvasCoord( vec, e );
            vec2.sub( vec, vec, this._editOffset );

            // canvas to webgl coord
            var viewer = this._viewer;
            var canvas = this._canvas;
            var coordx = vec[ 0 ] * ( viewer._canvasWidth / canvas.clientWidth );
            var coordy = ( canvas.clientHeight - vec[ 1 ] ) * ( viewer._canvasHeight / canvas.clientHeight );

            // project 2D point on the 3d plane
            this._lsi.reset();
            this._lsi.setTestPlane( true );
            this._lsi.set( vec3.set( this._origIntersect, coordx, coordy, 0.0 ),
                vec3.set( this._dstIntersect, coordx, coordy, 1.0 ) );
            this._iv.reset();
            this._iv.setTraversalMask( this._hoverNode.getNodeMask() );

            mat4.copy( this.getMatrix(), this._editWorldTrans );

            this.setOnlyGizmoPicking();
            this._viewer._camera.accept( this._iv );
            this.setOnlyScenePicking();

            if ( !this._translateInLocal ) {
                vec3.transformMat4( tra, this._lsi.getTranslateDistance(), this._editInvWorldScaleRot );
            } else {
                mat4.getScale( tra, this._editInvWorldScaleRot );
                var inter = this._lsi.getTranslateDistance();
                vec3.mul( tra, tra, inter );
            }

            mat4.translate( this._attachedNode.getMatrix(), this._editLocal, tra );

            this._attachedNode.dirtyBound();
        };
    } )()

} );

module.exports = NodeGizmo;
