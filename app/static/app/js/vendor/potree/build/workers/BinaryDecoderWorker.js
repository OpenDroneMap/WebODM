class Version{

	constructor(version){
		this.version = version;
		let vmLength = (version.indexOf('.') === -1) ? version.length : version.indexOf('.');
		this.versionMajor = parseInt(version.substr(0, vmLength));
		this.versionMinor = parseInt(version.substr(vmLength + 1));
		if (this.versionMinor.length === 0) {
			this.versionMinor = 0;
		}
	}

	newerThan(version){
		let v = new Version(version);

		if (this.versionMajor > v.versionMajor) {
			return true;
		} else if (this.versionMajor === v.versionMajor && this.versionMinor > v.versionMinor) {
			return true;
		} else {
			return false;
		}
	}

	equalOrHigher(version){
		let v = new Version(version);

		if (this.versionMajor > v.versionMajor) {
			return true;
		} else if (this.versionMajor === v.versionMajor && this.versionMinor >= v.versionMinor) {
			return true;
		} else {
			return false;
		}
	}

	upTo(version){
		return !this.newerThan(version);
	}

}

const PointAttributeNames = {
	POSITION_CARTESIAN: 0, // float x, y, z;
	COLOR_PACKED: 1, // byte r, g, b, a; 	I: [0,1]
	COLOR_FLOATS_1: 2, // float r, g, b; 	I: [0,1]
	COLOR_FLOATS_255: 3, // float r, g, b; 	I: [0,255]
	NORMAL_FLOATS: 4, // float x, y, z;
	FILLER: 5,
	INTENSITY: 6,
	CLASSIFICATION: 7,
	NORMAL_SPHEREMAPPED: 8,
	NORMAL_OCT16: 9,
	NORMAL: 10,
	RETURN_NUMBER: 11,
	NUMBER_OF_RETURNS: 12,
	SOURCE_ID: 13,
	INDICES: 14,
	SPACING: 15,
	GPS_TIME: 16,
};


/**
 * Some types of possible point attribute data formats
 *
 * @class
 */
const PointAttributeTypes = {
	DATA_TYPE_DOUBLE: {ordinal: 0, size: 8},
	DATA_TYPE_FLOAT: {ordinal: 1, size: 4},
	DATA_TYPE_INT8: {ordinal: 2, size: 1},
	DATA_TYPE_UINT8: {ordinal: 3, size: 1},
	DATA_TYPE_INT16: {ordinal: 4, size: 2},
	DATA_TYPE_UINT16: {ordinal: 5, size: 2},
	DATA_TYPE_INT32: {ordinal: 6, size: 4},
	DATA_TYPE_UINT32: {ordinal: 7, size: 4},
	DATA_TYPE_INT64: {ordinal: 8, size: 8},
	DATA_TYPE_UINT64: {ordinal: 9, size: 8}
};

let i = 0;
for (let obj in PointAttributeTypes) {
	PointAttributeTypes[i] = PointAttributeTypes[obj];
	i++;
}


class PointAttribute{
	
	constructor(name, type, numElements){
		this.name = name;
		this.type = type;
		this.numElements = numElements;
		this.byteSize = this.numElements * this.type.size;
	}

}
PointAttribute.POSITION_CARTESIAN = new PointAttribute(
	PointAttributeNames.POSITION_CARTESIAN,
	PointAttributeTypes.DATA_TYPE_FLOAT, 3);

PointAttribute.RGBA_PACKED = new PointAttribute(
	PointAttributeNames.COLOR_PACKED,
	PointAttributeTypes.DATA_TYPE_INT8, 4);

PointAttribute.COLOR_PACKED = PointAttribute.RGBA_PACKED;

PointAttribute.RGB_PACKED = new PointAttribute(
	PointAttributeNames.COLOR_PACKED,
	PointAttributeTypes.DATA_TYPE_INT8, 3);

PointAttribute.NORMAL_FLOATS = new PointAttribute(
	PointAttributeNames.NORMAL_FLOATS,
	PointAttributeTypes.DATA_TYPE_FLOAT, 3);

PointAttribute.FILLER_1B = new PointAttribute(
	PointAttributeNames.FILLER,
	PointAttributeTypes.DATA_TYPE_UINT8, 1);

PointAttribute.INTENSITY = new PointAttribute(
	PointAttributeNames.INTENSITY,
	PointAttributeTypes.DATA_TYPE_UINT16, 1);

PointAttribute.CLASSIFICATION = new PointAttribute(
	PointAttributeNames.CLASSIFICATION,
	PointAttributeTypes.DATA_TYPE_UINT8, 1);

PointAttribute.NORMAL_SPHEREMAPPED = new PointAttribute(
	PointAttributeNames.NORMAL_SPHEREMAPPED,
	PointAttributeTypes.DATA_TYPE_UINT8, 2);

PointAttribute.NORMAL_OCT16 = new PointAttribute(
	PointAttributeNames.NORMAL_OCT16,
	PointAttributeTypes.DATA_TYPE_UINT8, 2);

PointAttribute.NORMAL = new PointAttribute(
	PointAttributeNames.NORMAL,
	PointAttributeTypes.DATA_TYPE_FLOAT, 3);
	
PointAttribute.RETURN_NUMBER = new PointAttribute(
	PointAttributeNames.RETURN_NUMBER,
	PointAttributeTypes.DATA_TYPE_UINT8, 1);
	
PointAttribute.NUMBER_OF_RETURNS = new PointAttribute(
	PointAttributeNames.NUMBER_OF_RETURNS,
	PointAttributeTypes.DATA_TYPE_UINT8, 1);
	
PointAttribute.SOURCE_ID = new PointAttribute(
	PointAttributeNames.SOURCE_ID,
	PointAttributeTypes.DATA_TYPE_UINT16, 1);

PointAttribute.INDICES = new PointAttribute(
	PointAttributeNames.INDICES,
	PointAttributeTypes.DATA_TYPE_UINT32, 1);

PointAttribute.SPACING = new PointAttribute(
	PointAttributeNames.SPACING,
	PointAttributeTypes.DATA_TYPE_FLOAT, 1);

PointAttribute.GPS_TIME = new PointAttribute(
	PointAttributeNames.GPS_TIME,
	PointAttributeTypes.DATA_TYPE_DOUBLE, 1);

/* global onmessage:true postMessage:false */
/* exported onmessage */
// http://jsperf.com/uint8array-vs-dataview3/3
function CustomView (buffer) {
	this.buffer = buffer;
	this.u8 = new Uint8Array(buffer);

	let tmp = new ArrayBuffer(8);
	let tmpf = new Float32Array(tmp);
	let tmpd = new Float64Array(tmp);
	let tmpu8 = new Uint8Array(tmp);

	this.getUint32 = function (i) {
		return (this.u8[i + 3] << 24) | (this.u8[i + 2] << 16) | (this.u8[i + 1] << 8) | this.u8[i];
	};

	this.getUint16 = function (i) {
		return (this.u8[i + 1] << 8) | this.u8[i];
	};

	this.getFloat32 = function (i) {
		tmpu8[0] = this.u8[i + 0];
		tmpu8[1] = this.u8[i + 1];
		tmpu8[2] = this.u8[i + 2];
		tmpu8[3] = this.u8[i + 3];

		return tmpf[0];
	};

	this.getFloat64 = function (i) {
		tmpu8[0] = this.u8[i + 0];
		tmpu8[1] = this.u8[i + 1];
		tmpu8[2] = this.u8[i + 2];
		tmpu8[3] = this.u8[i + 3];
		tmpu8[4] = this.u8[i + 4];
		tmpu8[5] = this.u8[i + 5];
		tmpu8[6] = this.u8[i + 6];
		tmpu8[7] = this.u8[i + 7];

		return tmpd[0];
	};

	this.getUint8 = function (i) {
		return this.u8[i];
	};
}

Potree = {};

onmessage = function (event) {

	performance.mark("binary-decoder-start");
	
	let buffer = event.data.buffer;
	let pointAttributes = event.data.pointAttributes;
	let numPoints = buffer.byteLength / pointAttributes.byteSize;
	let cv = new CustomView(buffer);
	let version = new Version(event.data.version);
	let nodeOffset = event.data.offset;
	let scale = event.data.scale;
	let spacing = event.data.spacing;
	let hasChildren = event.data.hasChildren;
	let name = event.data.name;
	
	let tightBoxMin = [ Number.POSITIVE_INFINITY, Number.POSITIVE_INFINITY, Number.POSITIVE_INFINITY ];
	let tightBoxMax = [ Number.NEGATIVE_INFINITY, Number.NEGATIVE_INFINITY, Number.NEGATIVE_INFINITY ];
	let mean = [0, 0, 0];
	

	let attributeBuffers = {};
	let inOffset = 0;
	for (let pointAttribute of pointAttributes.attributes) {
		
		if (pointAttribute.name === PointAttribute.POSITION_CARTESIAN.name) {
			let buff = new ArrayBuffer(numPoints * 4 * 3);
			let positions = new Float32Array(buff);
		
			for (let j = 0; j < numPoints; j++) {
				let x, y, z;

				if (version.newerThan('1.3')) {
					x = (cv.getUint32(inOffset + j * pointAttributes.byteSize + 0, true) * scale);
					y = (cv.getUint32(inOffset + j * pointAttributes.byteSize + 4, true) * scale);
					z = (cv.getUint32(inOffset + j * pointAttributes.byteSize + 8, true) * scale);
				} else {
					x = cv.getFloat32(j * pointAttributes.byteSize + 0, true) + nodeOffset[0];
					y = cv.getFloat32(j * pointAttributes.byteSize + 4, true) + nodeOffset[1];
					z = cv.getFloat32(j * pointAttributes.byteSize + 8, true) + nodeOffset[2];
				}

				positions[3 * j + 0] = x;
				positions[3 * j + 1] = y;
				positions[3 * j + 2] = z;

				mean[0] += x / numPoints;
				mean[1] += y / numPoints;
				mean[2] += z / numPoints;

				tightBoxMin[0] = Math.min(tightBoxMin[0], x);
				tightBoxMin[1] = Math.min(tightBoxMin[1], y);
				tightBoxMin[2] = Math.min(tightBoxMin[2], z);

				tightBoxMax[0] = Math.max(tightBoxMax[0], x);
				tightBoxMax[1] = Math.max(tightBoxMax[1], y);
				tightBoxMax[2] = Math.max(tightBoxMax[2], z);
			}

			attributeBuffers[pointAttribute.name] = { buffer: buff, attribute: pointAttribute };
		} else if (pointAttribute.name === PointAttribute.COLOR_PACKED.name) {
			let buff = new ArrayBuffer(numPoints * 4);
			let colors = new Uint8Array(buff);

			for (let j = 0; j < numPoints; j++) {
				colors[4 * j + 0] = cv.getUint8(inOffset + j * pointAttributes.byteSize + 0);
				colors[4 * j + 1] = cv.getUint8(inOffset + j * pointAttributes.byteSize + 1);
				colors[4 * j + 2] = cv.getUint8(inOffset + j * pointAttributes.byteSize + 2);
			}

			attributeBuffers[pointAttribute.name] = { buffer: buff, attribute: pointAttribute };
		} else if (pointAttribute.name === PointAttribute.INTENSITY.name) {
			let buff = new ArrayBuffer(numPoints * 4);
			let intensities = new Float32Array(buff);

			for (let j = 0; j < numPoints; j++) {
				let intensity = cv.getUint16(inOffset + j * pointAttributes.byteSize, true);
				intensities[j] = intensity;
			}

			attributeBuffers[pointAttribute.name] = { buffer: buff, attribute: pointAttribute };
		} else if (pointAttribute.name === PointAttribute.CLASSIFICATION.name) {
			let buff = new ArrayBuffer(numPoints);
			let classifications = new Uint8Array(buff);

			for (let j = 0; j < numPoints; j++) {
				let classification = cv.getUint8(inOffset + j * pointAttributes.byteSize);
				classifications[j] = classification;
			}

			attributeBuffers[pointAttribute.name] = { buffer: buff, attribute: pointAttribute };
		} else if (pointAttribute.name === PointAttribute.RETURN_NUMBER.name) {
			let buff = new ArrayBuffer(numPoints);
			let returnNumbers = new Uint8Array(buff);

			for (let j = 0; j < numPoints; j++) {
				let returnNumber = cv.getUint8(inOffset + j * pointAttributes.byteSize);
				returnNumbers[j] = returnNumber;
			}

			attributeBuffers[pointAttribute.name] = { buffer: buff, attribute: pointAttribute };
		} else if (pointAttribute.name === PointAttribute.NUMBER_OF_RETURNS.name) {
			let buff = new ArrayBuffer(numPoints);
			let numberOfReturns = new Uint8Array(buff);

			for (let j = 0; j < numPoints; j++) {
				let numberOfReturn = cv.getUint8(inOffset + j * pointAttributes.byteSize);
				numberOfReturns[j] = numberOfReturn;
			}

			attributeBuffers[pointAttribute.name] = { buffer: buff, attribute: pointAttribute };
		} else if (pointAttribute.name === PointAttribute.SOURCE_ID.name) {
			let buff = new ArrayBuffer(numPoints * 2);
			let sourceIDs = new Uint16Array(buff);

			for (let j = 0; j < numPoints; j++) {
				let sourceID = cv.getUint16(inOffset + j * pointAttributes.byteSize);
				sourceIDs[j] = sourceID;
			}

			attributeBuffers[pointAttribute.name] = { buffer: buff, attribute: pointAttribute };
		} else if (pointAttribute.name === PointAttribute.NORMAL_SPHEREMAPPED.name) {
			let buff = new ArrayBuffer(numPoints * 4 * 3);
			let normals = new Float32Array(buff);

			for (let j = 0; j < numPoints; j++) {
				let bx = cv.getUint8(inOffset + j * pointAttributes.byteSize + 0);
				let by = cv.getUint8(inOffset + j * pointAttributes.byteSize + 1);

				let ex = bx / 255;
				let ey = by / 255;

				let nx = ex * 2 - 1;
				let ny = ey * 2 - 1;
				let nz = 1;
				let nw = -1;

				let l = (nx * (-nx)) + (ny * (-ny)) + (nz * (-nw));
				nz = l;
				nx = nx * Math.sqrt(l);
				ny = ny * Math.sqrt(l);

				nx = nx * 2;
				ny = ny * 2;
				nz = nz * 2 - 1;

				normals[3 * j + 0] = nx;
				normals[3 * j + 1] = ny;
				normals[3 * j + 2] = nz;
			}

			attributeBuffers[pointAttribute.name] = { buffer: buff, attribute: pointAttribute };
		} else if (pointAttribute.name === PointAttribute.NORMAL_OCT16.name) {
			let buff = new ArrayBuffer(numPoints * 4 * 3);
			let normals = new Float32Array(buff);

			for (let j = 0; j < numPoints; j++) {
				let bx = cv.getUint8(inOffset + j * pointAttributes.byteSize + 0);
				let by = cv.getUint8(inOffset + j * pointAttributes.byteSize + 1);

				let u = (bx / 255) * 2 - 1;
				let v = (by / 255) * 2 - 1;

				let z = 1 - Math.abs(u) - Math.abs(v);

				let x = 0;
				let y = 0;
				if (z >= 0) {
					x = u;
					y = v;
				} else {
					x = -(v / Math.sign(v) - 1) / Math.sign(u);
					y = -(u / Math.sign(u) - 1) / Math.sign(v);
				}

				let length = Math.sqrt(x * x + y * y + z * z);
				x = x / length;
				y = y / length;
				z = z / length;
				
				normals[3 * j + 0] = x;
				normals[3 * j + 1] = y;
				normals[3 * j + 2] = z;
			}

			attributeBuffers[pointAttribute.name] = { buffer: buff, attribute: pointAttribute };
		} else if (pointAttribute.name === PointAttribute.NORMAL.name) {
			let buff = new ArrayBuffer(numPoints * 4 * 3);
			let normals = new Float32Array(buff);

			for (let j = 0; j < numPoints; j++) {
				let x = cv.getFloat32(inOffset + j * pointAttributes.byteSize + 0, true);
				let y = cv.getFloat32(inOffset + j * pointAttributes.byteSize + 4, true);
				let z = cv.getFloat32(inOffset + j * pointAttributes.byteSize + 8, true);
				
				normals[3 * j + 0] = x;
				normals[3 * j + 1] = y;
				normals[3 * j + 2] = z;
			}

			attributeBuffers[pointAttribute.name] = { buffer: buff, attribute: pointAttribute };
		} else if (pointAttribute.name === PointAttribute.GPS_TIME.name) {
			let buff = new ArrayBuffer(numPoints * 8);
			let gpstimes = new Float64Array(buff);

			for(let j = 0; j < numPoints; j++){
				let gpstime = cv.getFloat64(inOffset + j * pointAttributes.byteSize, true);
				gpstimes[j] = gpstime;
			}
			attributeBuffers[pointAttribute.name] = { buffer: buff, attribute: pointAttribute };
		}

		inOffset += pointAttribute.byteSize;
	}

	// Convert GPS time from double (unsupported by WebGL) to origin-aligned floats
	if(attributeBuffers[PointAttribute.GPS_TIME.name]){ 
		let attribute = attributeBuffers[PointAttribute.GPS_TIME.name];
		let sourceF64 = new Float64Array(attribute.buffer);
		let target = new ArrayBuffer(numPoints * 4);
		let targetF32 = new Float32Array(target);

		let min = Infinity;
		let max = -Infinity;
		for(let i = 0; i < numPoints; i++){
			let gpstime = sourceF64[i];

			min = Math.min(min, gpstime);
			max = Math.max(max, gpstime);
		}

		for(let i = 0; i < numPoints; i++){
			let gpstime = sourceF64[i];
			targetF32[i] = gpstime - min;
		}

		attributeBuffers[PointAttribute.GPS_TIME.name] = { 
			buffer: target, 
			attribute: PointAttribute.GPS_TIME,
			offset: min,
			range: max - min};
	}


	{ // add indices
		let buff = new ArrayBuffer(numPoints * 4);
		let indices = new Uint32Array(buff);

		for (let i = 0; i < numPoints; i++) {
			indices[i] = i;
		}
		
		attributeBuffers[PointAttribute.INDICES.name] = { buffer: buff, attribute: PointAttribute.INDICES };
	}

	performance.mark("binary-decoder-end");

	//{ // print timings
	//	//performance.measure("spacing", "spacing-start", "spacing-end");
	//	performance.measure("binary-decoder", "binary-decoder-start", "binary-decoder-end");
	//	let measure = performance.getEntriesByType("measure")[0];
	//	let dpp = 1000 * measure.duration / numPoints;
	//	let debugMessage = `${measure.duration.toFixed(3)} ms, ${numPoints} points, ${dpp.toFixed(3)} µs / point`;
	//	console.log(debugMessage);
	//}

	performance.clearMarks();
	performance.clearMeasures();

	let message = {
		buffer: buffer,
		mean: mean,
		attributeBuffers: attributeBuffers,
		tightBoundingBox: { min: tightBoxMin, max: tightBoxMax },
		//estimatedSpacing: estimatedSpacing,
	};

	let transferables = [];
	for (let property in message.attributeBuffers) {
		transferables.push(message.attributeBuffers[property].buffer);
	}
	transferables.push(buffer);

	postMessage(message, transferables);
};
