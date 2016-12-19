'use strict';
var MACROUTILS = require( 'osg/Utils' );
var NodeVisitor = require( 'osg/NodeVisitor' );
var Geometry = require( 'osg/Geometry' );
var BufferArray = require( 'osg/BufferArray' );
var DrawArrays = require( 'osg/DrawArrays' );
var PrimitiveSet = require( 'osg/primitiveSet' );
var StateSet = require( 'osg/StateSet' );
var Uniform = require( 'osg/Uniform' );
var Depth = require( 'osg/Depth' );
var vec3 = require( 'osg/glMatrix' ).vec3;
var ShaderGenerator = require( 'osgShader/ShaderGenerator' );
var Compiler = require( 'osgShader/Compiler' );
var RigGeometry = require( 'osgAnimation/RigGeometry' );
var MorphGeometry = require( 'osgAnimation/MorphGeometry' );
var UpdateMorph = require( 'osgAnimation/UpdateMorph' );


////////////////////////
// COMPILER OFFSET NORMAL
////////////////////////
var CompilerOffsetNormal = function () {
    Compiler.apply( this, arguments );
};

CompilerOffsetNormal.prototype = MACROUTILS.objectInherit( Compiler.prototype, {
    getFragmentShaderName: function () {
        return 'CompilerOffsetNormal';
    },
    initTextureAttributes: function () {},
    createFragmentShaderGraph: function () {
        var frag = this.getNode( 'glFragColor' );

        this.getNode( 'SetAlpha' ).inputs( {
            color: this.getOrCreateUniform( 'vec3', 'uColorDebug' ),
            alpha: this.createVariable( 'float' ).setValue( '1.0' )
        } ).outputs( {
            color: frag
        } );

        return [ frag ];
    },
    getOffsetDirection: function () {
        return this.getOrCreateModelNormal();
    },
    getOrCreateModelVertex: function () {
        var vertexOffset = this.getVariable( 'vertexOffset' );
        if ( vertexOffset ) return vertexOffset;

        vertexOffset = this.createVariable( 'vec3', 'vertexOffset' );

        var str = '%out = %offset == 1.0 ? %vertex + normalize(%direction.xyz) * %scale: %vertex;';
        this.getNode( 'InlineCode' ).code( str ).inputs( {
            offset: this.getOrCreateAttribute( 'float', 'Offset' ),
            direction: this.getOffsetDirection(),
            vertex: Compiler.prototype.getOrCreateModelVertex.call( this ),
            scale: this.getOrCreateUniform( 'float', 'uScale' )
        } ).outputs( {
            out: vertexOffset
        } );

        return vertexOffset;
    },
    getOrCreateViewVertex: function () {
        var out = this._variables.FragEyeVector;
        if ( out && !out.isEmpty() ) return out;
        out = this._varyings.FragEyeVector || this.createVariable( 'vec4', 'FragEyeVector' );

        this.getNode( 'MatrixMultPosition' ).inputs( {
            matrix: this.getOrCreateUniform( 'mat4', 'uViewMatrix' ),
            vec: this.getOrCreateModelVertex()
        } ).outputs( {
            vec: out
        } );

        return out;
    }
} );

var ShaderGeneratorCompilerOffsetNormal = function () {
    ShaderGenerator.apply( this, arguments );
    this.setShaderCompiler( CompilerOffsetNormal );
};
ShaderGeneratorCompilerOffsetNormal.prototype = ShaderGenerator.prototype;

////////////////////////
// COMPILER OFFSET TANGENT
////////////////////////
var CompilerOffsetTangent = function () {
    CompilerOffsetNormal.apply( this, arguments );
};

CompilerOffsetTangent.prototype = MACROUTILS.objectInherit( CompilerOffsetNormal.prototype, {
    getFragmentShaderName: function () {
        return 'CompilerOffsetTangent';
    },
    getOffsetDirection: function () {
        return this.getOrCreateModelTangent();
    }
} );

var ShaderGeneratorCompilerOffsetTangent = function () {
    ShaderGenerator.apply( this, arguments );
    this.setShaderCompiler( CompilerOffsetTangent );
};
ShaderGeneratorCompilerOffsetTangent.prototype = ShaderGenerator.prototype;

////////////////////////
// DISPLAY NORMAL VISITOR
////////////////////////

var DisplayNormalVisitor = function () {
    NodeVisitor.call( this );

    this._unifScale = Uniform.createFloat( 1.0, 'uScale' );

    var ns = this._normalStateSet = new StateSet();
    ns.addUniform( Uniform.createFloat3( vec3.fromValues( 1.0, 0.0, 0.0 ), 'uColorDebug' ) );
    ns.addUniform( this._unifScale );
    ns.setAttributeAndModes( new Depth( Depth.NEVER ) );
    ns.setShaderGeneratorName( 'debugNormal' );

    var ts = this._tangentStateSet = new StateSet();
    ts.addUniform( Uniform.createFloat3( vec3.fromValues( 0.0, 1.0, 0.0 ), 'uColorDebug' ) );
    ts.addUniform( this._unifScale );
    ts.setAttributeAndModes( new Depth( Depth.NEVER ) );
    ts.setShaderGeneratorName( 'debugTangent' );
};

DisplayNormalVisitor.CompilerOffsetNormal = CompilerOffsetNormal;
DisplayNormalVisitor.CompilerOffsetTangent = CompilerOffsetTangent;
DisplayNormalVisitor.ShaderGeneratorCompilerOffsetNormal = ShaderGeneratorCompilerOffsetNormal;
DisplayNormalVisitor.ShaderGeneratorCompilerOffsetTangent = ShaderGeneratorCompilerOffsetTangent;

DisplayNormalVisitor.prototype = MACROUTILS.objectInherit( NodeVisitor.prototype, {
    setScale: function ( scale ) {
        this._unifScale.setFloat( scale );
    },
    setTangentVisibility: function ( bool ) {
        this._tangentStateSet.setAttributeAndModes( new Depth( bool ? Depth.LESS : Depth.NEVER ) );
    },
    setNormalVisibility: function ( bool ) {
        this._normalStateSet.setAttributeAndModes( new Depth( bool ? Depth.LESS : Depth.NEVER ) );
    },
    apply: function ( node ) {
        var list = node.getUpdateCallbackList();
        // dirty the UpdateMorph so that they detect the normal/tangent geometry and update the target/weights correctly
        for ( var i = 0, nbCB = list.length; i < nbCB; ++i ) {
            if ( list[ i ] instanceof UpdateMorph ) {
                list[ i ]._isInitialized = false;
            }
        }

        if ( node._isVisitedNormalDebug )
            return;

        node._isVisitedNormalDebug = true;

        if ( node instanceof Geometry === false )
            return this.traverse( node );

        this._createDebugGeom( node, 'Normal', this._normalStateSet );
        this._createDebugGeom( node, 'Tangent', this._tangentStateSet );
    },
    _createDoubleOffsetArray: function ( nbVertices ) {
        // 0 means original vertex pos
        // 1 means offseted vertex
        var elts = new Float32Array( nbVertices * 2 );
        for ( var i = 0; i < nbVertices; ++i ) {
            elts[ i * 2 ] = 1.0;
        }
        return new BufferArray( BufferArray.ARRAY_BUFFER, elts, 1 );
    },
    _createDoubledBufferArray: function ( bufferArray ) {
        // in case of morphs
        if ( bufferArray.getInitialBufferArray )
            bufferArray = bufferArray.getInitialBufferArray();

        var itemSize = bufferArray.getItemSize();
        var elements = bufferArray.getElements();
        var nbElements = elements.length / itemSize;

        var ctor = elements.constructor;
        var elementsDouble = new ctor( elements.length * 2 );
        for ( var i = 0; i < nbElements; ++i ) {
            var iSize = i * itemSize;
            var iSize2 = iSize * 2;

            for ( var j = 0; j < itemSize; ++j ) {
                elementsDouble[ iSize2 + j ] = elementsDouble[ iSize2 + j + itemSize ] = elements[ iSize + j ];
            }
        }

        return new BufferArray( BufferArray.ARRAY_BUFFER, elementsDouble, itemSize );
    },
    _addMorphTargets: function ( originMorph, morph, vecName ) {
        var targets = morph.getMorphTargets();
        morph.setName( originMorph.getName() ); // for the UpdateMorph

        var originTargets = originMorph.getMorphTargets();
        for ( var i = 0, nbTarget = originTargets.length; i < nbTarget; ++i ) {
            var origTarget = originTargets[ i ];
            var origAttrs = origTarget.getVertexAttributeList();

            var newTarget = new Geometry();
            newTarget.setName( origTarget.getName() ); // for the UpdateMorph
            var newAttrs = newTarget.getVertexAttributeList();

            newAttrs.Vertex = this._createDoubledBufferArray( origAttrs.Vertex );
            if ( origAttrs[ vecName ] ) newAttrs[ vecName ] = this._createDoubledBufferArray( origAttrs[ vecName ] );

            targets.push( newTarget );
        }

        morph.mergeChildrenVertexAttributeList();
        return morph;
    },
    _createDebugGeom: function ( node, vecName, stateSet ) {
        var attrs = node.getAttributes();
        var dispVec = attrs[ vecName ];
        if ( !dispVec )
            return;

        var vertices = attrs.Vertex;
        if ( !vertices )
            return;

        var originMorph;
        if ( node instanceof MorphGeometry ) originMorph = node;
        else if ( node.getSourceGeometry && node.getSourceGeometry() instanceof MorphGeometry ) originMorph = node.getSourceGeometry();

        var nbVertices = vertices.getElements().length / vertices.getItemSize();

        // vertex and normals
        var source = originMorph ? new MorphGeometry() : new Geometry();
        source.getAttributes().Vertex = this._createDoubledBufferArray( vertices );
        source.getAttributes().Offset = this._createDoubleOffsetArray( nbVertices );
        source.getAttributes()[ vecName ] = this._createDoubledBufferArray( dispVec );

        // primitive
        source.getPrimitives().push( new DrawArrays( PrimitiveSet.LINES, 0, nbVertices * 2 ) );

        if ( originMorph )
            this._addMorphTargets( originMorph, source, vecName );

        var geom;
        if ( node instanceof RigGeometry ) {

            var rig = new RigGeometry();
            rig.setSourceGeometry( source );

            rig.getVertexAttributeList().Bones = this._createDoubledBufferArray( attrs.Bones );
            rig.getVertexAttributeList().Weights = this._createDoubledBufferArray( attrs.Weights );

            // we can simply share the rig-animated stateSet attributes
            // (unlike morph, the stateSet and update animation doesn't operate at per vertex level)
            rig._rigTransformImplementation = node._rigTransformImplementation;
            rig._stateSetAnimation = node._stateSetAnimation;

            rig.mergeChildrenData();
            geom = rig;

        } else {
            geom = source;
        }


        // add geom to the graph
        var parents = node.getParents();
        var nbParents = parents.length;
        geom._isVisitedNormalDebug = true;
        geom._isNormalDebug = true;
        geom.setStateSet( stateSet );
        for ( var i = 0; i < nbParents; ++i )
            parents[ i ].addChild( geom );

        return geom;
    }
} );


module.exports = DisplayNormalVisitor;
