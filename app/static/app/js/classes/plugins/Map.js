import Utils from '../Utils';
import L from 'leaflet';

const { assert } = Utils;

const leafletPreCheck = (options) => {
  assert(options.map !== undefined);
};

export default {
  namespace: "Map",

  endpoints: [
    ["willAddControls", leafletPreCheck],
    ["didAddControls", leafletPreCheck]
  ]
};

