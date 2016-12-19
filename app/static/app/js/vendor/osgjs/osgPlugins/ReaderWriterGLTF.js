'use strict';

var requestFile = require( 'osgDB/requestFile.js' );
var Notify = require( 'osg/notify' );
var Registry = require( 'osgDB/Registry' );
var Input = require( 'osgDB/Input' );
var animation = require( 'osgAnimation/animation' );
var BasicAnimationManager = require( 'osgAnimation/BasicAnimationManager' );
var Skeleton = require( 'osgAnimation/Skeleton' );
var Bone = require( 'osgAnimation/Bone' );
var StackedTranslate = require( 'osgAnimation/StackedTranslate' );
var StackedQuaternion = require( 'osgAnimation/StackedQuaternion' );
var StackedScale = require( 'osgAnimation/StackedScale' );
var RigGeometry = require( 'osgAnimation/RigGeometry' );
var channel = require( 'osgAnimation/channel' );
var createQuatChannel = channel.createQuatChannel;
var createVec3Channel = channel.createVec3Channel;

var Geometry = require( 'osg/Geometry' );
var Texture = require( 'osg/Texture' );
var MatrixTransform = require( 'osg/MatrixTransform' );
var Material = require( 'osg/Material' );
var DrawElements = require( 'osg/DrawElements' );
var primitiveSet = require( 'osg/primitiveSet' );
var BufferArray = require( 'osg/BufferArray' );
var UpdateBone = require( 'osgAnimation/UpdateBone' );
var UpdateMatrixTransform = require( 'osgAnimation/UpdateMatrixTransform' );

var Uniform = require( 'osg/Uniform' );

var vec3 = require( 'osg/glMatrix' ).vec3;
var quat = require( 'osg/glMatrix' ).quat;
var mat4 = require( 'osg/glMatrix' ).mat4;

var GLTFLoader = function () {

    // Contains all the needed glTF files (.gltf, .bin, etc...)
    this._files = null;
    this._loadedFiles = null;
    this._localPath = null;
    this._bufferViewCache = null;

    this._basicAnimationManager = null;

    this._visitedNodes = null;
    this._animatedNodes = null;
    this._skeletons = null;
    this._bones = null;
    this._skeletonToInfluenceMap = null;

    this._cachepromise = null;
    this._inputImgReader = null;

};

GLTFLoader.WEBGL_COMPONENT_TYPES = {
    5120: Int8Array,
    5121: Uint8Array,
    5122: Int16Array,
    5123: Uint16Array,
    5125: Uint32Array,
    5126: Float32Array
};

GLTFLoader.TYPE_TABLE = {
    SCALAR: 1,
    VEC2: 2,
    VEC3: 3,
    VEC4: 4,
    MAT2: 4,
    MAT3: 9,
    MAT4: 16
};

GLTFLoader.TEXTURE_FORMAT = {
    6406: Texture.ALPHA,
    6407: Texture.RGB,
    6408: Texture.RGBA,
    6409: Texture.LUMINANCE,
    6410: Texture.LUMINANCE_ALPHA
};

GLTFLoader.PBR_EXTENSION = 'FRAUNHOFER_materials_pbr';
GLTFLoader.PBR_METAL_MODE = 'PBR_metal_roughness';
GLTFLoader.PBR_SPEC_MODE = 'PBR_specular_glossiness';

GLTFLoader.ALBEDO_TEXTURE_UNIT = 2;
GLTFLoader.DIFFUSE_TEXTURE_UNIT = 2;
GLTFLoader.ROUGHNESS_TEXTURE_UNIT = 3;
GLTFLoader.GLOSSINESS_TEXTURE_UNIT = 3;
GLTFLoader.METALNESS_TEXTURE_UNIT = 4;
GLTFLoader.SPECULAR_TEXTURE_UNIT = 4;
GLTFLoader.NORMAL_TEXTURE_UNIT = 5;
GLTFLoader.AO_TEXTURE_UNIT = 6;

GLTFLoader.ALBEDO_UNIFORM = 'albedoMap';
GLTFLoader.ROUGHNESS_UNIFORM = 'roughnessMap';
GLTFLoader.SPECULAR_UNIFORM = 'specularMap';
GLTFLoader.NORMAL_UNIFORM = 'normalMap';
GLTFLoader.AO_UNIFORM = 'aoMap';

GLTFLoader.prototype = {

    init: function () {

        this._files = null;
        this._loadedFiles = {};
        this._localPath = null;

        this._bufferViewCache = {};


        this._basicAnimationManager = null;

        this._visitedNodes = {};
        this._animatedNodes = {};
        this._skeletons = {};
        this._bones = {};
        this._skeletonToInfluenceMap = {};
        this._stateSetMap = {};

        this._cachepromise = {};
        this._inputImgReader = new Input();

    },

    getFileName: function ( urlOrFile ) {

        if ( typeof ( urlOrFile ) === 'string' ) {
            var fileName = urlOrFile.split( '/' ).pop();
            return fileName;
        }

        if ( !( urlOrFile instanceof File ) )
            return null;

        return urlOrFile.name;
    },

    findFileFromURI: function ( urlOrFiles, uri ) {

        if ( typeof ( urlOrFiles ) === 'string' ) return uri;

        for ( var i = 0; i < urlOrFiles.length; ++i ) {

            var fileName = this.getFileName( urlOrFiles[ i ] );

            if ( fileName === uri )
                return urlOrFiles[ i ];

        }

        return null;
    },

    getFileType: function ( urlOrFile ) {

        var fileName = this.getFileName( urlOrFile );
        if ( !fileName ) return null;

        var ext = fileName.split( '.' ).pop();
        if ( ext === 'bin' )
            return 'arraybuffer';
        else if ( ext === 'gltf' )
            return 'text';

        return 'blob';
    },

    loadGLTFJson: function ( urlOrFiles ) {

        if ( this._preloaded ) {

            var keys = window.Object.keys( this._loadedFiles );
            for ( var j = 0; j < keys.length; ++j ) {

                if ( keys[ j ].indexOf( '.gltf' ) !== -1 )
                    return Promise.resolve( this._loadedFiles[ keys[ j ] ] );

            }

            Notify.warn( 'You did not provide any glTF file' );
            return Promise.resolve( null );

        }

        var glTFFileOrUrl = null;
        if ( typeof ( urlOrFiles ) === 'string' ) {

            var ext = urlOrFiles.split( '.' ).pop();
            if ( ext !== 'gltf' ) {

                Notify.warn( 'The given URL does not point toward a valid glTF file' );
                return Promise.resolve( null );

            }

            var index = urlOrFiles.lastIndexOf( '/' );
            this._localPath = ( index === -1 ) ? '' : urlOrFiles.substr( 0, index + 1 );

            glTFFileOrUrl = urlOrFiles;

        } else {

            if ( !( urlOrFiles instanceof FileList ) && !this._preloaded ) {

                Notify.warn( 'The provided argument is neither a FileList nor a valid URL' );
                return Promise.resolve( null );

            }

            for ( var i = 0; i < urlOrFiles.length; ++i ) {

                var fileName = this.getFileName( urlOrFiles[ i ] );

                if ( fileName.split( '.' ).pop() === 'gltf' ) {

                    glTFFileOrUrl = urlOrFiles[ i ];
                    break;

                }

            }

        }

        if ( !glTFFileOrUrl ) {

            Notify.warn( 'You did not provided any glTF file' );
            return Promise.resolve( null );

        }

        return this.loadFile( glTFFileOrUrl, 'gltf' );

    },

    requestFileFromReader: function ( file, fileType ) {

        var defer = Promise.defer();

        if ( !( file instanceof File ) )
            return defer.reject();

        var reader = new window.FileReader();
        reader.onload = function ( data ) {

            if ( fileType !== 'blob' )
                defer.resolve( data.target.result );
            else {
                var img = new window.Image();
                img.src = data.target.result;

                defer.resolve( img );
            }

        };

        if ( fileType === 'arraybuffer' )
            reader.readAsArrayBuffer( file );
        else if ( fileType === 'text' )
            reader.readAsText( file );
        else
            reader.readAsDataURL( file );

        return defer.promise;
    },

    loadFile: function ( urlOrFile, uri ) {

        if ( this._cachepromise[ uri ] )
            return this._cachepromise[ uri ];

        if ( !urlOrFile ) {

            Notify.warn( '\'' + uri + '\' file not found' );
            return Promise.resolve( null );

        }

        var fileType = this.getFileType( urlOrFile );

        if ( typeof ( urlOrFile ) === 'string' ) {

            // Checks whether the url is relative or absolute
            if ( uri !== 'gltf' ) {

                if ( urlOrFile.indexOf( 'http://' ) !== 0 && urlOrFile.indexOf( 'https://' ) !== 0 ||
                    urlOrFile.indexOf( 'www.' ) !== 0 ) {

                    urlOrFile = this._localPath + uri;

                }
            }

            // Checks whether the url poins toward an image
            if ( fileType === 'blob' ) {

                var imagePromise = this._inputImgReader.readImageURL( urlOrFile, {
                    imageLoadingUsePromise: true
                } );
                this._cachepromise[ uri ] = imagePromise;

                return imagePromise;

            }

            var promise = requestFile( urlOrFile, {
                responseType: fileType
            } ).then( function ( data ) {

                return data;

            } );
            this._cachepromise[ uri ] = promise;

            return promise;

        }

        var promiseFile = this.requestFileFromReader( urlOrFile, fileType );
        this._cachepromise[ uri ] = promiseFile;

        return promiseFile;
    },


    preloadFiles: function ( files ) {

        var keys = window.Object.keys( files );
        for ( var i = 0; i < keys.length; ++i ) {
            this._cachepromise[ keys[ i ] ] = Promise.resolve( files[ keys[ i ] ] );
        }

        this._loadedFiles = files;

    },

    /**
     * Loads a osg.BufferArray from a TypeArray obtained by using a glTF accessor.
     * No memory allocation is done, the result is a subarray obtained from a glTF binary file
     * @param  {Object} accessor
     * @param  {osg.BufferArray.ARRAY_BUFFER | osg.BufferArray.ELEMENT_ARRAY_BUFFER} type WebGL buffer type
     * @param  {TypedArray} BufferType specific TypedArray type used for extraction
     * @return {osg.BufferArray} OSG readable buffer contaning the extracted data
     */
    loadAccessorBuffer: function ( accessor, type ) {

        var json = this._loadedFiles.glTF;

        var bufferView = json.bufferViews[ accessor.bufferView ];
        var buffer = json.buffers[ bufferView.buffer ];

        var urlOrFile = this.findFileFromURI( this._files, buffer.uri );
        var filePromise = this.loadFile( urlOrFile, buffer.uri );

        var self = this;

        return filePromise.then( function ( data ) {

            if ( !data )
                return Promise.resolve( null );

            var TypedArray = GLTFLoader.WEBGL_COMPONENT_TYPES[ accessor.componentType ];
            var typedArray = null;

            if ( !self._bufferViewCache[ accessor.bufferView ] )
                self._bufferViewCache[ accessor.bufferView ] = data.slice( bufferView.byteOffset, bufferView.byteOffset + bufferView.byteLength );

            var bufferViewArray = self._bufferViewCache[ accessor.bufferView ];
            typedArray = new TypedArray( bufferViewArray, accessor.byteOffset, accessor.count * GLTFLoader.TYPE_TABLE[ accessor.type ] );

            if ( type )
                return Promise.resolve( new BufferArray( type, typedArray, GLTFLoader.TYPE_TABLE[ accessor.type ] ) );

            return Promise.resolve( typedArray );
        } );
    },

    findByKey: function ( obj, key ) {

        if ( !obj )
            return null;

        var keys = window.Object.keys( obj );
        for ( var i = 0; i < keys.length; ++i ) {

            if ( keys[ i ] === key )
                return obj[ keys[ i ] ];

        }

        return null;

    },

    registerUpdateCallback: function ( callbackName, node ) {

        var json = this._loadedFiles.glTF;

        var animationCallback = null;
        if ( json.nodes[ callbackName ].jointName )
            animationCallback = new UpdateBone();
        else
            animationCallback = new UpdateMatrixTransform();

        animationCallback.setName( callbackName );

        var translation = vec3.create();
        mat4.getTranslation( translation, node.getMatrix() );

        var rotationQuat = quat.create();
        mat4.getRotation( rotationQuat, node.getMatrix() );

        var scale = vec3.create();
        mat4.getScale( scale, node.getMatrix() );

        animationCallback.getStackedTransforms().push( new StackedTranslate( 'translation', translation ) );
        animationCallback.getStackedTransforms().push( new StackedQuaternion( 'rotation', rotationQuat ) );
        animationCallback.getStackedTransforms().push( new StackedScale( 'scale', scale ) );

        node.addUpdateCallback( animationCallback );
    },

    createTextureAndSetAttrib: function ( glTFTextureId, osgStateSet, location, uniform ) {

        var defer = Promise.defer();
        if ( !glTFTextureId ) return defer.resolve();

        var texture = new Texture();

        var json = this._loadedFiles.glTF;
        var glTFTexture = json.textures[ glTFTextureId ];

        if ( !glTFTexture ) return defer.resolve();

        var image = json.images[ glTFTexture.source ];

        if ( !image ) return defer.resolve();

        var urlOrFile = this.findFileFromURI( this._files, image.uri );

        this.loadFile( urlOrFile, image.uri ).then( function ( data ) {

            if ( !data ) return defer.resolve();

            texture.setImage( data, GLTFLoader.TEXTURE_FORMAT[ glTFTexture.format ] );
            texture.setFlipY( glTFTexture.flipY );
            var extras = glTFTexture.extras;
            if ( extras )
                osgStateSet.addUniform( Uniform.createInt1( extras.yUp ? 0 : 1, 'uFlipNormalY' ) );

            osgStateSet.setTextureAttributeAndModes( location, texture );

            if ( uniform )
                osgStateSet.addUniform( Uniform.createInt( location, uniform ) );

            return defer.resolve();

        } );

        return defer.promise;

    },

    /**
     * Creates a MatrixTransform node by using
     * glTF node's properties (matrix, translation, rotation, scale)
     * @param  {Object} glTFNode glTF node
     * @return {OSG.MatrixTransform} MatrixTransform node containing the glTF node transform
     */
    loadTransform: function ( glTFNode ) {

        var mat = mat4.create();

        // The transform is given under a matrix form
        if ( glTFNode.matrix ) {

            mat4.copy( mat, glTFNode.matrix );
            return mat;
        }

        // The transform is given under the form
        // translation, rotation, scale
        var scale = glTFNode.scale || vec3.ONE;
        var rot = glTFNode.rotation || quat.IDENTITY;
        var trans = glTFNode.translation || vec3.ZERO;

        mat4.fromRotationTranslationScale( mat, rot, trans, scale );
        return mat;
    },

    preprocessChannel: function ( glTFChannel, glTFAnim, glTFAnimParams ) {

        var json = this._loadedFiles.glTF;
        var promisesArray = [];

        var glTFSampler = glTFAnim.samplers[ glTFChannel.sampler ];

        var timeAccessor = json.accessors[ glTFAnimParams[ glTFSampler.input ] ];
        var valueAccessor = json.accessors[ glTFAnimParams[ glTFSampler.output ] ];

        var timePromise = this.loadAccessorBuffer( timeAccessor, null );
        var valuePromise = this.loadAccessorBuffer( valueAccessor, null );

        promisesArray.push( timePromise, valuePromise );

        var self = this;

        return Promise.all( promisesArray ).then( function ( timeAndValue ) {

            var timeKeys = timeAndValue[ 0 ];
            var valueKeys = timeAndValue[ 1 ];

            var osgChannel = null;

            if ( GLTFLoader.TYPE_TABLE[ valueAccessor.type ] === 4 ) {

                osgChannel = createQuatChannel( valueKeys, timeKeys, glTFChannel.target.id, glTFSampler.output, null );

            } else if ( GLTFLoader.TYPE_TABLE[ valueAccessor.type ] === 3 ) {

                osgChannel = createVec3Channel( valueKeys, timeKeys, glTFChannel.target.id, glTFSampler.output, null );

            }

            self._animatedNodes[ glTFChannel.target.id ] = true;

            return osgChannel;

        } );
    },

    createAnimationFromChannels: function ( channelsPromiseArray, animName ) {

        return Promise.all( channelsPromiseArray ).then( function ( channels ) {

            return animation.createAnimation( channels, animName );

        } );

    },

    /**
     * Loads all the solid animations registering
     * them in a BasicAnimationManager instance
     * @return {BasicAnimationManager} the animation manager containing the animations
     */
    preprocessAnimations: function () {

        var json = this._loadedFiles.glTF;

        if ( !json.animations )
            return Promise.resolve();

        var animPromiseArray = [];

        var animationsObjectKeys = window.Object.keys( json.animations );
        for ( var i = 0; i < animationsObjectKeys.length; ++i ) {

            var glTFAnim = json.animations[ animationsObjectKeys[ i ] ];
            var glTFAnimParams = glTFAnim.parameters;

            var channelsPromiseArray = [];
            // Creates each OSGJS channel
            for ( var j = 0; j < glTFAnim.channels.length; ++j ) {

                var glTFChannel = glTFAnim.channels[ j ];

                var osgChannel = this.preprocessChannel( glTFChannel, glTFAnim, glTFAnimParams );
                channelsPromiseArray.push( osgChannel );
            }

            var animPromise = this.createAnimationFromChannels( channelsPromiseArray, animationsObjectKeys[ i ] );
            animPromiseArray.push( animPromise );
        }

        var self = this;
        return Promise.all( animPromiseArray ).then( function ( animations ) {

            var animationManager = new BasicAnimationManager();
            animationManager.init( animations );

            self._basicAnimationManager = animationManager;

        } );

    },

    loadBone: function ( boneId, skin ) {

        var json = this._loadedFiles.glTF;
        var node = json.nodes[ boneId ];

        var self = this;

        var inverseBindMatricesAccessor = json.accessors[ skin.inverseBindMatrices ];
        var bonePromise = this.loadAccessorBuffer( inverseBindMatricesAccessor, null );
        return bonePromise.then( function ( data ) {

            // Creates the current bone
            // initializing it with initial pose
            for ( var i = 0; i < skin.jointNames.length; ++i ) {

                if ( skin.jointNames[ i ] === node.jointName ) break;

            }

            var boneNode = new Bone( node.jointName );
            var invMat = data.subarray( i * 16, i * 16 + 16 );
            boneNode.setInvBindMatrixInSkeletonSpace( invMat );

            self._bones[ boneId ] = boneNode;

            return boneNode;
        } );

    },

    buildInfluenceMap: function ( rootBoneId, skin ) {

        if ( this._skeletonToInfluenceMap[ rootBoneId ] )
            return;

        this._skeletonToInfluenceMap[ rootBoneId ] = {};

        for ( var j = 0; j < skin.jointNames.length; j++ ) {

            var jointName = skin.jointNames[ j ];
            this._skeletonToInfluenceMap[ rootBoneId ][ jointName ] = j;

        }

    },

    mapBonesToSkin: function () {

        var json = this._loadedFiles.glTF;

        var boneToSkin = {};

        // Maps each bone ID to its skin
        var skinsKeys = window.Object.keys( json.skins );
        for ( var i = 0; i < skinsKeys.length; ++i ) {

            var skin = json.skins[ skinsKeys[ i ] ];

            for ( var j = 0; j < skin.jointNames.length; ++j ) {

                var jName = skin.jointNames[ j ];

                var nodesKeys = window.Object.keys( json.nodes );
                for ( var k = 0; k < nodesKeys.length; ++k ) {

                    var node = json.nodes[ nodesKeys[ k ] ];

                    if ( node.jointName && node.jointName === jName )
                        boneToSkin[ nodesKeys[ k ] ] = skin;
                }
            }

        }

        return boneToSkin;

    },

    preprocessBones: function ( bonesToSkin ) {

        var json = this._loadedFiles.glTF;
        var nodesKeys = window.Object.keys( json.nodes );

        var promises = [];

        for ( var i = 0; i < nodesKeys.length; ++i ) {

            var boneId = nodesKeys[ i ];
            var boneNode = json.nodes[ boneId ];

            if ( !boneNode.jointName )
                continue;

            var bonePromise = this.loadBone( boneId, bonesToSkin[ boneId ] );
            promises.push( bonePromise );

        }

        return Promise.all( promises );

    },

    preprocessSkeletons: function () {

        var json = this._loadedFiles.glTF;

        if ( !json.skins )
            return Promise.resolve();

        var bonesToSkin = this.mapBonesToSkin();

        // Saves each skeleton in the skeleton maprep
        var nodesKeys = window.Object.keys( json.nodes );
        for ( var j = 0; j < nodesKeys.length; ++j ) {

            var nodeId = nodesKeys[ j ];
            var node = json.nodes[ nodeId ];
            var skin = json.skins[ node.skin ];

            if ( !node.skeletons )
                continue;

            for ( var i = 0; i < node.skeletons.length; ++i ) {

                var rootBoneId = null;
                var rootJointId = node.skeletons[ i ];

                for ( var k = 0; k < nodesKeys.length; ++k ) {

                    var subnodeId = nodesKeys[ k ];
                    var subnode = json.nodes[ subnodeId ];

                    if ( !subnode.jointName )
                        continue;

                    if ( subnode.jointName === rootJointId ) {

                        rootBoneId = subnodeId;
                        break;

                    }

                }

                if ( rootBoneId && !this._skeletons[ rootBoneId ] ) {

                    this._skeletons[ rootJointId ] = new Skeleton();

                    // Adds missing bone to the boneMap
                    bonesToSkin[ rootBoneId ] = skin;
                }

                this.buildInfluenceMap( rootJointId, skin );
            }
        }

        var bonesPromise = this.preprocessBones( bonesToSkin );

        return bonesPromise;
    },

    loadPBRMaterial: function ( materialId, glTFmaterial, geometryNode ) {

        var model = glTFmaterial.materialModel;
        var values = glTFmaterial.values;

        if ( !values ) return Promise.resolve();

        var osgStateSet = geometryNode.getOrCreateStateSet();

        var promises = [];
        if ( model === GLTFLoader.PBR_METAL_MODE ) {

            promises.push( this.createTextureAndSetAttrib( values.baseColorTexture, osgStateSet, GLTFLoader.ALBEDO_TEXTURE_UNIT, GLTFLoader.ALBEDO_UNIFORM ) );
            promises.push( this.createTextureAndSetAttrib( values.roughnessTexture, osgStateSet, GLTFLoader.ROUGHNESS_TEXTURE_UNIT, GLTFLoader.ROUGHNESS_UNIFORM ) );
            promises.push( this.createTextureAndSetAttrib( values.metallicTexture, osgStateSet, GLTFLoader.METALNESS_TEXTURE_UNIT, GLTFLoader.SPECULAR_UNIFORM ) );
            promises.push( this.createTextureAndSetAttrib( values.normalTexture, osgStateSet, GLTFLoader.NORMAL_TEXTURE_UNIT, GLTFLoader.NORMAL_UNIFORM ) );
            promises.push( this.createTextureAndSetAttrib( values.aoTexture, osgStateSet, GLTFLoader.AO_TEXTURE_UNIT, GLTFLoader.AO_UNIFORM ) );

        } else if ( model === GLTFLoader.PBR_SPEC_MODE ) {

            promises.push( this.createTextureAndSetAttrib( values.diffuseTexture, osgStateSet, GLTFLoader.DIFFUSE_TEXTURE_UNIT, GLTFLoader.ALBEDO_UNIFORM ) );
            promises.push( this.createTextureAndSetAttrib( values.glossinessTexture, osgStateSet, GLTFLoader.GLOSSINESS_TEXTURE_UNIT, GLTFLoader.ROUGHNESS_UNIFORM ) );
            promises.push( this.createTextureAndSetAttrib( values.specularTexture, osgStateSet, GLTFLoader.SPECULAR_TEXTURE_UNIT, GLTFLoader.SPECULAR_UNIFORM ) );
            promises.push( this.createTextureAndSetAttrib( values.normalTexture, osgStateSet, GLTFLoader.NORMAL_TEXTURE_UNIT, GLTFLoader.NORMAL_UNIFORM ) );
            promises.push( this.createTextureAndSetAttrib( values.aoTexture, osgStateSet, GLTFLoader.AO_TEXTURE_UNIT, GLTFLoader.AO_UNIFORM ) );

        }

        geometryNode.setUserData( {
            pbrWorklow: model
        } );

        geometryNode.stateset = osgStateSet;
        this._stateSetMap[ materialId ] = osgStateSet;

        return Promise.all( promises );
    },

    loadMaterial: function ( materialId, geometryNode ) {

        var json = this._loadedFiles.glTF;
        var glTFmaterial = json.materials[ materialId ];

        if ( this._stateSetMap[ materialId ] ) {
            geometryNode.stateset = this._stateSetMap[ materialId ];
            return Promise.resolve();
        }

        var extension = this.findByKey( glTFmaterial.extensions, GLTFLoader.PBR_EXTENSION );
        if ( extension )
            return this.loadPBRMaterial( materialId, extension, geometryNode );

        var values = glTFmaterial.values;
        if ( !values ) return Promise.resolve();

        // Handles basic material attributes
        var osgMaterial = new Material();
        var osgStateSet = geometryNode.getOrCreateStateSet();
        osgStateSet.setAttribute( osgMaterial );

        if ( values.ambient )
            osgMaterial.setAmbient( values.ambient );
        if ( values.emission )
            osgMaterial.setEmission( values.emission );
        if ( values.shininess )
            osgMaterial.setShininess( values.shininess );
        if ( values.specular )
            osgMaterial.setSpecular( values.specular );

        // Create a texture for the diffuse, if any
        if ( values.diffuse ) {

            if ( typeof ( values.diffuse ) !== 'string' )
                osgMaterial.setDiffuse( values.diffuse );
            else
                return this.createTextureAndSetAttrib( values.diffuse, osgStateSet, 0 );
        }

        geometryNode.stateset = osgStateSet;
        this._stateSetMap[ materialId ] = osgStateSet;

        return Promise.resolve();
    },

    createGeometry: function ( primitive, skeletonJointId ) {

        var json = this._loadedFiles.glTF;
        var promisesArray = [];

        // Builds the geometry from the extracted vertices & normals
        var geom = new Geometry();
        var rigOrGeom = geom;

        var cbSetBuffer = function ( name, buffer ) {

            if ( !buffer )
                return;

            this.getVertexAttributeList()[ name ] = buffer;

        };

        if ( skeletonJointId ) {

            rigOrGeom = new RigGeometry();
            rigOrGeom._boneNameID = this._skeletonToInfluenceMap[ skeletonJointId ];

        }

        var attributeWeight = function ( data ) {

            if ( !data )
                return;

            rigOrGeom.getAttributes().Weights = data;

            var elts = rigOrGeom.getAttributes().Weights.getElements();
            for ( var i = 0, l = elts.length / 4; i < l; ++i ) {
                var sum = elts[ i * 4 ] + elts[ i * 4 + 1 ] + elts[ i * 4 + 2 ] + elts[ i * 4 + 3 ];
                var correc = 1.0 / sum;
                elts[ i * 4 ] *= correc;
                elts[ i * 4 + 1 ] *= correc;
                elts[ i * 4 + 2 ] *= correc;
                elts[ i * 4 + 3 ] *= correc;
            }

        };

        // Registers each glTF primitive attributes
        // into a respective geometry attribute
        var attributesKeys = window.Object.keys( primitive.attributes );
        for ( var i = 0; i < attributesKeys.length; ++i ) {

            var accessor = json.accessors[ primitive.attributes[ attributesKeys[ i ] ] ];
            var promise = this.loadAccessorBuffer( accessor, BufferArray.ARRAY_BUFFER );

            if ( attributesKeys[ i ].indexOf( 'POSITION' ) !== -1 ) {

                promise.then( cbSetBuffer.bind( geom, 'Vertex' ) );

            } else if ( attributesKeys[ i ].indexOf( 'NORMAL' ) !== -1 ) {

                promise.then( cbSetBuffer.bind( geom, 'Normal' ) );

            } else if ( attributesKeys[ i ].indexOf( 'TANGENT' ) !== -1 ) {

                promise.then( cbSetBuffer.bind( geom, 'Tangent' ) );

            } else if ( attributesKeys[ i ].indexOf( 'JOINT' ) !== -1 ) {

                promise.then( cbSetBuffer.bind( rigOrGeom, 'Bones' ) );

            } else if ( attributesKeys[ i ].indexOf( 'WEIGHT' ) !== -1 ) {

                promise.then( attributeWeight );

            } else if ( attributesKeys[ i ].indexOf( 'TEXCOORD' ) !== -1 ) {

                var texCoordId = attributesKeys[ i ].substr( 9 );
                promise.then( cbSetBuffer.bind( geom, 'TexCoord' + texCoordId ) );

            }

            promisesArray.push( promise );

        }

        var indicesAccessor = json.accessors[ primitive.indices ];
        var indicesPromise = this.loadAccessorBuffer( indicesAccessor, BufferArray.ELEMENT_ARRAY_BUFFER );
        indicesPromise.then( function ( data ) {

            if ( !data )
                return;

            var osgPrimitive = new DrawElements( primitiveSet.TRIANGLES, data );
            geom.getPrimitives().push( osgPrimitive );

        } );

        promisesArray.push( indicesPromise );

        if ( primitive.material )
            promisesArray.push( this.loadMaterial( primitive.material, geom ) );

        return Promise.all( promisesArray ).then( function () {

            if ( skeletonJointId ) {

                rigOrGeom.setSourceGeometry( geom );
                rigOrGeom.mergeChildrenData();

                rigOrGeom.computeBoundingBox = geom.computeBoundingBox;
            }

            return rigOrGeom;

        } );
    },

    loadGLTFPrimitives: function ( meshId, resultMeshNode, skeletonJointId ) {

        var json = this._loadedFiles.glTF;
        var mesh = json.meshes[ meshId ];

        var primitives = mesh.primitives;

        var promisesArray = [];

        for ( var i = 0; i < primitives.length; ++i ) {

            var primitive = primitives[ i ];
            var promiseGeom = this.createGeometry( primitive, skeletonJointId );

            promisesArray.push( promiseGeom );

        }

        return Promise.all( promisesArray ).then( function ( geoms ) {

            for ( var i = 0; i < geoms.length; ++i )
                resultMeshNode.addChild( geoms[ i ] );

            return geoms;

        } );
    },

    loadGLTFNode: function ( nodeId, root ) {

        if ( this._visitedNodes[ nodeId ] )
            return Promise.resolve();

        var json = this._loadedFiles.glTF;
        var glTFNode = json.nodes[ nodeId ];
        var children = glTFNode.children;

        var i = 0;

        var currentNode = null;

        if ( glTFNode.jointName ) {

            currentNode = this._bones[ nodeId ];

        } else {

            currentNode = new MatrixTransform();

        }

        if ( glTFNode.jointName && this._skeletons[ glTFNode.jointName ] ) {

            var skeleton = this._skeletons[ glTFNode.jointName ];
            skeleton.addChild( currentNode );
            root.addChild( skeleton );

        }

        currentNode.setName( nodeId );
        mat4.copy( currentNode.getMatrix(), this.loadTransform( glTFNode ) );

        // Recurses on children before
        // processing the current node
        var promises = [];
        if ( children ) {

            for ( i = 0; i < children.length; ++i ) {

                var nodePromise = this.loadGLTFNode( children[ i ], currentNode );
                promises.push( nodePromise );

            }

        }

        // Loads meshes contained in the node
        // Adds RigGeometry to corresponding skeleton if any
        if ( glTFNode.meshes ) {

            for ( i = 0; i < glTFNode.meshes.length; ++i ) {

                var meshId = glTFNode.meshes[ i ];
                if ( !glTFNode.skeletons ) {

                    var geomPromise = this.loadGLTFPrimitives( meshId, currentNode, null );
                    promises.push( geomPromise );
                    continue;

                }

                for ( var j = 0; j < glTFNode.skeletons.length; ++j ) {

                    var rootJointId = glTFNode.skeletons[ j ];
                    var skeletonNode = this._skeletons[ rootJointId ];

                    var meshTransformNode = new MatrixTransform();
                    mat4.copy( meshTransformNode.getMatrix(), currentNode.getMatrix() );

                    var geomP = this.loadGLTFPrimitives( meshId, meshTransformNode, rootJointId );

                    skeletonNode.addChild( meshTransformNode );

                    promises.push( geomP );
                }

            }

        }

        // Loads solid animations
        // by adding an update callback
        if ( this._animatedNodes[ nodeId ] )
            this.registerUpdateCallback( nodeId, currentNode );

        if ( !this._skeletons[ nodeId ] )
            root.addChild( currentNode );

        this._visitedNodes[ nodeId ] = true;

        return Promise.all( promises );
    },

    readNodeURL: function ( files, options ) {

        var self = this;

        this.init();
        this._files = files;

        this._preloaded = options ? options.preloaded : null;
        if ( this._preloaded )
            this.preloadFiles( files );

        var glTFFilePromise = this.loadGLTFJson( this._files );

        // Creates the root node
        // adding a PI / 2 rotation arround the X-axis
        var root = new MatrixTransform();
        root.setName( 'root' );

        return glTFFilePromise.then( function ( glTFFile ) {

            self._loadedFiles.glTF = JSON.parse( glTFFile );
            var json = self._loadedFiles.glTF;

            if ( !json )
                return Promise.resolve( null );

            var promisesArray = [];

            // Preprocesses animations
            var animPromise = self.preprocessAnimations();

            // Preprocesses skin animations if any
            var skeletonPromise = self.preprocessSkeletons();

            promisesArray.push( skeletonPromise, animPromise );
            return Promise.all( promisesArray ).then( function () {

                var promises = [];
                // Loops through each scene
                // loading geometry nodes, transform nodes, etc...s
                var sceneKeys = window.Object.keys( json.scenes );

                for ( var i = 0; i < sceneKeys.length; ++i ) {

                    var scene = json.scenes[ sceneKeys[ i ] ];

                    if ( !scene )
                        continue;

                    for ( var j = 0; j < scene.nodes.length; ++j ) {

                        var p = self.loadGLTFNode( scene.nodes[ j ], root );
                        promises.push( p );

                    }
                }

                // Register the animation manager
                // if the glTF file contains animations
                if ( self._basicAnimationManager )
                    root.addUpdateCallback( self._basicAnimationManager );

                return Promise.all( promises ).then( function () {

                    return root;

                } );

            } );

        } );
    }

};

Registry.instance().addReaderWriter( 'gltf', new GLTFLoader() );

module.exports = GLTFLoader;
