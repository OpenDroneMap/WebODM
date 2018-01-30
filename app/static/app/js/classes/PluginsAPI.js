import { EventEmitter } from 'fbemitter';
import Utils from './Utils';

const { assert } = Utils;

if (!window.PluginsAPI){
  const events = new EventEmitter();

  window.PluginsAPI = {
    Map: {
      AddPanel: (callback) => {
        events.addListener('Map::Loaded', callback);
      },

      Loaded: (params) => {
        assert(params.map !== undefined);
        events.emit('Map::Loaded', params);
      }
    },

    events
  };
}

export default window.PluginsAPI;

