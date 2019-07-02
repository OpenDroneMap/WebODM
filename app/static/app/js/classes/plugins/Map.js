import Utils from '../Utils';
import L from 'leaflet';

const { assert } = Utils;

const leafletPreCheck = (options) => {
  assert(options.map !== undefined);
  assert(options.tiles !== undefined);
};

const layersControlPreCheck = (options) => {
  assert(options.layersControl !== undefined);
  leafletPreCheck(options);
}

export default {
  namespace: "Map",

  endpoints: [
    ["willAddControls", layersControlPreCheck],
    ["didAddControls", leafletPreCheck],
	["addActionButton", leafletPreCheck],
  ]
};

