/*
  SystemJS Globals loader plugin
  Piero Toffanin 2018
*/

// this code simply allows loading of global modules
// that are already defined in the window object
exports.fetch = function(load) {
  var moduleName = load.name.split("/").pop();
  return moduleName;
}

exports.instantiate = function(load){
  return window[load.source] || window[load.metadata.exports];
}