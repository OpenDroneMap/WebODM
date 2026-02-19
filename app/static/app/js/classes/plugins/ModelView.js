import Utils from '../Utils';
import L from 'leaflet';

const { assert } = Utils;

const potreePreCheck = (options) => {
  assert(options.viewer !== undefined);
};

export default {
  namespace: "ModelView",

  endpoints: [
	  ["addActionButton", potreePreCheck]
  ]
};

