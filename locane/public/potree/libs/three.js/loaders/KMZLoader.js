import {
	FileLoader,
	Group,
	Loader,
	LoadingManager
} from '../../../build/three.module.js';
import { ColladaLoader } from '../loaders/ColladaLoader.js';
import { JSZip } from '../libs/jszip.module.min.js';

var KMZLoader = function ( manager ) {

	Loader.call( this, manager );

};

KMZLoader.prototype = Object.assign( Object.create( Loader.prototype ), {

	constructor: KMZLoader,

	load: function ( url, onLoad, onProgress, onError ) {

		var scope = this;

		var loader = new FileLoader( scope.manager );
		loader.setPath( scope.path );
		loader.setResponseType( 'arraybuffer' );
		loader.setRequestHeader( scope.requestHeader );
		loader.setWithCredentials( scope.withCredentials );
		loader.load( url, function ( text ) {

			try {

				onLoad( scope.parse( text ) );

			} catch ( e ) {

				if ( onError ) {

					onError( e );

				} else {

					console.error( e );

				}

				scope.manager.itemError( url );

			}

		}, onProgress, onError );

	},

	parse: function ( data ) {

		function findFile( url ) {

			for ( var path in zip.files ) {

				if ( path.substr( - url.length ) === url ) {

					return zip.files[ path ];

				}

			}

		}

		var manager = new LoadingManager();
		manager.setURLModifier( function ( url ) {

			var image = findFile( url );

			if ( image ) {

				console.log( 'Loading', url );

				var blob = new Blob( [ image.asArrayBuffer() ], { type: 'application/octet-stream' } );
				return URL.createObjectURL( blob );

			}

			return url;

		} );

		//

		var zip = new JSZip( data ); // eslint-disable-line no-undef

		if ( zip.files[ 'doc.kml' ] ) {

			var xml = new DOMParser().parseFromString( zip.files[ 'doc.kml' ].asText(), 'application/xml' );

			var model = xml.querySelector( 'Placemark Model Link href' );

			if ( model ) {

				var loader = new ColladaLoader( manager );
				return loader.parse( zip.files[ model.textContent ].asText() );

			}

		} else {

			console.warn( 'KMZLoader: Missing doc.kml file.' );

			for ( var path in zip.files ) {

				var extension = path.split( '.' ).pop().toLowerCase();

				if ( extension === 'dae' ) {

					var loader = new ColladaLoader( manager );
					return loader.parse( zip.files[ path ].asText() );

				}

			}

		}

		console.error( 'KMZLoader: Couldn\'t find .dae file.' );
		return { scene: new Group() };

	}

} );

export { KMZLoader };
