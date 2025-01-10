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
import update from 'immutability-helper';
import Utils from '../classes/Utils';
import '../vendor/leaflet/Leaflet.Ajax';
import 'rbush';
import '../vendor/leaflet/leaflet-markers-canvas';
import { _ } from '../classes/gettext';
import UnitSelector from './UnitSelector';
import { unitSystem, toMetric } from '../classes/Units';

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
    thermal: PropTypes.bool
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
      annotations: []
    };

    this.basemaps = {};
    this.mapBounds = null;
    this.autolayers = null;
    this.addedCameraShots = {};

    this.loadImageryLayers = this.loadImageryLayers.bind(this);
    this.updatePopupFor = this.updatePopupFor.bind(this);
    this.handleMapMouseDown = this.handleMapMouseDown.bind(this);
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

  typeToHuman = (type) => {
      switch(type){
          case "orthophoto":
              return _("Orthophoto");
          case "plant":
              return this.props.thermal ? _("Thermal") : _("Plant Health");
          case "dsm":
              return _("DSM");
          case "dtm":
              return _("DTM");
      }
      return "";
  }

  typeToIcon = (type) => {
    switch(type){
        case "orthophoto":
            return "far fa-image fa-fw"
        case "plant":
            return this.props.thermal ? "fa fa-thermometer-half fa-fw" : "fa fa-seedling fa-fw";
        case "dsm":
        case "dtm":
            return "fa fa-chart-area fa-fw";
    }
    return "";
  }

  hasBands = (bands, orthophoto_bands) => {
    if (!orthophoto_bands) return false;

    for (let i = 0; i < bands.length; i++){
      if (orthophoto_bands.find(b => b.description !== null && b.description.toLowerCase() === bands[i].toLowerCase()) === undefined) return false;
    }
    
    return true;
  }

  loadImageryLayers(forceAddLayers = false){
    // Cancel previous requests
    if (this.tileJsonRequests) {
        this.tileJsonRequests.forEach(tileJsonRequest => tileJsonRequest.abort());
        this.tileJsonRequests = [];
    }

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
    this.setState({imageryLayers: []});

    // Request new tiles
    return new Promise((resolve, reject) => {
      this.tileJsonRequests = [];

      async.each(tiles, (tile, done) => {
        const { url, meta, type } = tile;
        
        let metaUrl = url + "metadata";
        let unitForward = value => value;
        let unitBackward = value => value;

        if (type == "plant"){
          if (meta.task && meta.task.orthophoto_bands && meta.task.orthophoto_bands.length === 2){
            // Single band, probably thermal dataset, in any case we can't render NDVI
            // because it requires 3 bands
            metaUrl += "?formula=Celsius&bands=L&color_map=magma";
          }else if (meta.task && meta.task.orthophoto_bands){
            let formula = this.hasBands(["red", "green", "nir"], meta.task.orthophoto_bands) ? "NDVI" : "VARI";
            metaUrl += `?formula=${formula}&bands=auto&color_map=rdylgn`;
          }else{
            // This should never happen?
            metaUrl += "?formula=NDVI&bands=RGN&color_map=rdylgn";
          }
        }else if (type == "dsm" || type == "dtm"){
          metaUrl += "?hillshade=6&color_map=viridis";
          unitForward = value => {
            return unitSystem().elevation(value).value;
          };
          unitBackward = value => {
            let unitValue = unitSystem().elevation(0);
            unitValue.value = value;
            return toMetric(unitValue).value;
          };
        }

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
                    params["rescale"] = encodeURIComponent(`${min},${max}`);              
                }else{
                    console.warn("Cannot find min/max statistics for dataset, setting to -1,1");
                    params["rescale"] = encodeURIComponent("-1,1");
                }
                
                params["size"] = TILESIZE;
                tileUrl = Utils.buildUrlWithQuery(tileUrl, params);
            }else{
                tileUrl = Utils.buildUrlWithQuery(tileUrl, { size: TILESIZE });
            }

            const layer = Leaflet.tileLayer(tileUrl, {
                  bounds,
                  minZoom: 0,
                  maxZoom: maxzoom + 99,
                  maxNativeZoom: maxzoom - 1,
                  tileSize: TILESIZE,
                  tms: scheme === 'tms',
                  opacity: this.state.opacity / 100,
                  detectRetina: true
                });
            
            // Associate metadata with this layer
            meta.name = this.typeToHuman(type);
            meta.icon = this.typeToIcon(type);
            meta.metaUrl = metaUrl;
            meta.unitForward = unitForward;
            meta.unitBackward = unitBackward;
            if (this.props.tiles.length > 1){
              // Assign to a group
              meta.group = {id: meta.task.id, name: meta.task.name};
            }
            layer[Symbol.for("meta")] = meta;
            layer[Symbol.for("tile-meta")] = mres;

            if (forceAddLayers || prevSelectedLayers.indexOf(layerId(layer)) !== -1){
              layer.addTo(this.map);
            }

            // Show 3D switch button only if we have a single orthophoto
            if (tiles.length === 1){
              this.setState({singleTask: meta.task});
            }

            // For some reason, getLatLng is not defined for tileLayer?
            // We need this function if other code calls layer.openPopup()
            let self = this;
            layer.getLatLng = function(){
              let latlng = self.lastClickedLatLng ? 
                            self.lastClickedLatLng : 
                            this.options.bounds.getCenter();
              return latlng;
            };

            var popup = L.DomUtil.create('div', 'infoWindow');

            popup.innerHTML = `<div class="title">
                                    ${name}
                                </div>
                                <div class="popup-opacity-slider">Opacity: <input id="layerOpacity" type="range" value="${layer.options.opacity}" min="0" max="1" step="0.01" /></div>
                                <div>Bounds: [${layer.options.bounds.toBBoxString().split(",").join(", ")}]</div>
                                <ul class="asset-links loading">
                                    <li><i class="fa fa-spin fa-sync fa-spin fa-fw"></i></li>
                                </ul>

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
                shotsLayer[Symbol.for("meta")] = {name: _("Cameras"), icon: "fa fa-camera fa-fw"};
                if (this.props.tiles.length > 1){
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
                gcpLayer[Symbol.for("meta")] = {name: _("Ground Control Points"), icon: "far fa-dot-circle fa-fw"};
                if (this.props.tiles.length > 1){
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

    // For some reason, in production this class is not added (but we need it)
    // leaflet bug?
    $(this.container).addClass("leaflet-touch");

    PluginsAPI.Map.onAddAnnotation(this.handleAddAnnotation);
    PluginsAPI.Map.onAnnotationDeleted(this.handleDeleteAnnotation);

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
          
          // Find first tile layer at the selected coordinates 
          for (let layer of this.state.imageryLayers){
            if (layer._map && layer.options.bounds.contains(e.latlng)){
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

                const $assetLinks = $("ul.asset-links", infoWindow);
                
                if ($assetLinks.length > 0 && $assetLinks.hasClass('loading')){
                    const {id, project} = (e.popup._source[Symbol.for("meta")] || {}).task;

                    $.getJSON(`/api/projects/${project}/tasks/${id}/`)
                        .done(res => {
                            const { available_assets } = res;
                            const assets = AssetDownloads.excludeSeparators();
                            const linksHtml = assets.filter(a => available_assets.indexOf(a.asset) !== -1)
                                              .map(asset => {
                                                    return `<li><a href="${asset.downloadUrl(project, id)}">${asset.label}</a></li>`;
                                              })
                                              .join("");
                            $assetLinks.append($(linksHtml));
                        })
                        .fail(() => {
                            $assetLinks.append($("<li>" + _("Error: cannot load assets list.") + "</li>"));
                        })
                        .always(() => {
                            $assetLinks.removeClass('loading');
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

  handleAddAnnotation = (layer, name, task) => {
      const meta = {
        name: name || "", 
        icon: "fa fa-sticky-note fa-fw"
      };
      if (this.props.tiles.length > 1 && task){
        meta.group = {id: task.id, name: task.name};
      }
      layer[Symbol.for("meta")] = meta;

      this.setState(update(this.state, {
        annotations: {$push: [layer]}
     }));
  }

  handleDeleteAnnotation = (layer) => {
    this.setState({annotations: this.state.annotations.filter(l => l !== layer)});
  }

  componentDidUpdate(prevProps, prevState) {
    this.state.imageryLayers.forEach(imageryLayer => {
      imageryLayer.setOpacity(this.state.opacity / 100);
      this.updatePopupFor(imageryLayer);
    });

    if (prevProps.tiles !== this.props.tiles){
      this.loadImageryLayers(true);
    }

    if (this.layersControl && (prevState.imageryLayers !== this.state.imageryLayers ||
                            prevState.overlays !== this.state.overlays ||
                            prevState.annotations !== this.state.annotations)){
        this.layersControl.update(this.state.imageryLayers, this.state.overlays, this.state.annotations);
    }
  }

  componentWillUnmount() {
    this.map.remove();

    if (this.tileJsonRequests) {
      this.tileJsonRequests.forEach(tileJsonRequest => tileJsonRequest.abort());
      this.tileJsonRequests = [];
    }

    PluginsAPI.Map.offAddAnnotation(this.handleAddAnnotation);
    PluginsAPI.Map.offAnnotationDeleted(this.handleAddAnnotation);
    
  }

  handleMapMouseDown(e){
    // Make sure the share popup closes
    if (this.shareButton) this.shareButton.hidePopup();
  }

  render() {
    return (
      <div style={{height: "100%"}} className="map">
        <ErrorMessage bind={[this, 'error']} />
        <div className="opacity-slider theme-secondary hidden-xs">
            <div className="opacity-slider-label">{_("Opacity:")}</div> <input type="range" step="1" value={this.state.opacity} onChange={this.updateOpacity} />
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
          {(this.props.shareButtons && !this.props.public && this.state.singleTask !== null) ? 
            <ShareButton 
              ref={(ref) => { this.shareButton = ref; }}
              task={this.state.singleTask} 
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
