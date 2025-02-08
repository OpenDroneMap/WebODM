(function(){function r(e,n,t){function o(i,f){if(!n[i]){if(!e[i]){var c="function"==typeof require&&require;if(!f&&c)return c(i,!0);if(u)return u(i,!0);var a=new Error("Cannot find module '"+i+"'");throw a.code="MODULE_NOT_FOUND",a}var p=n[i]={exports:{}};e[i][0].call(p.exports,function(r){var n=e[i][1][r];return o(n||r)},p,p.exports,r,e,n,t)}return n[i].exports}for(var u="function"==typeof require&&require,i=0;i<t.length;i++)o(t[i]);return o}return r})()({1:[function(require,module,exports){
(function (global){
var L = (typeof window !== "undefined" ? window['L'] : typeof global !== "undefined" ? global['L'] : null)
require('./layout.css')
require('./range.css')

var mapWasDragEnabled
var mapWasTapEnabled

// Leaflet v0.7 backwards compatibility
function on (el, types, fn, context) {
  types.split(' ').forEach(function (type) {
    L.DomEvent.on(el, type, fn, context)
  })
}

// Leaflet v0.7 backwards compatibility
function off (el, types, fn, context) {
  types.split(' ').forEach(function (type) {
    L.DomEvent.off(el, type, fn, context)
  })
}

function getRangeEvent (rangeInput) {
  return 'oninput' in rangeInput ? 'input' : 'change'
}

function cancelMapDrag () {
  mapWasDragEnabled = this._map.dragging.enabled()
  mapWasTapEnabled = this._map.tap && this._map.tap.enabled()
  this._map.dragging.disable()
  this._map.tap && this._map.tap.disable()
}

function uncancelMapDrag (e) {
  this._refocusOnMap(e)
  if (mapWasDragEnabled) {
    this._map.dragging.enable()
  }
  if (mapWasTapEnabled) {
    this._map.tap.enable()
  }
}

// convert arg to an array - returns empty array if arg is undefined
function asArray (arg) {
  return (arg === 'undefined') ? [] : Array.isArray(arg) ? arg : [arg]
}

function noop () {}

L.Control.SideBySide = L.Control.extend({
  options: {
    thumbSize: 42,
    padding: 0
  },

  initialize: function (leftLayers, rightLayers, options) {
    this.setLeftLayers(leftLayers)
    this.setRightLayers(rightLayers)
    L.setOptions(this, options)
  },

  getPosition: function () {
    var rangeValue = this._range.value
    var offset = (0.5 - rangeValue) * (2 * this.options.padding + this.options.thumbSize)
    return this._map.getSize().x * rangeValue + offset
  },

  setPosition: noop,

  includes: L.Evented.prototype || L.Mixin.Events,

  addTo: function (map) {
    this.remove()
    this._map = map

    var container = this._container = L.DomUtil.create('div', 'leaflet-sbs', map._controlContainer)

    this._divider = L.DomUtil.create('div', 'leaflet-sbs-divider', container)
    var range = this._range = L.DomUtil.create('input', 'leaflet-sbs-range', container)
    range.type = 'range'
    range.min = 0
    range.max = 1
    range.step = 'any'
    range.value = 0.5
    range.style.paddingLeft = range.style.paddingRight = this.options.padding + 'px'
    this._addEvents()
    this._updateLayers()
    return this
  },

  remove: function () {
    if (!this._map) {
      return this
    }
    if (this._leftLayer) {
      this._leftLayer.getContainer().style.clip = ''
    }
    if (this._rightLayer) {
      this._rightLayer.getContainer().style.clip = ''
    }
    this._removeEvents()
    L.DomUtil.remove(this._container)

    this._map = null

    return this
  },

  setLeftLayers: function (leftLayers) {
    this._leftLayers = asArray(leftLayers)
    this._updateLayers()
    return this
  },

  setRightLayers: function (rightLayers) {
    this._rightLayers = asArray(rightLayers)
    this._updateLayers()
    return this
  },

  _updateClip: function () {
    var map = this._map
    var nw = map.containerPointToLayerPoint([0, 0])
    var se = map.containerPointToLayerPoint(map.getSize())
    var clipX = nw.x + this.getPosition()
    var dividerX = this.getPosition()

    this._divider.style.left = dividerX + 'px'
    this.fire('dividermove', {x: dividerX})
    var clipLeft = 'rect(' + [nw.y, clipX, se.y, nw.x].join('px,') + 'px)'
    var clipRight = 'rect(' + [nw.y, se.x, se.y, clipX].join('px,') + 'px)'
    if (this._leftLayer) {
      this._leftLayer.getContainer().style.clip = clipLeft
    }
    if (this._rightLayer) {
      this._rightLayer.getContainer().style.clip = clipRight
    }
  },

  _updateLayers: function () {
    if (!this._map) {
      return this
    }
    var prevLeft = this._leftLayer
    var prevRight = this._rightLayer
    this._leftLayer = this._rightLayer = null
    this._leftLayers.forEach(function (layer) {
      if (this._map.hasLayer(layer)) {
        this._leftLayer = layer
      }
    }, this)
    this._rightLayers.forEach(function (layer) {
      if (this._map.hasLayer(layer)) {
        this._rightLayer = layer
      }
    }, this)
    if (prevLeft !== this._leftLayer) {
      prevLeft && this.fire('leftlayerremove', {layer: prevLeft})
      this._leftLayer && this.fire('leftlayeradd', {layer: this._leftLayer})
    }
    if (prevRight !== this._rightLayer) {
      prevRight && this.fire('rightlayerremove', {layer: prevRight})
      this._rightLayer && this.fire('rightlayeradd', {layer: this._rightLayer})
    }
    this._updateClip()
  },

  _addEvents: function () {
    var range = this._range
    var map = this._map
    if (!map || !range) return
    map.on('move', this._updateClip, this)
    map.on('layeradd layerremove', this._updateLayers, this)
    on(range, getRangeEvent(range), this._updateClip, this)
    on(range, L.Browser.touch ? 'touchstart' : 'mousedown', cancelMapDrag, this)
    on(range, L.Browser.touch ? 'touchend' : 'mouseup', uncancelMapDrag, this)
  },

  _removeEvents: function () {
    var range = this._range
    var map = this._map
    if (range) {
      off(range, getRangeEvent(range), this._updateClip, this)
      off(range, L.Browser.touch ? 'touchstart' : 'mousedown', cancelMapDrag, this)
      off(range, L.Browser.touch ? 'touchend' : 'mouseup', uncancelMapDrag, this)
    }
    if (map) {
      map.off('layeradd layerremove', this._updateLayers, this)
      map.off('move', this._updateClip, this)
    }
  }
})

L.control.sideBySide = function (leftLayers, rightLayers, options) {
  return new L.Control.SideBySide(leftLayers, rightLayers, options)
}

module.exports = L.Control.SideBySide

}).call(this,typeof global !== "undefined" ? global : typeof self !== "undefined" ? self : typeof window !== "undefined" ? window : {})
},{"./layout.css":2,"./range.css":4}],2:[function(require,module,exports){
var inject = require('./node_modules/cssify');
var css = ".leaflet-sbs-range {\r\n    position: absolute;\r\n    top: 50%;\r\n    width: 100%;\r\n    z-index: 999;\r\n}\r\n.leaflet-sbs-divider {\r\n    position: absolute;\r\n    top: 0;\r\n    bottom: 0;\r\n    left: 50%;\r\n    margin-left: -2px;\r\n    width: 4px;\r\n    background-color: #fff;\r\n    pointer-events: none;\r\n    z-index: 999;\r\n}\r\n";
inject(css, undefined, '_i6aomd');
module.exports = css;

},{"./node_modules/cssify":3}],3:[function(require,module,exports){
'use strict'

function injectStyleTag (document, fileName, cb) {
  var style = document.getElementById(fileName)

  if (style) {
    cb(style)
  } else {
    var head = document.getElementsByTagName('head')[0]

    style = document.createElement('style')
    if (fileName != null) style.id = fileName
    cb(style)
    head.appendChild(style)
  }

  return style
}

module.exports = function (css, customDocument, fileName) {
  var doc = customDocument || document
  /* istanbul ignore if: not supported by Electron */
  if (doc.createStyleSheet) {
    var sheet = doc.createStyleSheet()
    sheet.cssText = css
    return sheet.ownerNode
  } else {
    return injectStyleTag(doc, fileName, function (style) {
      /* istanbul ignore if: not supported by Electron */
      if (style.styleSheet) {
        style.styleSheet.cssText = css
      } else {
        style.innerHTML = css
      }
    })
  }
}

module.exports.byUrl = function (url) {
  /* istanbul ignore if: not supported by Electron */
  if (document.createStyleSheet) {
    return document.createStyleSheet(url).ownerNode
  } else {
    var head = document.getElementsByTagName('head')[0]
    var link = document.createElement('link')

    link.rel = 'stylesheet'
    link.href = url

    head.appendChild(link)
    return link
  }
}

},{}],4:[function(require,module,exports){
var inject = require('./node_modules/cssify');
var css = ".leaflet-sbs-range {\r\n    -webkit-appearance: none;\r\n    display: inline-block!important;\r\n    vertical-align: middle;\r\n    height: 0;\r\n    padding: 0;\r\n    margin: 0;\r\n    border: 0;\r\n    background: rgba(0, 0, 0, 0.25);\r\n    min-width: 100px;\r\n    cursor: pointer;\r\n    pointer-events: none;\r\n    z-index: 999;\r\n}\r\n.leaflet-sbs-range::-ms-fill-upper {\r\n    background: transparent;\r\n}\r\n.leaflet-sbs-range::-ms-fill-lower {\r\n    background: rgba(255, 255, 255, 0.25);\r\n}\r\n/* Browser thingies */\r\n\r\n.leaflet-sbs-range::-moz-range-track {\r\n    opacity: 0;\r\n}\r\n.leaflet-sbs-range::-ms-track {\r\n    opacity: 0;\r\n}\r\n.leaflet-sbs-range::-ms-tooltip {\r\n    display: none;\r\n}\r\n/* For whatever reason, these need to be defined\r\n * on their own so dont group them */\r\n\r\n.leaflet-sbs-range::-webkit-slider-thumb {\r\n    -webkit-appearance: none;\r\n    margin: 0;\r\n    padding: 0;\r\n    background: #fff;\r\n    height: 40px;\r\n    width: 40px;\r\n    border-radius: 20px;\r\n    cursor: ew-resize;\r\n    pointer-events: auto;\r\n    border: 1px solid #ddd;\r\n    background-image: url(\"data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAFAAAABQCAMAAAC5zwKfAAAABlBMVEV9fX3///+Kct39AAAAAnRSTlP/AOW3MEoAAAA9SURBVFjD7dehDQAwDANBZ/+l2wmKoiqR7pHRcaeaCxAIBAL/g7k9JxAIBAKBQCAQCAQC14H+MhAIBE4CD3fOFvGVBzhZAAAAAElFTkSuQmCC\");\r\n    background-position: 50% 50%;\r\n    background-repeat: no-repeat;\r\n    background-size: 40px 40px;\r\n}\r\n.leaflet-sbs-range::-ms-thumb {\r\n    margin: 0;\r\n    padding: 0;\r\n    background: #fff;\r\n    height: 40px;\r\n    width: 40px;\r\n    border-radius: 20px;\r\n    cursor: ew-resize;\r\n    pointer-events: auto;\r\n    border: 1px solid #ddd;\r\n    background-image: url(\"data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAFAAAABQCAMAAAC5zwKfAAAABlBMVEV9fX3///+Kct39AAAAAnRSTlP/AOW3MEoAAAA9SURBVFjD7dehDQAwDANBZ/+l2wmKoiqR7pHRcaeaCxAIBAL/g7k9JxAIBAKBQCAQCAQC14H+MhAIBE4CD3fOFvGVBzhZAAAAAElFTkSuQmCC\");\r\n    background-position: 50% 50%;\r\n    background-repeat: no-repeat;\r\n    background-size: 40px 40px;\r\n}\r\n.leaflet-sbs-range::-moz-range-thumb {\r\n    padding: 0;\r\n    right: 0    ;\r\n    background: #fff;\r\n    height: 40px;\r\n    width: 40px;\r\n    border-radius: 20px;\r\n    cursor: ew-resize;\r\n    pointer-events: auto;\r\n    border: 1px solid #ddd;\r\n    background-image: url(\"data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAFAAAABQCAMAAAC5zwKfAAAABlBMVEV9fX3///+Kct39AAAAAnRSTlP/AOW3MEoAAAA9SURBVFjD7dehDQAwDANBZ/+l2wmKoiqR7pHRcaeaCxAIBAL/g7k9JxAIBAKBQCAQCAQC14H+MhAIBE4CD3fOFvGVBzhZAAAAAElFTkSuQmCC\");\r\n    background-position: 50% 50%;\r\n    background-repeat: no-repeat;\r\n    background-size: 40px 40px;\r\n}\r\n.leaflet-sbs-range:disabled::-moz-range-thumb {\r\n    cursor: default;\r\n}\r\n.leaflet-sbs-range:disabled::-ms-thumb {\r\n    cursor: default;\r\n}\r\n.leaflet-sbs-range:disabled::-webkit-slider-thumb {\r\n    cursor: default;\r\n}\r\n.leaflet-sbs-range:disabled {\r\n    cursor: default;\r\n}\r\n.leaflet-sbs-range:focus {\r\n    outline: none!important;\r\n}\r\n.leaflet-sbs-range::-moz-focus-outer {\r\n    border: 0;\r\n}\r\n\r\n";
inject(css, undefined, '_1tlt668');
module.exports = css;

},{"./node_modules/cssify":3}]},{},[1]);