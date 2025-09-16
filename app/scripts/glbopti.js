const { NodeIO, Extension } = require('@gltf-transform/core');
const { KHRONOS_EXTENSIONS } = require('@gltf-transform/extensions');
const { textureCompress, simplify, weld, draco } = require('@gltf-transform/functions');
const { MeshoptSimplifier } = require('meshoptimizer');
const draco3d = require('draco3dgltf');

class CesiumRTC extends Extension {
	extensionName = 'CESIUM_RTC';
	static EXTENSION_NAME = 'CESIUM_RTC';

	read(context) {
        const rtc = context.jsonDoc.json.extensions?.CESIUM_RTC;
        if (rtc) {
            this.rtc = rtc;
        }
	}

	write(context) {
        if (this.rtc){
            context.jsonDoc.json.extensions = context.jsonDoc.json.extensions || {};
            context.jsonDoc.json.extensions.CESIUM_RTC = this.rtc;
        }
    }
}

async function main() {
    const io = new NodeIO().registerExtensions(KHRONOS_EXTENSIONS)
                           .registerExtensions([CesiumRTC])
                           .registerDependencies({
                               'draco3d.decoder': await draco3d.createDecoderModule(),
                               'draco3d.encoder': await draco3d.createEncoderModule(),
                           });

    const args = process.argv.slice(2);
    let inputFile = '';
    let outputFile = '';
    let textureSize = 512;
    let simplifyRatio = 1;

    for (let i = 0; i < args.length; i++) {
        if (args[i] === '--input' && i + 1 < args.length) {
            inputFile = args[i + 1];
            i++;
        } else if (args[i] === '--output' && i + 1 < args.length) {
            outputFile = args[i + 1];
            i++;
        } else if (args[i] === '--texture-size' && i + 1 < args.length) {
            textureSize = parseInt(args[i + 1]);
            if (isNaN(textureSize) || textureSize < 1){
                console.log(`Invalid texture size: ${args[i + 1]}`);
                process.exit(1);
            }
            i++;
        } else if (args[i] === '--simplify-ratio' && i + 1 < args.length) {
            simplifyRatio = parseFloat(args[i + 1]);
            if (isNaN(simplifyRatio) || simplifyRatio < 0 || simplifyRatio > 1){
                console.log(`Invalid simplify ratio: ${args[i + 1]}`);
                process.exit(1);
            }
            i++;
        }

    }

    if (!inputFile || !outputFile){
        console.log('Usage: node glb_optimize.js --input <input.glb> --output <output.glb> [--texture-size <size>]');
        process.exit(1);
    }

    const encoder = require('sharp');

    let transforms = [
        textureCompress({
            encoder,
            resize: [textureSize, textureSize],
            targetFormat: undefined,
            limitInputPixels: true,
        }),
        draco({
            quantizationVolume: "scene"
        })
    ]

    if (simplifyRatio < 1){
        transforms.unshift(
            simplify({
                simplifier: MeshoptSimplifier,
                error: 0.0001,
                ratio: simplifyRatio,
                lockBorder: false,
            }),
        );
        transforms.unshift(weld());
    }

    const document = await io.read(inputFile);
    await document.transform(...transforms);
    await io.write(outputFile, document);
}

main().catch((e) => {
    console.error(e);
    process.exit(1);
});