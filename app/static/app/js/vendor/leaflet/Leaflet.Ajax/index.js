'use strict';
var L = global.L || require('leaflet');
var Promise = require('lie');
var ajax = require('./ajax');
L.GeoJSON.AJAX = L.GeoJSON.extend({
  defaultAJAXparams: {
    dataType: 'json',
    callbackParam: 'callback',
    local: false,
    middleware: function (f) {
      return f;
    }
  },
  initialize: function (url, options) {
    this.urls = [];
    if (url) {
      if (typeof url === 'string') {
        this.urls.push(url);
      } else if (typeof url.pop === 'function') {
        this.urls = this.urls.concat(url);
      } else {
        options = url;
        url = undefined;
      }
    }
    var ajaxParams = L.Util.extend({}, this.defaultAJAXparams);

    for (var i in options) {
      if (this.defaultAJAXparams.hasOwnProperty(i)) {
        ajaxParams[i] = options[i];
      }
    }
    this.ajaxParams = ajaxParams;
    this._layers = {};
    L.Util.setOptions(this, options);
    this.on('data:loaded', function () {
      if (this.filter) {
        this.refilter(this.filter);
      }
    }, this);
    var self = this;
    if (this.urls.length > 0) {
      new Promise(function (resolve) {
        resolve();
      }).then(function () {
        self.addUrl();
      });
    }
  },
  clearLayers: function () {
    this.urls = [];
    L.GeoJSON.prototype.clearLayers.call(this);
    return this;
  },
  addUrl: function (url) {
    var self = this;
    if (url) {
      if (typeof url === 'string') {
        self.urls.push(url);
      } else if (typeof url.pop === 'function') {
        self.urls = self.urls.concat(url);
      }
    }
    var loading = self.urls.length;
    var done = 0;
    self.fire('data:loading');
    self.urls.forEach(function (url) {
      if (self.ajaxParams.dataType.toLowerCase() === 'json') {
        ajax(url, self.ajaxParams).then(function (d) {
          var data = self.ajaxParams.middleware(d);
          self.addData(data);
          self.fire('data:progress', data);
        }, function (err) {
          self.fire('data:progress', {
            error: err
          });
        });
      } else if (self.ajaxParams.dataType.toLowerCase() === 'jsonp') {
        L.Util.jsonp(url, self.ajaxParams).then(function (d) {
          var data = self.ajaxParams.middleware(d);
          self.addData(data);
          self.fire('data:progress', data);
        }, function (err) {
          self.fire('data:progress', {
            error: err
          });
        });
      }
    });
    self.on('data:progress', function () {
      if (++done === loading) {
        self.fire('data:loaded');
      }
    });
  },
  refresh: function (url) {
    url = url || this.urls;
    this.clearLayers();
    this.addUrl(url);
  },
  refilter: function (func) {
    if (typeof func !== 'function') {
      this.filter = false;
      this.eachLayer(function (a) {
        a.setStyle({
          stroke: true,
          clickable: true
        });
      });
    } else {
      this.filter = func;
      this.eachLayer(function (a) {
        if (func(a.feature)) {
          a.setStyle({
            stroke: true,
            clickable: true
          });
        } else {
          a.setStyle({
            stroke: false,
            clickable: false
          });
        }
      });
    }
  }
});
L.Util.Promise = Promise;
L.Util.ajax = ajax;
L.Util.jsonp = require('./jsonp');
L.geoJson.ajax = function (geojson, options) {
  return new L.GeoJSON.AJAX(geojson, options);
};
