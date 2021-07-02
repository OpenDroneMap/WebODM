import { EventEmitter } from 'fbemitter';
import ApiFactory from './ApiFactory';
import Map from './Map';
import Dashboard from './Dashboard';
import App from './App';
import SharePopup from './SharePopup';
import SystemJS from 'SystemJS';

if (!window.PluginsAPI){
  const events = new EventEmitter();
  const factory = new ApiFactory(events);

  SystemJS.config({
    baseURL: '/plugins',
    map: {
      'css': '/static/app/js/vendor/css.js',
      'globals-loader': '/static/app/js/vendor/globals-loader.js'
    },
    meta: {
      '*.css': { loader: 'css' },

      // Globals always available in the window object
      'jQuery': { loader: 'globals-loader', exports: '$' },
      'leaflet': { loader: 'globals-loader', exports: 'L' },
      'ReactDOM': { loader: 'globals-loader', exports: 'ReactDOM' },
      'React': { loader: 'globals-loader', exports: 'React' },
      'SystemJS': { loader: 'globals-loader', exports: 'SystemJS' }
    }
  });

  window.PluginsAPI = {
    Map: factory.create(Map),
    Dashboard: factory.create(Dashboard),
    App: factory.create(App),
    SharePopup: factory.create(SharePopup),

    SystemJS,
    events
  };
}

export default window.PluginsAPI;

