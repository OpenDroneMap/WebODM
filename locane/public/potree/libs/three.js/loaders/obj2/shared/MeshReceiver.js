/**
 * Development repository: https://github.com/kaisalmen/WWOBJLoader
 */

import {
	BufferAttribute,
	BufferGeometry,
	LineSegments,
	Mesh,
	Points
} from '../../../../../build/three.module.js';


/**
 *
 * @param {MaterialHandler} materialHandler
 * @constructor
 */
const MeshReceiver = function ( materialHandler ) {

	this.logging = {
		enabled: false,
		debug: false
	};

	this.callbacks = {
		onProgress: null,
		onMeshAlter: null
	};
	this.materialHandler = materialHandler;

};

MeshReceiver.prototype = {

	constructor: MeshReceiver,

	/**
	 * Enable or disable logging in general (except warn and error), plus enable or disable debug logging.
	 *
	 * @param {boolean} enabled True or false.
	 * @param {boolean} debug True or false.
	 */
	setLogging:	function ( enabled, debug ) {

		this.logging.enabled = enabled === true;
		this.logging.debug = debug === true;

	},

	/**
	 *
	 * @param {Function} onProgress
	 * @param {Function} onMeshAlter
	 * @private
	 */
	_setCallbacks: function ( onProgress, onMeshAlter ) {

		if ( onProgress !== null && onProgress !== undefined && onProgress instanceof Function ) {

			this.callbacks.onProgress = onProgress;

		}

		if ( onMeshAlter !== null && onMeshAlter !== undefined && onMeshAlter instanceof Function ) {

			this.callbacks.onMeshAlter = onMeshAlter;

		}

	},

	/**
	 * Builds one or multiple meshes from the data described in the payload (buffers, params, material info).
	 *
	 * @param {Object} meshPayload Raw mesh description (buffers, params, materials) used to build one to many meshes.
	 * @returns {Mesh[]} mesh Array of {@link Mesh}
	 */
	buildMeshes: function ( meshPayload ) {

		const meshName = meshPayload.params.meshName;
		const buffers = meshPayload.buffers;

		const bufferGeometry = new BufferGeometry();
		if ( buffers.vertices !== undefined && buffers.vertices !== null ) {

			bufferGeometry.setAttribute( 'position', new BufferAttribute( new Float32Array( buffers.vertices ), 3 ) );

		}

		if ( buffers.indices !== undefined && buffers.indices !== null ) {

			bufferGeometry.setIndex( new BufferAttribute( new Uint32Array( buffers.indices ), 1 ) );

		}

		if ( buffers.colors !== undefined && buffers.colors !== null ) {

			bufferGeometry.setAttribute( 'color', new BufferAttribute( new Float32Array( buffers.colors ), 3 ) );

		}

		if ( buffers.normals !== undefined && buffers.normals !== null ) {

			bufferGeometry.setAttribute( 'normal', new BufferAttribute( new Float32Array( buffers.normals ), 3 ) );

		} else {

			bufferGeometry.computeVertexNormals();

		}

		if ( buffers.uvs !== undefined && buffers.uvs !== null ) {

			bufferGeometry.setAttribute( 'uv', new BufferAttribute( new Float32Array( buffers.uvs ), 2 ) );

		}

		if ( buffers.skinIndex !== undefined && buffers.skinIndex !== null ) {

			bufferGeometry.setAttribute( 'skinIndex', new BufferAttribute( new Uint16Array( buffers.skinIndex ), 4 ) );

		}

		if ( buffers.skinWeight !== undefined && buffers.skinWeight !== null ) {

			bufferGeometry.setAttribute( 'skinWeight', new BufferAttribute( new Float32Array( buffers.skinWeight ), 4 ) );

		}

		let material, materialName, key;
		const materialNames = meshPayload.materials.materialNames;
		const createMultiMaterial = meshPayload.materials.multiMaterial;
		const multiMaterials = [];

		for ( key in materialNames ) {

			materialName = materialNames[ key ];
			material = this.materialHandler.getMaterial( materialName );
			if ( createMultiMaterial ) multiMaterials.push( material );

		}

		if ( createMultiMaterial ) {

			material = multiMaterials;
			const materialGroups = meshPayload.materials.materialGroups;
			let materialGroup;
			for ( key in materialGroups ) {

				materialGroup = materialGroups[ key ];
				bufferGeometry.addGroup( materialGroup.start, materialGroup.count, materialGroup.index );

			}

		}

		const meshes = [];
		let mesh;
		let callbackOnMeshAlterResult;
		let useOrgMesh = true;
		const geometryType = meshPayload.geometryType === null ? 0 : meshPayload.geometryType;

		if ( this.callbacks.onMeshAlter ) {

			callbackOnMeshAlterResult = this.callbacks.onMeshAlter(
				{
					detail: {
						meshName: meshName,
						bufferGeometry: bufferGeometry,
						material: material,
						geometryType: geometryType
					}
				}
			);

		}

		// here LoadedMeshUserOverride is required to be provided by the callback used to alter the results
		if ( callbackOnMeshAlterResult ) {

			if ( callbackOnMeshAlterResult.isDisregardMesh() ) {

				useOrgMesh = false;

			} else if ( callbackOnMeshAlterResult.providesAlteredMeshes() ) {

				for ( const i in callbackOnMeshAlterResult.meshes ) {

					meshes.push( callbackOnMeshAlterResult.meshes[ i ] );

				}

				useOrgMesh = false;

			}

		}

		if ( useOrgMesh ) {

			if ( meshPayload.computeBoundingSphere ) bufferGeometry.computeBoundingSphere();
			if ( geometryType === 0 ) {

				mesh = new Mesh( bufferGeometry, material );

			} else if ( geometryType === 1 ) {

				mesh = new LineSegments( bufferGeometry, material );

			} else {

				mesh = new Points( bufferGeometry, material );

			}

			mesh.name = meshName;
			meshes.push( mesh );

		}

		let progressMessage = meshPayload.params.meshName;
		if ( meshes.length > 0 ) {

			const meshNames = [];
			for ( const i in meshes ) {

				mesh = meshes[ i ];
				meshNames[ i ] = mesh.name;

			}

			progressMessage += ': Adding mesh(es) (' + meshNames.length + ': ' + meshNames + ') from input mesh: ' + meshName;
			progressMessage += ' (' + ( meshPayload.progress.numericalValue * 100 ).toFixed( 2 ) + '%)';

		} else {

			progressMessage += ': Not adding mesh: ' + meshName;
			progressMessage += ' (' + ( meshPayload.progress.numericalValue * 100 ).toFixed( 2 ) + '%)';

		}

		if ( this.callbacks.onProgress ) {

			this.callbacks.onProgress( 'progress', progressMessage, meshPayload.progress.numericalValue );

		}

		return meshes;

	}

};

/**
 * Object to return by callback onMeshAlter. Used to disregard a certain mesh or to return one to many meshes.
 * @class
 *
 * @param {boolean} disregardMesh=false Tell implementation to completely disregard this mesh
 * @param {boolean} disregardMesh=false Tell implementation that mesh(es) have been altered or added
 */
const LoadedMeshUserOverride = function ( disregardMesh, alteredMesh ) {

	this.disregardMesh = disregardMesh === true;
	this.alteredMesh = alteredMesh === true;
	this.meshes = [];

};


LoadedMeshUserOverride.prototype = {

	constructor: LoadedMeshUserOverride,

	/**
	 * Add a mesh created within callback.
	 *
	 * @param {Mesh} mesh
	 */
	addMesh: function ( mesh ) {

		this.meshes.push( mesh );
		this.alteredMesh = true;

	},

	/**
	 * Answers if mesh shall be disregarded completely.
	 *
	 * @returns {boolean}
	 */
	isDisregardMesh: function () {

		return this.disregardMesh;

	},

	/**
	 * Answers if new mesh(es) were created.
	 *
	 * @returns {boolean}
	 */
	providesAlteredMeshes: function () {

		return this.alteredMesh;

	}
};

export {
	MeshReceiver,
	LoadedMeshUserOverride
};
