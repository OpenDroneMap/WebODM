import { EventEmitter } from 'fbemitter';
import ApiFactory from './ApiFactory';
import Map from './Map';
import $ from 'jquery';
import SystemJS from 'SystemJS';

if (!window.PluginsAPI){
  const events = new EventEmitter();
  const factory = new ApiFactory(events);

  SystemJS.config({
    baseURL: '/plugins',
    map: {
      css: '/static/app/js/vendor/css.js'
    },
    meta: {
      '*.css': { loader: 'css' }
    }
  });

  window.PluginsAPI = {
    Map: factory.create(Map),

    SystemJS,
    events
  };
}

export default window.PluginsAPI;

