/*https://github.com/francoisromain/leaflet-markers-canvas/blob/master/licence.md*/
(function (global, factory) {
    typeof exports === 'object' && typeof module !== 'undefined' ? factory(require('leaflet'), require('rbush')) :
    typeof define === 'function' && define.amd ? define(['leaflet', 'rbush'], factory) :
    (global = global || self, factory(global.L, global.RBush));
  }(this, (function (L, RBush) { 'use strict';
  
    L = L && Object.prototype.hasOwnProperty.call(L, 'default') ? L['default'] : L;
    RBush = RBush && Object.prototype.hasOwnProperty.call(RBush, 'default') ? RBush['default'] : RBush;
  
    var markersCanvas = {
      // * * * * * * * * * * * * * * * * * * * * * * * * * * * *
      //
      // private: properties
      //
      // * * * * * * * * * * * * * * * * * * * * * * * * * * * *
  
      _map: null,
      _canvas: null,
      _context: null,
  
      // leaflet markers (used to getBounds)
      _markers: [],
  
      // visible markers
      _markersTree: null,
  
      // every marker positions (even out of the canvas)
      _positionsTree: null,
  
      // icon images index
      _icons: {},
  
      // * * * * * * * * * * * * * * * * * * * * * * * * * * * *
      //
      // public: global
      //
      // * * * * * * * * * * * * * * * * * * * * * * * * * * * *
  
      addTo: function addTo(map) {
        map.addLayer(this);
  
        return this;
      },
  
      getBounds: function getBounds() {
        var bounds = new L.LatLngBounds();
  
        this._markers.forEach(function (marker) {
          bounds.extend(marker.getLatLng());
        });
  
        return bounds;
      },
  
      redraw: function redraw() {
        this._redraw(true);
      },
  
      clear: function clear() {
        this._positionsTree = new RBush();
        this._markersTree = new RBush();
        this._markers = [];
        this._redraw(true);
      },
  
      // * * * * * * * * * * * * * * * * * * * * * * * * * * * *
      //
      // public: markers
      //
      // * * * * * * * * * * * * * * * * * * * * * * * * * * * *
  
      addMarker: function addMarker(marker, map) {
        var ref = this._addMarker(marker, map);
        var markerBox = ref.markerBox;
        var positionBox = ref.positionBox;
        var isVisible = ref.isVisible;
  
        if (markerBox && isVisible) {
          this._markersTree.insert(markerBox);
        }
  
        if (positionBox) {
          this._positionsTree.insert(positionBox);
        }
      },
  
      // add multiple markers (better for rBush performance)
      addMarkers: function addMarkers(markers, map) {
        if (!this._markersTree) this._markersTree = new RBush();
        if (!this._positionsTree) this._positionsTree = new RBush();
        
        var this$1 = this;
  
        var markerBoxes = [];
        var positionBoxes = [];
  
        markers.forEach(function (marker) {
          var ref = this$1._addMarker(marker, map);
          var markerBox = ref.markerBox;
          var positionBox = ref.positionBox;
          var isVisible = ref.isVisible;
  
          if (markerBox && isVisible) {
            markerBoxes.push(markerBox);
          }
  
          if (positionBox) {
            positionBoxes.push(positionBox);
          }
        });

        this._markersTree.load(markerBoxes);
        this._positionsTree.load(positionBoxes);
      },
  
      removeMarker: function removeMarker(marker) {
        var latLng = marker.getLatLng();
        var isVisible = this._map.getBounds().contains(latLng);
  
        var positionBox = {
          minX: latLng.lng,
          minY: latLng.lat,
          maxX: latLng.lng,
          maxY: latLng.lat,
          marker: marker,
        };
  
        this._positionsTree.remove(positionBox, function (a, b) {
          return a.marker._leaflet_id === b.marker._leaflet_id;
        });
  
        if (isVisible) {
          this._redraw(true);
        }
      },
  
      // remove multiple markers (better for rBush performance)
      removeMarkers: function removeMarkers(markers) {
        var this$1 = this;
  
        var hasChanged = false;
  
        markers.forEach(function (marker) {
          var latLng = marker.getLatLng();
          var isVisible = this$1._map.getBounds().contains(latLng);
  
          var positionBox = {
            minX: latLng.lng,
            minY: latLng.lat,
            maxX: latLng.lng,
            maxY: latLng.lat,
            marker: marker,
          };
  
          this$1._positionsTree.remove(positionBox, function (a, b) {
            return a.marker._leaflet_id === b.marker._leaflet_id;
          });
  
          if (isVisible) {
            hasChanged = true;
          }
        });
  
        if (hasChanged) {
          this._redraw(true);
        }
      },
  
      // * * * * * * * * * * * * * * * * * * * * * * * * * * * *
      //
      // leaflet: default methods
      //
      // * * * * * * * * * * * * * * * * * * * * * * * * * * * *
  
      initialize: function initialize(options) {
        L.Util.setOptions(this, options);
      },

      // called by Leaflet on `map.addLayer`
      onAdd: function onAdd(map) {
        this._map = map;
        if (!this._canvas) this._initCanvas();
        this.getPane().appendChild(this._canvas);
  
        map.on("moveend", this._reset, this);
        map.on("resize", this._reset, this);
  
        map.on("click", this._fire, this);
        map.on("mousemove", this._fire, this);
  
        if (map._zoomAnimated) {
          map.on("zoomanim", this._animateZoom, this);
        }

        this._reset();
      },
  
      // called by Leaflet
      onRemove: function onRemove(map) {
        this.getPane().removeChild(this._canvas);
  
        map.off("click", this._fire, this);
        map.off("mousemove", this._fire, this);
        map.off("moveend", this._reset, this);
        map.off("resize", this._reset, this);
  
        if (map._zoomAnimated) {
          map.off("zoomanim", this._animateZoom, this);
        }
      },
  
      setOptions: function setOptions(options) {
        L.Util.setOptions(this, options);
  
        return this.redraw();
      },
  
      // * * * * * * * * * * * * * * * * * * * * * * * * * * * *
      //
      // private: global methods
      //
      // * * * * * * * * * * * * * * * * * * * * * * * * * * * *
  
      _initCanvas: function _initCanvas() {
        var ref = this._map.getSize();
        var x = ref.x;
        var y = ref.y;
        var isAnimated = this._map.options.zoomAnimation && L.Browser.any3d;
  
        this._canvas = L.DomUtil.create(
          "canvas",
          "leaflet-markers-canvas-layer leaflet-layer"
        );
        this._canvas.width = x;
        this._canvas.height = y;
        this._context = this._canvas.getContext("2d");
  
        L.DomUtil.addClass(
          this._canvas,
          ("leaflet-zoom-" + (isAnimated ? "animated" : "hide"))
        );
      },
  
      // * * * * * * * * * * * * * * * * * * * * * * * * * * * *
      //
      // private: marker methods
      //
      // * * * * * * * * * * * * * * * * * * * * * * * * * * * *
  
      _addMarker: function _addMarker(marker, map) {
        if (marker.options.pane !== "markerPane" || !marker.options.icon) {
          console.error("This is not a marker", marker);
  
          return { markerBox: null, positionBox: null, isVisible: null };
        }
  
        // required for pop-up and tooltip
        marker._map = map;
  
        // add _leaflet_id property
        L.Util.stamp(marker);
  
        var latLng = marker.getLatLng();
        var isVisible = map.getBounds().contains(latLng);
        var ref = map.latLngToContainerPoint(latLng);
        var x = ref.x;
        var y = ref.y;
        var ref$1 = marker.options.icon.options;
        var iconSize = ref$1.iconSize;
        var iconAnchor = ref$1.iconAnchor;
  
        var markerBox = {
          minX: x - iconAnchor[0],
          minY: y - iconAnchor[1],
          maxX: x + iconSize[0] - iconAnchor[0],
          maxY: y + iconSize[1] - iconAnchor[1],
          marker: marker,
        };
  
        var positionBox = {
          minX: latLng.lng,
          minY: latLng.lat,
          maxX: latLng.lng,
          maxY: latLng.lat,
          marker: marker,
        };
  
        if (isVisible) {
          this._drawMarker(marker, { x: x, y: y });
        }
  
        this._markers.push(marker);
  
        return { markerBox: markerBox, positionBox: positionBox, isVisible: isVisible };
      },
  
      _drawMarker: function _drawMarker(marker, ref) {
        if (!this._map) return;

        var this$1 = this;
        var x = ref.x;
        var y = ref.y;
  
        var ref$1 = marker.options.icon.options;
        var iconUrl = ref$1.iconUrl;
  
        if (marker.image) {
          this._drawImage(marker, { x: x, y: y });
        } else if (this._icons[iconUrl]) {
          marker.image = this._icons[iconUrl].image;
  
          if (this._icons[iconUrl].isLoaded) {
            this._drawImage(marker, { x: x, y: y });
          } else {
            this._icons[iconUrl].elements.push({ marker: marker, x: x, y: y });
          }
        } else {
          var image = new Image();
          image.src = iconUrl;
          marker.image = image;
  
          this._icons[iconUrl] = {
            image: image,
            isLoaded: false,
            elements: [{ marker: marker, x: x, y: y }],
          };
  
          image.onload = function () {
            this$1._icons[iconUrl].isLoaded = true;
            this$1._icons[iconUrl].elements.forEach(function (ref) {
              var marker = ref.marker;
              var x = ref.x;
              var y = ref.y;
  
              this$1._drawImage(marker, { x: x, y: y });
            });
          };
        }
      },
  
      _drawImage: function _drawImage(marker, ref) {
        var x = ref.x;
        var y = ref.y;
  
        var ref$1 = marker.options.icon.options;
        var rotationAngle = ref$1.rotationAngle;
        var iconAnchor = ref$1.iconAnchor;
        var iconSize = ref$1.iconSize;
        var angle = rotationAngle || 0;
  
        this._context.save();
        this._context.translate(x, y);
        this._context.rotate((angle * Math.PI) / 180);
        this._context.drawImage(
          marker.image,
          -iconAnchor[0],
          -iconAnchor[1],
          iconSize[0],
          iconSize[1]
        );
        this._context.restore();
      },
  
      _redraw: function _redraw(clear) {
        var this$1 = this;
  
        if (clear) {
          this._context.clearRect(0, 0, this._canvas.width, this._canvas.height);
        }

        if (!this._map || !this._positionsTree) { return; }
  
        var mapBounds = this._map.getBounds();
        var mapBoundsBox = {
          minX: mapBounds.getWest(),
          minY: mapBounds.getSouth(),
          maxX: mapBounds.getEast(),
          maxY: mapBounds.getNorth(),
        };
  
        // draw only visible markers
        var markers = [];
        this._positionsTree.search(mapBoundsBox).forEach(function (ref) {
          var marker = ref.marker;
  
          var latLng = marker.getLatLng();
          var ref$1 = this$1._map.latLngToContainerPoint(latLng);
          var x = ref$1.x;
          var y = ref$1.y;
          var ref$2 = marker.options.icon.options;
          var iconSize = ref$2.iconSize;
          var iconAnchor = ref$2.iconAnchor;
  
          var markerBox = {
            minX: x - iconAnchor[0],
            minY: y - iconAnchor[1],
            maxX: x + iconSize[0] - iconAnchor[0],
            maxY: y + iconSize[1] - iconAnchor[1],
            marker: marker,
          };
  
          markers.push(markerBox);
          this$1._drawMarker(marker, { x: x, y: y });
        });
  
        this._markersTree.clear();
        this._markersTree.load(markers);
      },
  
      // * * * * * * * * * * * * * * * * * * * * * * * * * * * *
      //
      // private: event methods
      //
      // * * * * * * * * * * * * * * * * * * * * * * * * * * * *
  
      _reset: function _reset() {
        var topLeft = this._map.containerPointToLayerPoint([0, 0]);
        L.DomUtil.setPosition(this._canvas, topLeft);
  
        var ref = this._map.getSize();
        var x = ref.x;
        var y = ref.y;
        this._canvas.width = x;
        this._canvas.height = y;
  
        this._redraw();
      },
  
      _fire: function _fire(event) {
        if (!this._markersTree) { return; }
  
        var ref = event.containerPoint;
        var x = ref.x;
        var y = ref.y;
        var markers = this._markersTree.search({
          minX: x,
          minY: y,
          maxX: x,
          maxY: y,
        });
  
        if (markers && markers.length) {
          this._map._container.style.cursor = "pointer";
          var marker = markers[0].marker;
  
          if (event.type === "click") {
            if (marker.listens("click")) {
              marker.fire("click");
            }
          }
  
          if (event.type === "mousemove") {
            if (this._mouseOverMarker && this._mouseOverMarker !== marker) {
              if (this._mouseOverMarker.listens("mouseout")) {
                this._mouseOverMarker.fire("mouseout");
              }
            }
  
            if (!this._mouseOverMarker || this._mouseOverMarker !== marker) {
              this._mouseOverMarker = marker;
              if (marker.listens("mouseover")) {
                marker.fire("mouseover");
              }
            }
          }
        } else {
          this._map._container.style.cursor = "";
          if (event.type === "mousemove" && this._mouseOverMarker) {
            if (this._mouseOverMarker.listens("mouseout")) {
              this._mouseOverMarker.fire("mouseout");
            }
  
            delete this._mouseOverMarker;
          }
        }
      },
  
      _animateZoom: function _animateZoom(event) {
        var scale = this._map.getZoomScale(event.zoom);
        var offset = this._map._latLngBoundsToNewLayerBounds(
          this._map.getBounds(),
          event.zoom,
          event.center
        ).min;
  
        L.DomUtil.setTransform(this._canvas, offset, scale);
      },
    };
  
    L.MarkersCanvas = L.Layer.extend(markersCanvas);
  
  })));