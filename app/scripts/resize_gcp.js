#!/usr/bin/env node

const fs = require('fs');
const Gcp = require('../static/app/js/classes/Gcp');
const argv = process.argv.slice(2);
function die(s){
	console.log(s);
	process.exit(1);
}
if (argv.length != 2){
	die(`Usage: ./resize_gcp.js <path/to/gcp_file.txt> <JSON encoded image-->ratio map>`);
}

const [inputFile, jsonMap] = argv;
if (!fs.existsSync(inputFile)){
	die('File does not exist: ' + inputFile);
}
const originalGcp = new Gcp(fs.readFileSync(inputFile, 'utf8'));
try{
	const map = JSON.parse(jsonMap);
	const newGcp = originalGcp.resize(map, true);
	console.log(newGcp.toString());
}catch(e){
	die("Not a valid JSON string: " + jsonMap);
}
