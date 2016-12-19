'use strict';

var Notify = require( 'osg/notify' );

var CompilerVertex = {

    createVertexShader: function () {

        this._fragmentShaderMode = false;

        // Call to specialised inhenrited shader Compiler
        var roots = this.declareVertexMain();
        var vname = this.getVertexShaderName();
        if ( vname ) roots.push( this.getNode( 'Define', 'SHADER_NAME' ).setValue( vname ) );

        // call the graph compiler itself
        var shader = this.createShaderFromGraphs( roots );

        Notify.debug( shader );

        return shader;
    },

    declareVertexMain: function () {

        var glPointSize = this.getNode( 'glPointSize' );
        this.getNode( 'SetFromNode' ).inputs( this.getOrCreateConstantOne( 'float' ) ).outputs( glPointSize );

        // Because of a weird bug on iOS, glPosition should be computed in the vertex shader before some varyings
        var roots = [ glPointSize, this.declareVertexPosition() ];

        this.declareVertexVaryings( roots );

        return roots;
    },

    declareVertexVaryings: function ( roots ) {
        var varyings = this._varyings;

        if ( varyings.vModelVertex ) this.getNode( 'SetFromNode' ).inputs( this.getOrCreateModelVertex() ).outputs( varyings.vModelVertex );
        if ( varyings.vModelNormal ) this.getNode( 'SetFromNode' ).inputs( this.getOrCreateModelNormal() ).outputs( varyings.vModelNormal );
        if ( varyings.vModelTangent ) this.getNode( 'SetFromNode' ).inputs( this.getOrCreateModelTangent() ).outputs( varyings.vModelTangent );

        if ( varyings.vViewVertex ) this.getNode( 'SetFromNode' ).inputs( this.getOrCreateViewVertex() ).outputs( varyings.vViewVertex );
        if ( varyings.vViewNormal ) this.getNode( 'SetFromNode' ).inputs( this.getOrCreateViewNormal() ).outputs( varyings.vViewNormal );
        if ( varyings.vViewTangent ) this.getNode( 'SetFromNode' ).inputs( this.getOrCreateViewTangent() ).outputs( varyings.vViewTangent );

        if ( varyings.vVertexColor ) {
            this.getNode( 'InlineCode' ).code( '%vcolor = %venabled == 1.0 ? %acolor : vec4(1.0, 1.0, 1.0, 1.0);' ).inputs( {
                venabled: this.getOrCreateUniform( 'float', 'uArrayColorEnabled' ),
                acolor: this.getOrCreateAttribute( 'vec4', 'Color' )
            } ).outputs( {
                vcolor: this.getOrCreateVarying( 'vec4', 'vVertexColor' )
            } );
        }

        var vars = window.Object.keys( varyings );
        for ( var j = 0, jl = vars.length; j < jl; j++ ) {
            var varying = varyings[ vars[ j ] ];
            roots.push( varying );

            var name = varying.getVariable();
            if ( name.indexOf( 'vTexCoord' ) !== -1 ) {
                this.getNode( 'SetFromNode' ).inputs( this.getOrCreateAttribute( 'vec2', name.substring( 1 ) ) ).outputs( varying );
            }
        }
    },

    declareVertexPosition: function () {
        var glPosition = this.getNode( 'glPosition' );
        if ( this._isBillboard ) this.declareVertexTransformBillboard( glPosition );
        else this.declareScreenVertex( glPosition );
        return glPosition;
    },

    getOrCreateModelVertex: function () {
        var out = this._variables.modelVertex;
        if ( out ) return out;
        out = this.createVariable( 'vec3', 'modelVertex' );

        this.getNode( 'MatrixMultPosition' ).inputs( {
            matrix: this.getOrCreateUniform( 'mat4', 'uModelMatrix' ),
            vec: this.getOrCreateLocalVertex()
        } ).outputs( {
            vec: out
        } );

        return out;
    },

    getOrCreateModelNormal: function () {
        var out = this._variables.modelNormal;
        if ( out ) return out;
        out = this.createVariable( 'vec3', 'modelNormal' );

        this.getNode( 'MatrixMultDirection' ).inputs( {
            matrix: this.getOrCreateUniform( 'mat4', 'uModelMatrix' ), // ModelNormalMatrix
            vec: this.getOrCreateLocalNormal()
        } ).outputs( {
            vec: out
        } );

        // not normalized

        return out;
    },

    getOrCreateModelTangent: function () {
        var out = this._variables.modelTangent;
        if ( out ) return out;
        out = this.createVariable( 'vec4', 'modelTangent' );

        this.getNode( 'MatrixMultDirection' ).setOverwriteW( false ).inputs( {
            matrix: this.getOrCreateUniform( 'mat4', 'uModelMatrix' ), // ModelNormalMatrix
            vec: this.getOrCreateLocalTangent()
        } ).outputs( {
            vec: out
        } );

        // not normalized

        return out;
    },

    getOrCreateViewVertex: function () {
        var out = this._variables.viewVertex;
        if ( out ) return out;
        out = this.createVariable( 'vec4', 'viewVertex' );

        this.getNode( 'MatrixMultPosition' ).inputs( {
            matrix: this.getOrCreateUniform( 'mat4', 'uModelViewMatrix' ),
            vec: this.getOrCreateLocalVertex()
        } ).outputs( {
            vec: out
        } );

        return out;
    },

    getOrCreateViewNormal: function () {
        var out = this._variables.viewNormal;
        if ( out ) return out;
        out = this.createVariable( 'vec3', 'viewNormal' );

        this.getNode( 'MatrixMultDirection' ).inputs( {
            matrix: this.getOrCreateUniform( 'mat4', 'uModelViewNormalMatrix' ),
            vec: this.getOrCreateLocalNormal()
        } ).outputs( {
            vec: out
        } );

        return out;
    },

    getOrCreateViewTangent: function () {
        var out = this._variables.viewTangent;
        if ( out ) return out;
        out = this.createVariable( 'vec4', 'viewTangent' );

        this.getNode( 'MatrixMultDirection' ).setOverwriteW( false ).inputs( {
            matrix: this.getOrCreateUniform( 'mat4', 'uModelViewNormalMatrix' ),
            vec: this.getOrCreateLocalTangent()
        } ).outputs( {
            vec: out
        } );

        return out;
    },

    declareScreenVertex: function ( glPosition ) {
        this.getNode( 'MatrixMultPosition' ).inputs( {
            matrix: this.getOrCreateProjectionMatrix(),
            vec: this.getOrCreateViewVertex()
        } ).outputs( {
            vec: glPosition
        } );
    },

    declareVertexTransformBillboard: function ( glPosition ) {
        this.getNode( 'Billboard' ).inputs( {
            Vertex: this.getOrCreateAttribute( 'vec3', 'Vertex' ),
            ModelViewMatrix: this.getOrCreateUniform( 'mat4', 'uModelViewMatrix' ),
            ProjectionMatrix: this.getOrCreateUniform( 'mat4', 'uProjectionMatrix' )
        } ).outputs( {
            vec: glPosition
        } );
    },

    getOrCreateBoneMatrix: function () {
        // reusable BoneMatrix between Vertex, Normal, Tangent
        // Manadatory: scale animations must be uniform scale
        var boneMatrix = this._variables[ 'boneMatrix' ];
        if ( boneMatrix )
            return boneMatrix;

        boneMatrix = this.createVariable( 'mat4', 'boneMatrix' );

        var inputWeights = this.getOrCreateAttribute( 'vec4', 'Weights' );
        var inputBones = this.getOrCreateAttribute( 'vec4', 'Bones' );
        var matrixPalette = this.getOrCreateUniform( 'vec4', 'uBones', this._skinningAttribute.getBoneUniformSize() );

        this.getNode( 'Skinning' ).inputs( {
            weights: inputWeights,
            bonesIndex: inputBones,
            matrixPalette: matrixPalette
        } ).outputs( {
            mat4: boneMatrix
        } );

        return boneMatrix;
    },

    getTarget: function ( name, i ) {
        var type = name.indexOf( 'Tangent' ) !== -1 ? 'vec4' : 'vec3';
        return this.getOrCreateAttribute( type, name + '_' + i );
    },

    morphTangentApproximation: function ( inputVertex, outputVertex ) {
        var normalizedMorph = this.getOrCreateLocalNormal();
        // kind of tricky, here we retrieve the normalized normal after morphing
        // if there is no rigging we do not recompute it
        if ( this._skinningAttribute ) {

            normalizedMorph = this.createVariable( 'vec3' );
            this.getNode( 'Normalize' ).inputs( {
                vec: this.getOrCreateMorphNormal()
            } ).outputs( {
                vec: normalizedMorph
            } );

        }

        this.getNode( 'InlineCode' ).code( '%out = %tangent.rgb - dot(%tangent.rgb, %normal) * %normal;' ).inputs( {
            tangent: inputVertex,
            normal: normalizedMorph
        } ).outputs( {
            out: outputVertex
        } );

        return outputVertex;
    },

    morphTransformVec3: function ( inputVertex, outputVertex ) {
        var inputs = {
            vertex: inputVertex,
            weights: this.getOrCreateUniform( 'vec4', 'uTargetWeights' )
        };

        var numTargets = this._morphAttribute.getNumTargets();
        for ( var i = 0; i < numTargets; i++ )
            inputs[ 'target' + i ] = this.getTarget( inputVertex.getVariable(), i );

        this.getNode( 'Morph' ).inputs( inputs ).outputs( {
            out: outputVertex
        } );

        return outputVertex;
    },

    skinTransformVertex: function ( inputVertex, outputVertex ) {
        this.getNode( 'MatrixMultPosition' ).setInverse( true ).inputs( {
            matrix: this.getOrCreateBoneMatrix(),
            vec: inputVertex
        } ).outputs( {
            vec: outputVertex
        } );
        return outputVertex;
    },

    skinTransformNormal: function ( inputVertex, outputVertex ) {
        this.getNode( 'MatrixMultDirection' ).setInverse( true ).inputs( {
            matrix: this.getOrCreateBoneMatrix(),
            vec: inputVertex
        } ).outputs( {
            vec: outputVertex
        } );
        return outputVertex;
    },

    getOrCreateMorphVertex: function () {
        var vecOut = this.getVariable( 'morphVertex' );
        if ( vecOut ) return vecOut;

        var inputVertex = this.getOrCreateAttribute( 'vec3', 'Vertex' );
        if ( !this._morphAttribute || !this._morphAttribute.hasTarget( 'Vertex' ) ) return inputVertex;

        return this.morphTransformVec3( inputVertex, this.createVariable( 'vec3', 'morphVertex' ) );
    },

    getOrCreateMorphNormal: function () {
        var vecOut = this.getVariable( 'morphNormal' );
        if ( vecOut ) return vecOut;

        var inputNormal = this.getOrCreateAttribute( 'vec3', 'Normal' );
        if ( !this._morphAttribute || !this._morphAttribute.hasTarget( 'Normal' ) ) return inputNormal;

        return this.morphTransformVec3( inputNormal, this.createVariable( 'vec3', 'morphNormal' ) );
    },

    getOrCreateMorphTangent: function () {
        var vecOut = this.getVariable( 'morphTangent' );
        if ( vecOut ) return vecOut;

        var inputTangent = this.getOrCreateAttribute( 'vec4', 'Tangent' );
        var hasMorphTangent = this._morphAttribute && this._morphAttribute.hasTarget( 'Tangent' );

        if ( !hasMorphTangent ) return inputTangent;

        return this.morphTransformVec3( inputTangent, this.createVariable( 'vec3', 'morphTangent' ) );

        // if ( !hasMorphTangent && !this._morphAttribute && !this._morphAttribute.hasTarget( 'Normal' ) ) return inputTangent;

        // if ( hasMorphTangent ) return this.morphTransformVec3( inputTangent, this.createVariable( 'vec3', 'morphTangent' ) );

        // // Approximate tangent morphing depending of the normal morphing (disabled as we are not sure it's worth it for now)
        // return this.morphTangentApproximation( inputTangent, this.createVariable( 'vec3', 'morphTangent' ) );
    },

    getOrCreateSkinVertex: function () {
        var vecOut = this.getVariable( 'skinVertex' );
        if ( vecOut ) return vecOut;

        var inputVertex = this.getOrCreateMorphVertex();
        if ( !this._skinningAttribute ) return inputVertex;

        return this.skinTransformVertex( inputVertex, this.createVariable( 'vec3', 'skinVertex' ) );
    },

    getOrCreateSkinNormal: function () {
        var vecOut = this.getVariable( 'skinNormal' );
        if ( vecOut ) return vecOut;

        var inputNormal = this.getOrCreateMorphNormal();
        if ( !this._skinningAttribute ) return inputNormal;

        return this.skinTransformNormal( inputNormal, this.createVariable( 'vec3', 'skinNormal' ) );
    },

    getOrCreateSkinTangent: function () {
        var vecOut = this.getVariable( 'skinTangent' );
        if ( vecOut ) return vecOut;

        var inputTangent = this.getOrCreateMorphTangent();
        if ( !this._skinningAttribute ) return inputTangent;

        return this.skinTransformNormal( inputTangent, this.createVariable( 'vec3', 'skinTangent' ) );
    },

    getOrCreateLocalVertex: function () {
        return this.getOrCreateSkinVertex();
    },

    getOrCreateLocalNormal: function () {
        var vecOut = this.getVariable( 'localNormal' );
        if ( vecOut ) return vecOut;

        var normal = this.getOrCreateSkinNormal();
        if ( normal === this.getOrCreateAttribute( 'vec3', 'Normal' ) ) return normal;

        vecOut = this.createVariable( 'vec3', 'localNormal' );
        this.getNode( 'Normalize' ).inputs( {
            vec: normal
        } ).outputs( {
            vec: vecOut
        } );

        return vecOut;
    },

    getOrCreateLocalTangent: function () {
        var vecOut = this.getVariable( 'localTangent' );
        if ( vecOut ) return vecOut;

        var inputTangent = this.getOrCreateAttribute( 'vec4', 'Tangent' );
        var tangent = this.getOrCreateSkinTangent();
        if ( tangent === inputTangent ) return tangent;

        return this.normalizeAndSetAlpha( tangent, inputTangent, this.createVariable( 'vec4', 'localTangent' ) );
    },

    normalizeAndSetAlpha: function ( tang3, tang4, vecOut ) {
        var tangNormalized = this.createVariable( 'vec3' );
        this.getNode( 'Normalize' ).inputs( {
            vec: tang3
        } ).outputs( {
            vec: tangNormalized
        } );

        this.getNode( 'SetAlpha' ).inputs( {
            color: tangNormalized,
            alpha: tang4
        } ).outputs( {
            color: vecOut
        } );

        return vecOut;
    }
};

module.exports = CompilerVertex;
