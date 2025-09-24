// http://download.autodesk.com/us/systemdocs/help/2011/lustre/index.html?url=./files/WSc4e151a45a3b785a24c3d9a411df9298473-7ffd.htm,topicNumber=d0e9492

import {
	Loader,
	FileLoader,
	DataTexture,
	DataTexture3D,
	RGBFormat,
	UnsignedByteType,
	ClampToEdgeWrapping,
	LinearFilter,
} from '../../../build/three.module.js';

export class LUT3dlLoader extends Loader {

	load( url, onLoad, onProgress, onError ) {

		const loader = new FileLoader( this.manager );
		loader.setPath( this.path );
		loader.setResponseType( 'text' );
		loader.load( url, text => {

			try {

				onLoad( this.parse( text ) );

			} catch ( e ) {

				if ( onError ) {

					onError( e );

				} else {

					console.error( e );

				}

				this.manager.itemError( url );

			}

		}, onProgress, onError );

	}

	parse( str ) {

		// remove empty lines and comment lints
		str = str
			.replace( /^#.*?(\n|\r)/gm, '' )
			.replace( /^\s*?(\n|\r)/gm, '' )
			.trim();

		const lines = str.split( /[\n\r]+/g );

		// first line is the positions on the grid that are provided by the LUT
		const gridLines = lines[ 0 ].trim().split( /\s+/g ).map( e => parseFloat( e ) );
		const gridStep = gridLines[ 1 ] - gridLines[ 0 ];
		const size = gridLines.length;

		for ( let i = 1, l = gridLines.length; i < l; i ++ ) {

			if ( gridStep !== ( gridLines[ i ] - gridLines[ i - 1 ] ) ) {

				throw new Error( 'LUT3dlLoader: Inconsistent grid size not supported.' );

			}

		}

		const dataArray = new Array( size * size * size * 3 );
		let index = 0;
		let maxOutputValue = 0.0;
		for ( let i = 1, l = lines.length; i < l; i ++ ) {

			const line = lines[ i ].trim();
			const split = line.split( /\s/g );

			const r = parseFloat( split[ 0 ] );
			const g = parseFloat( split[ 1 ] );
			const b = parseFloat( split[ 2 ] );
			maxOutputValue = Math.max( maxOutputValue, r, g, b );

			const bLayer = index % size;
			const gLayer = Math.floor( index / size ) % size;
			const rLayer = Math.floor( index / ( size * size ) ) % size;

			// b grows first, then g, then r
			const pixelIndex = bLayer * size * size + gLayer * size + rLayer;
			dataArray[ 3 * pixelIndex + 0 ] = r;
			dataArray[ 3 * pixelIndex + 1 ] = g;
			dataArray[ 3 * pixelIndex + 2 ] = b;
			index += 1;

		}

		// Find the apparent bit depth of the stored RGB values and scale the
		// values to [ 0, 255 ].
		const bits = Math.ceil( Math.log2( maxOutputValue ) );
		const maxBitValue = Math.pow( 2.0, bits );
		for ( let i = 0, l = dataArray.length; i < l; i ++ ) {

			const val = dataArray[ i ];
			dataArray[ i ] = 255 * val / maxBitValue;

		}

		const data = new Uint8Array( dataArray );
		const texture = new DataTexture();
		texture.image.data = data;
		texture.image.width = size;
		texture.image.height = size * size;
		texture.format = RGBFormat;
		texture.type = UnsignedByteType;
		texture.magFilter = LinearFilter;
		texture.wrapS = ClampToEdgeWrapping;
		texture.wrapT = ClampToEdgeWrapping;
		texture.generateMipmaps = false;

		const texture3D = new DataTexture3D();
		texture3D.image.data = data;
		texture3D.image.width = size;
		texture3D.image.height = size;
		texture3D.image.depth = size;
		texture3D.format = RGBFormat;
		texture3D.type = UnsignedByteType;
		texture3D.magFilter = LinearFilter;
		texture3D.wrapS = ClampToEdgeWrapping;
		texture3D.wrapT = ClampToEdgeWrapping;
		texture3D.wrapR = ClampToEdgeWrapping;
		texture3D.generateMipmaps = false;

		return {
			size,
			texture,
			texture3D,
		};

	}

}
