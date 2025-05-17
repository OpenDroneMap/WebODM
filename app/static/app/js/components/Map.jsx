import React from 'react';
import ReactDOM from 'ReactDOM';
import '../css/Map.scss';
import 'leaflet/dist/leaflet.css';
import Leaflet from 'leaflet';
import async from 'async';
import '../vendor/leaflet/Leaflet.Autolayers/css/leaflet.auto-layers.css';
import '../vendor/leaflet/Leaflet.Autolayers/leaflet-autolayers';
// import '../vendor/leaflet/L.TileLayer.NoGap';
import Dropzone from '../vendor/dropzone';
import $ from 'jquery';
import ErrorMessage from './ErrorMessage';
import ImagePopup from './ImagePopup';
import GCPPopup from './GCPPopup';
import SwitchModeButton from './SwitchModeButton';
import ShareButton from './ShareButton';
import AssetDownloads from '../classes/AssetDownloads';
import {addTempLayer} from '../classes/TempLayer';
import PropTypes from 'prop-types';
import PluginsAPI from '../classes/plugins/API';
import Basemaps from '../classes/Basemaps';
import Standby from './Standby';
import LayersControl from './LayersControl';
import AssetDownloadButtons from './AssetDownloadButtons';
import CropButton from './CropButton';
import update from 'immutability-helper';
import Utils from '../classes/Utils';
import '../vendor/leaflet/Leaflet.Ajax';
import 'rbush';
import '../vendor/leaflet/leaflet-markers-canvas';
import '../vendor/leaflet/Leaflet.SideBySide/leaflet-side-by-side';
import { _ } from '../classes/gettext';
import UnitSelector from './UnitSelector';
import { unitSystem, toMetric } from '../classes/Units';

const IOU_THRESHOLD = 0.7;

class Map extends React.Component {
  static defaultProps = {
    showBackground: false,
    mapType: "orthophoto",
    public: false,
    publicEdit: false,
    shareButtons: true,
    permissions: ["view"],
    thermal: false
  };

  static propTypes = {
    showBackground: PropTypes.bool,
    tiles: PropTypes.array.isRequired,
    mapType: PropTypes.oneOf(['orthophoto', 'plant', 'dsm', 'dtm']),
    public: PropTypes.bool,
    publicEdit: PropTypes.bool,
    shareButtons: PropTypes.bool,
    permissions: PropTypes.array,
    thermal: PropTypes.bool,
    project: PropTypes.object
  };

  constructor(props) {
    super(props);
    
    this.state = {
      error: "",
      singleTask: null, // When this is set to a task, show a switch mode button to view the 3d model
      pluginActionButtons: [],
      showLoading: false, // for drag&drop of files and first load
      opacity: 100,
      imageryLayers: [],
      overlays: [],
      annotations: [],
      rightLayers: []
    };

    this.basemaps = {};
    this.mapBounds = null;
    this.autolayers = null;
    this.taskCount = 1;
    this.addedCameraShots = {};
    this.zIndexGroupMap = {};
    this.ious = {};

    this.loadImageryLayers = this.loadImageryLayers.bind(this);
    this.updatePopupFor = this.updatePopupFor.bind(this);
    this.handleMapMouseDown = this.handleMapMouseDown.bind(this);
  }

  countTasks = () => {
    let tasks = {};
    this.props.tiles.forEach(tile => {
        tasks[tile.meta.task.id] = true;
    });
    return Object.keys(tasks).length;
  }

  updateOpacity = (evt) => {
    this.setState({
      opacity: parseFloat(evt.target.value),
    });
  }

  updatePopupFor(layer){
    const popup = layer.getPopup();
    $('#layerOpacity', popup.getContent()).val(layer.options.opacity);
  }

  tdPopupButtonUrl = (task) => {
    if (this.props.public){
      return `/public/task/${task.id}/3d/`;
    }else{
      return `/3d/project/${task.project}/task/${task.id}/`;
    }
  }

  typeToHuman = (type, thermal = false) => {
      switch(type){
          case "orthophoto":
              return _("Orthophoto");
          case "plant":
              return thermal ? _("Thermal") : _("Plant Health");
          case "dsm":
              return _("Surface Model");
          case "dtm":
              return _("Terrain Model");
      }
      return "";
  }

  typeToIcon = (type, thermal = false) => {
    switch(type){
        case "orthophoto":
            return "far fa-image fa-fw"
        case "plant":
            return thermal ? "fa fa-thermometer-half fa-fw" : "fa fa-seedling fa-fw";
        case "dsm":
        case "dtm":
            return "fa fa-chart-area fa-fw";
    }
    return "";
  }

  typeZIndex = (type, zIndexGroup = 1) => {
    return ["dsm", "dtm", "orthophoto", "plant"].indexOf(type) + 1 + zIndexGroup * 10;
  }

  hasBands = (bands, orthophoto_bands) => {
    if (!orthophoto_bands) return false;

    for (let i = 0; i < bands.length; i++){
      if (orthophoto_bands.find(b => b.description !== null && b.description.toLowerCase() === bands[i].toLowerCase()) === undefined) return false;
    }
    
    return true;
  }

  computeIOU = (b1, b2) => {
    const [x1Min, y1Min, x1Max, y1Max] = b1;
    const [x2Min, y2Min, x2Max, y2Max] = b2;
  
    const interXMin = Math.max(x1Min, x2Min);
    const interYMin = Math.max(y1Min, y2Min);
    const interXMax = Math.min(x1Max, x2Max);
    const interYMax = Math.min(y1Max, y2Max);
  
    const interWidth = Math.max(0, interXMax - interXMin);
    const interHeight = Math.max(0, interYMax - interYMin);
    const interArea = interWidth * interHeight;
  
    const area1 = (x1Max - x1Min) * (y1Max - y1Min);
    const area2 = (x2Max - x2Min) * (y2Max - y2Min);
    const unionArea = area1 + area2 - interArea;
  
    if (unionArea === 0) return 0;
  
    return interArea / unionArea;
  }

  loadImageryLayers(forceAddLayers = false){
    // Cancel previous requests
    if (this.tileJsonRequests) {
        this.tileJsonRequests.forEach(tileJsonRequest => tileJsonRequest.abort());
        this.tileJsonRequests = [];
    }

    this.taskCount = this.countTasks();

    const { tiles } = this.props,
          layerId = layer => {
            const meta = layer[Symbol.for("meta")];
            return meta.task.project + "_" + meta.task.id;
          };

    // Remove all previous imagery layers
    // and keep track of which ones were selected
    const prevSelectedLayers = [];

    this.state.imageryLayers.forEach(layer => {
      if (this.map.hasLayer(layer)) prevSelectedLayers.push(layerId(layer));
      layer.remove();
    });
    this.setState({imageryLayers: [], rightLayers: []});

    // Request new tiles
    return new Promise((resolve, reject) => {
      this.tileJsonRequests = [];

      // Set a zIndexGroup
      this.zIndexGroupMap = {};
      let zIdx = 1;
      for (let i = tiles.length - 1; i >= 0; i--){
        if (!tiles[i].zIndexGroup){
          const taskId = tiles[i].meta.task.id;
          if (!this.zIndexGroupMap[taskId]) this.zIndexGroupMap[taskId] = zIdx++;
          tiles[i].zIndexGroup = this.zIndexGroupMap[taskId];
        }
      }

      // Compute IoU scores
      // This gives us an idea of overlap between tasks
      // so that we can decide to show them in project map view
      this.ious = {};
      for (let i = tiles.length - 1; i >= 0; i--){
        const taskId = tiles[i].meta.task.id;
        if (this.ious[taskId] === undefined){
          for (let j = i - 1; j >= 0; j--){
            const tId = tiles[j].meta.task.id;
            if (tId === taskId) continue;
            if (!tiles[i].meta.task.extent || !tiles[j].meta.task.extent) continue;
            
            const iou = this.computeIOU(tiles[i].meta.task.extent, tiles[j].meta.task.extent);
            if (this.ious[taskId] === undefined){
              this.ious[taskId] = iou;
            }else{
              this.ious[taskId] = Math.max(this.ious[taskId], iou);
            }
          }
        }
      }
      this.ious[tiles[0].meta.task.id] = 0; // First task is always visible

      async.each(tiles, (tile, done) => {
        const { url, type, zIndexGroup } = tile;
        const meta = Utils.clone(tile.meta);

        let metaUrl = url + "metadata";
        let unitForward = value => value;
        let unitBackward = value => value;
        let queryParams = {};

        if (type == "plant"){
          if (meta.task && meta.task.orthophoto_bands && meta.task.orthophoto_bands.length === 2){
            // Single band, probably thermal dataset, in any case we can't render NDVI
            // because it requires 3 bands
            queryParams = {
              formula: 'Celsius',
              bands: 'L',
              color_map: 'magma'
            };
          }else if (meta.task && meta.task.orthophoto_bands){
            let formula = this.hasBands(["red", "green", "nir"], meta.task.orthophoto_bands) ? "NDVI" : "VARI";
            queryParams = {
              formula,
              bands: 'auto',
              color_map: 'rdylgn'
            };
          }else{
            // This should never happen?
            queryParams = {
              formula: 'NDVI',
              bands: 'RGN',
              color_map: 'rdylgn'
            };
          }
        }else if (type == "dsm" || type == "dtm"){
          queryParams = {
            hillshade: 6,
            color_map: 'viridis'
          };
          unitForward = value => {
            return unitSystem().elevation(value).value;
          };
          unitBackward = value => {
            let unitValue = unitSystem().elevation(0);
            unitValue.value = value;
            return toMetric(unitValue).value;
          };
        }

        if (meta.task.crop) queryParams.crop = 1;

        metaUrl += Utils.toSearchQuery(queryParams);

        this.tileJsonRequests.push($.getJSON(metaUrl)
          .done(mres => {
            const { scheme, name, maxzoom, statistics } = mres;

            const bounds = Leaflet.latLngBounds(
                [mres.bounds.value.slice(0, 2).reverse(), mres.bounds.value.slice(2, 4).reverse()]
              );

            // Build URL
            let tileUrl = mres.tiles[0];
            const TILESIZE = 512;
            
            // Set rescale
            if (statistics){
                const params = Utils.queryParams({search: tileUrl.slice(tileUrl.indexOf("?"))});
                if (statistics["1"]){
                    // Add rescale
                    let min = Infinity;
                    let max = -Infinity;
                    if (type === 'plant'){
                      // percentile
                      for (let b in statistics){
                        min = Math.min(statistics[b]["percentiles"][0]);
                        max = Math.max(statistics[b]["percentiles"][1]);
                      }
                    }else{
                      // min/max
                      for (let b in statistics){
                        min = Math.min(statistics[b]["min"]);
                        max = Math.max(statistics[b]["max"]);
                      }
                    }
                    params.rescale = encodeURIComponent(`${min},${max}`);              
                }else{
                    console.warn("Cannot find min/max statistics for dataset, setting to -1,1");
                    params.rescale = encodeURIComponent("-1,1");
                }
                
                params.size = TILESIZE;
                if (meta.task.crop) params.crop = 1;
                tileUrl = Utils.buildUrlWithQuery(tileUrl, params);
            }else{
                let params = { size: TILESIZE };
                if (meta.task.crop) params.crop = 1;
                tileUrl = Utils.buildUrlWithQuery(tileUrl, params);
            }

            const layer = Leaflet.tileLayer(tileUrl, {
                  bounds,
                  minZoom: 0,
                  maxZoom: maxzoom + 99,
                  maxNativeZoom: maxzoom - 1,
                  tileSize: TILESIZE,
                  tms: scheme === 'tms',
                  opacity: this.state.opacity / 100,
                  detectRetina: true,
                  zIndex: this.typeZIndex(type, zIndexGroup),
                });
            
            // Associate metadata with this layer
            let thermal = typeof(mres) === 'object' && mres.band_descriptions && 
                          Array.isArray(mres.band_descriptions) && mres.band_descriptions.length > 0 &&
                          mres.band_descriptions[0].indexOf("lwir") !== -1;

            meta.name = this.typeToHuman(type, this.props.thermal || thermal);
            meta.icon = this.typeToIcon(type, this.props.thermal || thermal);
            meta.type = type;
            meta.raster = true;
            meta.zIndexGroup = zIndexGroup;
            meta.autoExpand = this.taskCount === 1 && type === this.props.mapType;
            meta.metaUrl = metaUrl;
            meta.unitForward = unitForward;
            meta.unitBackward = unitBackward;
            if (this.taskCount > 1){
              // Assign to a group
              meta.group = {id: meta.task.id, name: meta.task.name};
            }
            layer[Symbol.for("meta")] = meta;
            layer[Symbol.for("tile-meta")] = mres;

            const iou = this.ious[meta.task.id] || 0;
            if (forceAddLayers || prevSelectedLayers.indexOf(layerId(layer)) !== -1){
              if (type === this.props.mapType && iou <= IOU_THRESHOLD){
                layer.addTo(this.map);
              }
            }

            // Show 3D switch button only if we have a single orthophoto
            if (this.taskCount === 1){
              this.setState({singleTask: meta.task});
            }

            // For some reason, getLatLng is not defined for tileLayer?
            // We need this function if other code calls layer.openPopup()
            const self = this;
            layer.getLatLng = function(){
              let latlng = self.lastClickedLatLng ? 
                            self.lastClickedLatLng : 
                            this.options.bounds.getCenter();
              return latlng;
            };

            // Additional layer methods
            layer.show = function(){
              if (!self.map.hasLayer(this)) self.map.addLayer(this);
              else this.getContainer().style.display = '';
            };
            layer.hide = function(){
              this.getContainer().style.display = 'none';
            };
            layer.isHidden = function(){
              if (!this.getContainer()) return false;
              return this.getContainer().style.display === 'none';
            };
            layer.setZIndex = function(z){
              if (this._originalZ === undefined) this._originalZ = this.options.zIndex;
              this.options.zIndex = z;
              this._updateZIndex();
            };
            layer.restoreZIndex = function(){
              if (this._originalZ !== undefined){
                this.setZIndex(this._originalZ);
              }
            };
            layer.bringToFront = function(){
              this.setZIndex(this.options.zIndex + 10000);
            };

            var popup = L.DomUtil.create('div', 'infoWindow');

            popup.innerHTML = `<div class="title">
                                    ${name}
                                </div>
                                <div class="popup-opacity-slider">Opacity: <input id="layerOpacity" class="opacity" type="range" value="${layer.options.opacity}" min="0" max="1" step="0.01" /></div>
                                <div>Bounds: [${layer.options.bounds.toBBoxString().split(",").join(", ")}]</div>
                                <div class="popup-download-assets loading">
                                  <i class="fa loading fa-spin fa-sync fa-spin fa-fw"></i>
                                </div>

                                <button
                                    onclick="location.href='${this.tdPopupButtonUrl(meta.task)}';"
                                    type="button"
                                    class="switchModeButton btn btn-sm btn-secondary">
                                    <i class="fa fa-cube"></i> 3D
                                </button>`;

            layer.bindPopup(popup);

            $('#layerOpacity', popup).on('change input', function() {
                layer.setOpacity($('#layerOpacity', popup).val());
            });
            
            this.setState(update(this.state, {
                imageryLayers: {$push: [layer]}
            }));

            let mapBounds = this.mapBounds || Leaflet.latLngBounds();
            mapBounds.extend(bounds);
            this.mapBounds = mapBounds;

            // Add camera shots layer if available
            if (meta.task && meta.task.camera_shots && !this.addedCameraShots[meta.task.id]){
                var camIcon = L.icon({
                  iconUrl: "/static/app/js/icons/marker-camera.png",
                  iconSize: [41, 46],
                  iconAnchor: [17, 46],
                });
                
                const shotsLayer = new L.MarkersCanvas();
                $.getJSON(meta.task.camera_shots)
                  .done((shots) => {
                    if (shots.type === 'FeatureCollection'){
                      let markers = [];

                      shots.features.forEach(s => {
                        let marker = L.marker(
                          [s.geometry.coordinates[1], s.geometry.coordinates[0]],
                          { icon: camIcon }
                        );
                        markers.push(marker);

                        if (s.properties && s.properties.filename){
                          let root = null;
                          const lazyrender = () => {
                              if (!root) root = document.createElement("div");
                              ReactDOM.render(<ImagePopup task={meta.task} feature={s}/>, root);
                              return root;
                          }

                          marker.bindPopup(L.popup(
                              {
                                  lazyrender,
                                  maxHeight: 450,
                                  minWidth: 320
                              }));
                        }
                      });

                      shotsLayer.addMarkers(markers, this.map);
                    }
                  });
                shotsLayer[Symbol.for("meta")] = {
                  name: _("Cameras"), 
                  icon: "fa fa-camera fa-fw",
                  zIndexGroup
                };
                if (this.taskCount > 1){
                  // Assign to a group
                  shotsLayer[Symbol.for("meta")].group = {id: meta.task.id, name: meta.task.name};
                }

                this.setState(update(this.state, {
                    overlays: {$push: [shotsLayer]}
                }));

                this.addedCameraShots[meta.task.id] = true;
            }

            // Add ground control points layer if available
            if (meta.task && meta.task.ground_control_points && !this.addedGroundControlPoints){
                const gcpIcon = L.icon({
                  iconUrl: "/static/app/js/icons/marker-gcp.png",
                  iconSize: [41, 46],
                  iconAnchor: [17, 46],
                });
                
                const gcpLayer = new L.MarkersCanvas();
                $.getJSON(meta.task.ground_control_points)
                  .done((gcps) => {
                    if (gcps.type === 'FeatureCollection'){
                      let markers = [];

                      gcps.features.forEach(gcp => {
                        let marker = L.marker(
                          [gcp.geometry.coordinates[1], gcp.geometry.coordinates[0]],
                          { icon: gcpIcon }
                        );
                        markers.push(marker);

                        if (gcp.properties && gcp.properties.observations){
                          let root = null;
                          const lazyrender = () => {
                                if (!root) root = document.createElement("div");
                                ReactDOM.render(<GCPPopup task={meta.task} feature={gcp}/>, root);
                                return root;
                          }

                          marker.bindPopup(L.popup(
                              {
                                  lazyrender,
                                  maxHeight: 450,
                                  minWidth: 320
                              }));
                        }
                      });

                      gcpLayer.addMarkers(markers, this.map);
                    }
                  });
                gcpLayer[Symbol.for("meta")] = {
                  name: _("Ground Control Points"), 
                  icon: "far fa-dot-circle fa-fw",
                  zIndexGroup
                };
                
                if (this.taskCount > 1){
                  // Assign to a group
                  gcpLayer[Symbol.for("meta")].group = {id: meta.task.id, name: meta.task.name};
                }

                this.setState(update(this.state, {
                    overlays: {$push: [gcpLayer]}
                }));

                this.addedGroundControlPoints = true;
            }

            done();
          })
          .fail((_, __, err) => done(err))
        );
      }, err => {
        if (err){
          if (err !== "abort"){
              this.setState({error: err.message || JSON.stringify(err)});
          }
          reject();
        }else resolve();
      });
    });
  }

  componentDidMount() {
    const { showBackground, tiles } = this.props;

    this.map = Leaflet.map(this.container, {
      scrollWheelZoom: true,
      positionControl: false,
      zoomControl: false,
      minZoom: 0,
      maxZoom: 24
    });

    this.map.on('viewreset', this.layerVisibilityCheck);
    this.map.on('zoomstart', this.layerVisibilityCheck);
    this.map.on('movestart', this.layerVisibilityCheck);

    // For some reason, in production this class is not added (but we need it)
    // leaflet bug?
    $(this.container).addClass("leaflet-touch");

    PluginsAPI.Map.onAddAnnotation(this.handleAddAnnotation);
    PluginsAPI.Map.onAnnotationDeleted(this.handleDeleteAnnotation);
    PluginsAPI.Map.onSideBySideChanged(this.handleSideBySideChange);

    PluginsAPI.Map.triggerWillAddControls({
        map: this.map,
        tiles,
        mapView: this
    });

    const UnitsCtrl = Leaflet.Control.extend({
      options: {
          position: 'bottomleft'
      },
  
      onAdd: function () {
          this.container = Leaflet.DomUtil.create('div', 'leaflet-control-units-selection leaflet-control');
          Leaflet.DomEvent.disableClickPropagation(this.container);
          ReactDOM.render(<UnitSelector />, this.container);
          return this.container;
      }
    });
    new UnitsCtrl().addTo(this.map);

    //add zoom control with your options
    let zoomControl = Leaflet.control.zoom({
         position:'bottomleft'
    }).addTo(this.map);

    if (showBackground) {
      this.basemaps = {};
      
      Basemaps.forEach((src, idx) => {
        const { url, ...props } = src;
        const tileProps = Utils.clone(props);
        tileProps.maxNativeZoom = tileProps.maxZoom;
        tileProps.maxZoom = tileProps.maxZoom + 99;
        const layer = L.tileLayer(url, tileProps);

        if (idx === 0) {
          layer.addTo(this.map);
        }

        this.basemaps[props.label] = layer;
      });

      const customLayer = L.layerGroup();
      customLayer.on("add", a => {
        const defaultCustomBm = window.localStorage.getItem('lastCustomBasemap') || 'https://tile.openstreetmap.org/{z}/{x}/{y}.png';
      
        let url = window.prompt([_('Enter a tile URL template. Valid coordinates are:'),
_('{z}, {x}, {y} for Z/X/Y tile scheme'),
_('{-y} for flipped TMS-style Y coordinates'),
'',
_('Example:'),
'https://tile.openstreetmap.org/{z}/{x}/{y}.png'].join("\n"), defaultCustomBm);
        
        if (url){
          customLayer.clearLayers();
          const l = L.tileLayer(url, {
            maxNativeZoom: 24,
            maxZoom: 99,
            minZoom: 0
          });
          customLayer.addLayer(l);
          l.bringToBack();
          window.localStorage.setItem('lastCustomBasemap', url);
        }
      });
      this.basemaps[_("Custom")] = customLayer;
      this.basemaps[_("None")] = L.layerGroup();
    }

    this.layersControl = new LayersControl({
        layers: this.state.imageryLayers,
        overlays: this.state.overlays,
        annotations: this.state.annotations
    }).addTo(this.map);

    this.autolayers = Leaflet.control.autolayers({
      overlays: {},
      selectedOverlays: [],
      baseLayers: this.basemaps
    }).addTo(this.map);

    // Drag & Drop overlays
    const addDnDZone = (container, opts) => {
        const mapTempLayerDrop = new Dropzone(container, opts);
        mapTempLayerDrop.on("addedfile", (file) => {
          this.setState({showLoading: true});
          addTempLayer(file, (err, tempLayer, filename) => {
            if (!err){
              tempLayer.addTo(this.map);
              tempLayer[Symbol.for("meta")] = {name: filename};
              this.setState(update(this.state, {
                 overlays: {$push: [tempLayer]}
              }));
              //zoom to all features
              this.map.fitBounds(tempLayer.getBounds());
            }else{
              this.setState({ error: err.message || JSON.stringify(err) });
            }
    
            this.setState({showLoading: false});
          });
        });
        mapTempLayerDrop.on("error", (file) => {
          mapTempLayerDrop.removeFile(file);
        });
    };

    addDnDZone(this.container, {url : "/", clickable : false});

    const AddOverlayCtrl = Leaflet.Control.extend({
        options: {
            position: 'topright'
        },
    
        onAdd: function () {
            this.container = Leaflet.DomUtil.create('div', 'leaflet-control-add-overlay leaflet-bar leaflet-control');
            Leaflet.DomEvent.disableClickPropagation(this.container);
            const btn = Leaflet.DomUtil.create('a', 'leaflet-control-add-overlay-button');
            btn.setAttribute("title", _("Add a temporary GeoJSON (.json) or ShapeFile (.zip) overlay"));
            
            this.container.append(btn);
            addDnDZone(btn, {url: "/", clickable: true});
            
            return this.container;
        }
    });
    new AddOverlayCtrl().addTo(this.map);

    if (this.props.permissions.indexOf("change") !== -1){
      const updateCropArea = geojson => {
        // Find tasks IDs
        const taskMap = {};
        const requests = [];
        if (!geojson) geojson = '';

        // Crop affects all tasks in the map
        for (let layer of this.state.imageryLayers){
          if (layer._map){
            const meta = layer[Symbol.for("meta")];
            const task = meta.task;
            if (!taskMap[task.id]){
              requests.push($.ajax({
                url: `/api/projects/${task.project}/tasks/${task.id}/`,
                contentType: 'application/json',
                data: JSON.stringify({
                  crop: geojson
                }),
                dataType: 'json',
                type: 'PATCH'
              }));
              taskMap[task.id] = meta;
            }
          }
        }

        Promise.all(requests)
          .then(responses => {
            if (!Array.isArray(responses)){
              responses = [responses];
            }

            // Update task in meta and tiles objects
            responses.forEach(task => {
              if (!task) return;

              const meta = taskMap[task.id];
              meta.task = task;

              for (let i = 0; i < this.props.tiles.length; i++){
                const tile = this.props.tiles[i];
                if (tile.meta && tile.meta.task.id === task.id){
                  tile.meta.task = task;                  
                }
              }
            });
            
            this.loadImageryLayers();
          })
          .catch(e => {
            this.setState({error: _("Cannot set cropping area. Check your internet connection.")});
            console.error(e);
          }).finally(() => {
            setTimeout(() => {
              this.cropButton.deletePolygon({triggerEvents: false, fade: true});
            }, 1000);
          });
      };

      this.cropButton = new CropButton({
        position:'topright',
        color:'#fff',
        pulse: true,
        willCrop: () => {
          this.removeSideBySideCtrl();
          let foundCrop = false;

          for (let layer of this.state.imageryLayers){
            const meta = layer[Symbol.for("meta")];
            if (meta.task.crop){
              foundCrop = true;
              break;
            }
          }
          
          if (foundCrop){
            if (window.confirm(_('Are you sure you want to set a new crop area?'))){
              updateCropArea(null);
            }else{
              // Stop crop button from toggling
              return true;
            }
          }
        },
        onPolygonChange: updateCropArea
      });
      this.map.addControl(this.cropButton);
    }

    this.map.fitBounds([
     [13.772919746115805,
     45.664640939831735],
     [13.772825784981254,
     45.664591558975154]]);
    this.map.attributionControl.setPrefix("");

    this.setState({showLoading: true});
    this.loadImageryLayers(true).then(() => {
        this.setState({showLoading: false});
        this.map.fitBounds(this.mapBounds);

        this.map.on('click', e => {
          if (PluginsAPI.Map.handleClick(e)) return;
          if (this.sideBySideCtrl) return;
          
          // Find first visible tile layer at the selected coordinates 
          for (let layer of this.state.imageryLayers){
            if (layer._map && !layer.isHidden() && layer.options.bounds.contains(e.latlng)){
              this.lastClickedLatLng = this.map.mouseEventToLatLng(e.originalEvent);
              this.updatePopupFor(layer);
              layer.openPopup();
              break;
            }
          }
        }).on('popupopen', e => {
            // Load task assets links in popup
            if (e.popup && e.popup._source && e.popup._content && !e.popup.options.lazyrender){
                const infoWindow = e.popup._content;
                if (typeof infoWindow === 'string') return;
                
                const $downloadAssets = $(".popup-download-assets", infoWindow);
                if ($downloadAssets.length > 0 && $downloadAssets.hasClass('loading')){
                  const {id, project} = (e.popup._source[Symbol.for("meta")] || {}).task;
                  
                  $.getJSON(`/api/projects/${project}/tasks/${id}/`)
                  .done(task => {
                    if (task){
                      let hideItems = [];
                      if (this.props.permissions.indexOf("change") === -1){
                        if (task.crop){
                          hideItems = ["all.zip", "backup.zip"];
                        }else{
                          hideItems = ["backup.zip"];
                        }
                      }

                      ReactDOM.render(<AssetDownloadButtons task={task} 
                                      showLabel={false} 
                                      buttonClass="btn-secondary"
                                      hideItems={hideItems} 
                                      modalContainer={this.modalContainer} />, $downloadAssets.get(0));
                    }
                  })
                  .fail(() => {
                      $downloadAssets.append($(_("Error: cannot load assets list.")));
                  })
                  .always(() => {
                      $downloadAssets.removeClass('loading');
                  });
                }
            }

            if (e.popup && e.popup.options.lazyrender){
                e.popup.setContent(e.popup.options.lazyrender());
            }
        });
    }).catch(e => {
        this.setState({showLoading: false, error: e.message});
    });
    
    PluginsAPI.Map.triggerDidAddControls({
      map: this.map,
      tiles: tiles,
      controls:{
        autolayers: this.autolayers,
        zoom: zoomControl
      }
    });

    PluginsAPI.Map.triggerAddActionButton({
      map: this.map,
      tiles
    }, (button) => {
      this.setState(update(this.state, {
        pluginActionButtons: {$push: [button]}
      }));
    });
  }

  handleAddAnnotation = (layer, name, task, stored) => {
      const zIndexGroup = this.zIndexGroupMap[task.id] || 1;
      
      const meta = {
        name: name || "", 
        icon: "fa fa-sticky-note fa-fw",
        zIndexGroup
      };

      if (this.taskCount > 1 && task){
        meta.group = {id: task.id, name: task.name};
        
        if (stored){
          // Only show annotations for top-most tasks
          if (this.ious[task.id] >= 0.01){
            PluginsAPI.Map.toggleAnnotation(layer, false);
          }
        }
      }
      layer[Symbol.for("meta")] = meta;

      this.setState(update(this.state, {
        annotations: {$push: [layer]}
     }));
  }

  handleDeleteAnnotation = (layer) => {
    this.setState({annotations: this.state.annotations.filter(l => l !== layer)});
  }

  handleSideBySideChange = (layer, side) => {
    let { rightLayers, imageryLayers } = this.state;

    imageryLayers.forEach(l => l.restoreZIndex());

    rightLayers = rightLayers.filter(l => l !== layer);
    if (side){
      rightLayers.push(layer);
    }
    rightLayers.forEach(l => l.bringToFront());

    this.setState({rightLayers});

    // Make sure to reset clipping
    imageryLayers.forEach(l => {
      let container = l.getContainer();
      if (container) container.style.clip = '';
    });

    if (rightLayers.length > 0){
      if (!this.sideBySideCtrl){
        this.sideBySideCtrl = L.control.sideBySide([], rightLayers).addTo(this.map);
      }else{
        this.sideBySideCtrl.setRightLayers(rightLayers);
      }
    }else{
      this.removeSideBySideCtrl();
    }
  }

  removeSideBySideCtrl = () => {
    if (this.sideBySideCtrl){
      this.sideBySideCtrl.remove();
      this.sideBySideCtrl = null;
    }
  }

  layerVisibilityCheck = () => {
    // Check if imageryLayers are invisible and remove them to prevent tiles from loading
    this.state.imageryLayers.forEach(layer => {
      if (layer.isHidden()) this.map.removeLayer(layer);
    }); 
  }

  componentDidUpdate(prevProps, prevState) {
    this.state.imageryLayers.forEach(imageryLayer => {
      imageryLayer.setOpacity(this.state.opacity / 100);
      this.updatePopupFor(imageryLayer);
    });

    if (this.layersControl && prevProps.mapType !== this.props.mapType){
      PluginsAPI.Map.mapTypeChanged(this.props.mapType, this.taskCount === 1);
    }

    if (this.layersControl && (prevState.imageryLayers !== this.state.imageryLayers ||
                            prevState.overlays !== this.state.overlays ||
                            prevState.annotations !== this.state.annotations)){
      this.updateLayersControl();
    }
  }

  updateLayersControl = () => {
    this.layersControl.update(this.state.imageryLayers, this.state.overlays, this.state.annotations);
  }

  componentWillUnmount() {
    this.map.remove();
    this.map.off('viewreset', this.layerVisibilityCheck);
    this.map.off('zoomstart', this.layerVisibilityCheck);
    this.map.off('movestart', this.layerVisibilityCheck);

    if (this.tileJsonRequests) {
      this.tileJsonRequests.forEach(tileJsonRequest => tileJsonRequest.abort());
      this.tileJsonRequests = [];
    }

    PluginsAPI.Map.offAddAnnotation(this.handleAddAnnotation);
    PluginsAPI.Map.offAnnotationDeleted(this.handleAddAnnotation);
    PluginsAPI.Map.offSideBySideChanged(this.handleSideBySideChange);
  }

  handleMapMouseDown(e){
    // Make sure the share popup closes
    if (this.shareButton) this.shareButton.hidePopup();
  }

  render() {
    return (
      <div style={{height: "100%"}} className="map">
        <div className="map-modal-container" ref={(domNode) => this.modalContainer = domNode}></div>

        <ErrorMessage bind={[this, 'error']} />
        <div className="opacity-slider theme-secondary hidden-xs">
            <div className="opacity-slider-label">{_("Opacity:")}</div> <input type="range" className="opacity" step="1" value={this.state.opacity} onChange={this.updateOpacity} />
        </div>

        <Standby 
            message={_("Loading...")}
            show={this.state.showLoading}
            />
            
        <div 
          style={{height: "100%"}}
          ref={(domNode) => (this.container = domNode)}
          onMouseDown={this.handleMapMouseDown}
        />

        <div className="actionButtons">
          
          {this.state.pluginActionButtons.map((button, i) => <div key={i}>{button}</div>)}
          {((this.state.singleTask || this.props.project) && this.props.shareButtons && !this.props.public) ? 
            <ShareButton 
              ref={(ref) => { this.shareButton = ref; }}
              task={this.state.singleTask}
              project={this.props.project}
              linksTarget="map"
              queryParams={{t: this.props.mapType}}
            />
          : ""}
          
          <SwitchModeButton 
            task={this.state.singleTask}
            type="mapToModel" 
            public={this.props.public} />
        </div>
      </div>
    );
  }
}

export default Map;
