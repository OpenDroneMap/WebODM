import {
	InstancedInterleavedBuffer,
	InterleavedBufferAttribute,
	Line3,
	MathUtils,
	Matrix4,
	Mesh,
	Vector3,
	Vector4
} from '../build/three.module.js';
import { LineSegmentsGeometry } from '../lines/LineSegmentsGeometry.js';
import { LineMaterial } from '../lines/LineMaterial.js';

var LineSegments2 = function ( geometry, material ) {

	if ( geometry === undefined ) geometry = new LineSegmentsGeometry();
	if ( material === undefined ) material = new LineMaterial( { color: Math.random() * 0xffffff } );

	Mesh.call( this, geometry, material );

	this.type = 'LineSegments2';

};

LineSegments2.prototype = Object.assign( Object.create( Mesh.prototype ), {

	constructor: LineSegments2,

	isLineSegments2: true,

	computeLineDistances: ( function () { // for backwards-compatability, but could be a method of LineSegmentsGeometry...

		var start = new Vector3();
		var end = new Vector3();

		return function computeLineDistances() {

			var geometry = this.geometry;

			var instanceStart = geometry.attributes.instanceStart;
			var instanceEnd = geometry.attributes.instanceEnd;
			var lineDistances = new Float32Array( 2 * instanceStart.data.count );

			for ( var i = 0, j = 0, l = instanceStart.data.count; i < l; i ++, j += 2 ) {

				start.fromBufferAttribute( instanceStart, i );
				end.fromBufferAttribute( instanceEnd, i );

				lineDistances[ j ] = ( j === 0 ) ? 0 : lineDistances[ j - 1 ];
				lineDistances[ j + 1 ] = lineDistances[ j ] + start.distanceTo( end );

			}

			var instanceDistanceBuffer = new InstancedInterleavedBuffer( lineDistances, 2, 1 ); // d0, d1

			geometry.setAttribute( 'instanceDistanceStart', new InterleavedBufferAttribute( instanceDistanceBuffer, 1, 0 ) ); // d0
			geometry.setAttribute( 'instanceDistanceEnd', new InterleavedBufferAttribute( instanceDistanceBuffer, 1, 1 ) ); // d1

			return this;

		};

	}() ),

	raycast: ( function () {

		var start = new Vector4();
		var end = new Vector4();

		var ssOrigin = new Vector4();
		var ssOrigin3 = new Vector3();
		var mvMatrix = new Matrix4();
		var line = new Line3();
		var closestPoint = new Vector3();

		return function raycast( raycaster, intersects ) {

			if ( raycaster.camera === null ) {

				console.error( 'LineSegments2: "Raycaster.camera" needs to be set in order to raycast against LineSegments2.' );

			}

			var threshold = ( raycaster.params.Line2 !== undefined ) ? raycaster.params.Line2.threshold || 0 : 0;

			var ray = raycaster.ray;
			var camera = raycaster.camera;
			var projectionMatrix = camera.projectionMatrix;

			var geometry = this.geometry;
			var material = this.material;
			var resolution = material.resolution;
			var lineWidth = material.linewidth + threshold;

			var instanceStart = geometry.attributes.instanceStart;
			var instanceEnd = geometry.attributes.instanceEnd;

			// pick a point 1 unit out along the ray to avoid the ray origin
			// sitting at the camera origin which will cause "w" to be 0 when
			// applying the projection matrix.
			ray.at( 1, ssOrigin );

			// ndc space [ - 1.0, 1.0 ]
			ssOrigin.w = 1;
			ssOrigin.applyMatrix4( camera.matrixWorldInverse );
			ssOrigin.applyMatrix4( projectionMatrix );
			ssOrigin.multiplyScalar( 1 / ssOrigin.w );

			// screen space
			ssOrigin.x *= resolution.x / 2;
			ssOrigin.y *= resolution.y / 2;
			ssOrigin.z = 0;

			ssOrigin3.copy( ssOrigin );

			var matrixWorld = this.matrixWorld;
			mvMatrix.multiplyMatrices( camera.matrixWorldInverse, matrixWorld );

			for ( var i = 0, l = instanceStart.count; i < l; i ++ ) {

				start.fromBufferAttribute( instanceStart, i );
				end.fromBufferAttribute( instanceEnd, i );

				start.w = 1;
				end.w = 1;

				// camera space
				start.applyMatrix4( mvMatrix );
				end.applyMatrix4( mvMatrix );

				// clip space
				start.applyMatrix4( projectionMatrix );
				end.applyMatrix4( projectionMatrix );

				// ndc space [ - 1.0, 1.0 ]
				start.multiplyScalar( 1 / start.w );
				end.multiplyScalar( 1 / end.w );

				// skip the segment if it's outside the camera near and far planes
				var isBehindCameraNear = start.z < - 1 && end.z < - 1;
				var isPastCameraFar = start.z > 1 && end.z > 1;
				if ( isBehindCameraNear || isPastCameraFar ) {

					continue;

				}

				// screen space
				start.x *= resolution.x / 2;
				start.y *= resolution.y / 2;

				end.x *= resolution.x / 2;
				end.y *= resolution.y / 2;

				// create 2d segment
				line.start.copy( start );
				line.start.z = 0;

				line.end.copy( end );
				line.end.z = 0;

				// get closest point on ray to segment
				var param = line.closestPointToPointParameter( ssOrigin3, true );
				line.at( param, closestPoint );

				// check if the intersection point is within clip space
				var zPos = MathUtils.lerp( start.z, end.z, param );
				var isInClipSpace = zPos >= - 1 && zPos <= 1;

				var isInside = ssOrigin3.distanceTo( closestPoint ) < lineWidth * 0.5;

				if ( isInClipSpace && isInside ) {

					line.start.fromBufferAttribute( instanceStart, i );
					line.end.fromBufferAttribute( instanceEnd, i );

					line.start.applyMatrix4( matrixWorld );
					line.end.applyMatrix4( matrixWorld );

					var pointOnLine = new Vector3();
					var point = new Vector3();

					ray.distanceSqToSegment( line.start, line.end, point, pointOnLine );

					intersects.push( {

						point: point,
						pointOnLine: pointOnLine,
						distance: ray.origin.distanceTo( point ),

						object: this,
						face: null,
						faceIndex: i,
						uv: null,
						uv2: null,

					} );

				}

			}

		};

	}() )

} );

export { LineSegments2 };
