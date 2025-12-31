const fs = require('fs');
const path = require('path');
const { NodeIO, Extension } = require('@gltf-transform/core');
const { KHRONOS_EXTENSIONS } = require('@gltf-transform/extensions');
const { textureCompress, draco } = require('@gltf-transform/functions');
const draco3d = require('draco3dgltf');
const encoder = require('sharp');

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
    let textureRescale = null;
    let testMode = false;

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
        } else if (args[i] === '--texture-rescale' && i + 1 < args.length) {
            textureRescale = parseInt(args[i + 1]);
            if (isNaN(textureRescale) || textureRescale < 1 || (textureRescale & (textureRescale - 1)) !== 0){
                console.log(`Invalid texture rescale factor: ${args[i + 1]} (must be a power of 2)`);
                process.exit(1);
            }
            i++;
        } else if (args[i] === '--test') {
            testMode = true;
            i++;
        }

    }

    if (!inputFile || !outputFile){
        console.log('Usage: node glb_optimize.js --input <input.glb> --output <output.glb> [--texture-size <size>|--texture-rescale <factor>]');
        process.exit(1);
    }

    if (testMode){
        console.log("Test mode, writing empty test file");
        fs.writeFileSync(outputFile, "test", "utf8");
        process.exit(0);
    }

    const document = await io.read(inputFile);

    if (textureRescale !== null){
        let dimension = 0;
        const textures = document.getRoot().listTextures();
        textures.forEach(tex => {
            const [ width, height ] = tex.getSize();
            dimension = Math.max(dimension, width, height);
        });
        textureSize = (dimension / textureRescale);
        if (dimension === 0) dimension = 512;
    }
    
    let transforms = [
        textureCompress({
                encoder,
                resize: [textureSize, textureSize],
                targetFormat: undefined,
                limitInputPixels: false,
        }),
        draco({
            quantizationVolume: "scene"
        })
    ];

    await document.transform(...transforms);

    const outputDir = path.dirname(outputFile);
    if (fs.existsSync(outputDir)) {
        await io.write(outputFile, document);
    } else {
        throw new Error(`Output directory does not exist: ${outputDir}`);
    }
    await io.write(outputFile, document);
}

main().catch((e) => {
    console.error(e);
    process.exit(1);
});