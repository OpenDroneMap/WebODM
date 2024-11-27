import Utils from '../Utils';
import L from 'leaflet';

const { assert } = Utils;

const leafletPreCheck = (options) => {
  assert(options.map !== undefined);
  assert(options.tiles !== undefined);
};

const layersControlPreCheck = (options) => {
  assert(options.controls !== undefined);
  leafletPreCheck(options);
}

export default {
  namespace: "Map",

  endpoints: [
    ["willAddControls", leafletPreCheck],
    ["didAddControls", layersControlPreCheck],
	  ["addActionButton", leafletPreCheck]
  ],

  functions: [
    "handleClick",
    "addAnnotation",
    "updateAnnotation",
    "deleteAnnotation",
    "toggleAnnotation",
    "annotationDeleted",
    "downloadAnnotations",
    "mapTypeChanged",
    "sideBySideChanged",
  ]
};

