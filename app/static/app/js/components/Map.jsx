import React from 'react';
import '../css/Map.scss';
import 'leaflet/dist/leaflet.css';
import Leaflet from 'leaflet';
import async from 'async';
import '../vendor/leaflet/L.Control.MousePosition.css';
import '../vendor/leaflet/L.Control.MousePosition';
import '../vendor/leaflet/Leaflet.Autolayers/css/leaflet.auto-layers.css';
import '../vendor/leaflet/Leaflet.Autolayers/leaflet-autolayers';
import Dropzone from '../vendor/dropzone';
import $ from 'jquery';
import ErrorMessage from './ErrorMessage';
import SwitchModeButton from './SwitchModeButton';
import ShareButton from './ShareButton';
import AssetDownloads from '../classes/AssetDownloads';
import {addTempLayer} from '../classes/TempLayer';
import PropTypes from 'prop-types';
import PluginsAPI from '../classes/plugins/API';
import Basemaps from '../classes/Basemaps';
import Standby from './Standby';
import update from 'immutability-helper';

class Map extends React.Component {
  static defaultProps = {
    maxzoom: 18,
    minzoom: 0,
    showBackground: false,
    opacity: 100,
    mapType: "orthophoto",
    public: false
  };

  static propTypes = {
    maxzoom: PropTypes.number,
    minzoom: PropTypes.number,
    showBackground: PropTypes.bool,
    tiles: PropTypes.array.isRequired,
    opacity: PropTypes.number,
    mapType: PropTypes.oneOf(['orthophoto', 'dsm', 'dtm']),
    public: PropTypes.bool
  };

  constructor(props) {
    super(props);
    
    this.state = {
      error: "",
      singleTask: null, // When this is set to a task, show a switch mode button to view the 3d model
      pluginActionButtons: [],
      showLoading: false
    };

    this.imageryLayers = [];
    this.basemaps = {};
    this.mapBounds = null;
    this.autolayers = null;

    this.loadImageryLayers = this.loadImageryLayers.bind(this);
    this.updatePopupFor = this.updatePopupFor.bind(this);
    this.handleMapMouseDown = this.handleMapMouseDown.bind(this);
  }

  updatePopupFor(layer){
    const popup = layer.getPopup();
    $('#layerOpacity', popup.getContent()).val(layer.options.opacity);
  }

  loadImageryLayers(forceAddLayers = false){
    const { tiles } = this.props,
          layerId = layer => {
            const meta = layer[Symbol.for("meta")];
            return meta.task.project + "_" + meta.task.id;
          };

    // Remove all previous imagery layers
    // and keep track of which ones were selected
    const prevSelectedLayers = [];

    this.imageryLayers.forEach(layer => {
      this.autolayers.removeLayer(layer);
      if (this.map.hasLayer(layer)) prevSelectedLayers.push(layerId(layer));
      layer.remove();
    });
    this.imageryLayers = [];

    // Request new tiles
    return new Promise((resolve, reject) => {
      this.tileJsonRequests = [];

      async.each(tiles, (tile, done) => {
        const { url, meta } = tile;

        this.tileJsonRequests.push($.getJSON(url)
          .done(info => {
            const bounds = Leaflet.latLngBounds(
                [info.bounds.slice(0, 2).reverse(), info.bounds.slice(2, 4).reverse()]
              );
            const layer = Leaflet.tileLayer(info.tiles[0], {
                  bounds,
                  minZoom: info.minzoom,
                  maxZoom: L.Browser.retina ? (info.maxzoom + 1) : info.maxzoom,
                  maxNativeZoom: L.Browser.retina ? (info.maxzoom - 1) : info.maxzoom,
                  tms: info.scheme === 'tms',
                  opacity: this.props.opacity / 100,
                  detectRetina: true
                });
            
            // Associate metadata with this layer
            meta.name = info.name;
            layer[Symbol.for("meta")] = meta;

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
                                    ${info.name}
                                </div>
                                <div class="popup-opacity-slider">Opacity: <input id="layerOpacity" type="range" value="${layer.options.opacity}" min="0" max="1" step="0.01" /></div>
                                <div>Bounds: [${layer.options.bounds.toBBoxString().split(",").join(", ")}]</div>
                                <ul class="asset-links loading">
                                    <li><i class="fa fa-spin fa-refresh fa-spin fa-fw"></i></li>
                                </ul>

                                <button
                                    onclick="location.href='/3d/project/${meta.task.project}/task/${meta.task.id}/';"
                                    type="button"
                                    class="switchModeButton btn btn-sm btn-secondary">
                                    <i class="fa fa-cube"></i> 3D
                                </button>`;

            layer.bindPopup(popup);

            $('#layerOpacity', popup).on('change input', function() {
                layer.setOpacity($('#layerOpacity', popup).val());
            });
            
            this.imageryLayers.push(layer);

            let mapBounds = this.mapBounds || Leaflet.latLngBounds();
            mapBounds.extend(bounds);
            this.mapBounds = mapBounds;

            // Add layer to layers control
            this.autolayers.addOverlay(layer, info.name);

            done();
          })
          .fail((_, __, err) => done(err))
        );
      }, err => {
        if (err){
          this.setState({error: err.message || JSON.stringify(err)});
          reject(err);
        }else{
          resolve();
        }
      });
    });
  }

  componentDidMount() {
    var mapTempLayerDrop = new Dropzone(this.container, {url : "/", clickable : false});
    mapTempLayerDrop.on("addedfile", (file) => {
      this.setState({showLoading: true});
      addTempLayer(file, (err, tempLayer, filename) => {
        if (!err){
          tempLayer.addTo(this.map);
          //add layer to layer switcher with file name
          this.autolayers.addOverlay(tempLayer, filename);
          //zoom to all features
          this.map.fitBounds(tempLayer.getBounds());
        }else{
          this.setState({ error: err.message || JSON.stringify(err) });
        }

        this.setState({showLoading: false});
      });
    });
    mapTempLayerDrop.on("error", function(file) {
      mapTempLayerDrop.removeFile(file);
    });
    
    const { showBackground, tiles } = this.props;

    this.map = Leaflet.map(this.container, {
      scrollWheelZoom: true,
      positionControl: true,
      zoomControl: false
    });

    PluginsAPI.Map.triggerWillAddControls({
      map: this.map,
      tiles
    });

    Leaflet.control.scale({
      maxWidth: 250,
    }).addTo(this.map);

    //add zoom control with your options
    Leaflet.control.zoom({
         position:'bottomleft'
    }).addTo(this.map);

    if (showBackground) {
      this.basemaps = {};
      
      Basemaps.forEach((src, idx) => {
        const { url, ...props } = src;
        const layer = L.tileLayer(url, props);

        if (idx === 0) {
          layer.addTo(this.map);
        }

        this.basemaps[props.label] = layer;
      });

      const customLayer = L.layerGroup();
      customLayer.on("add", a => {
        let url = window.prompt(`Enter a tile URL template. Valid tokens are:
{z}, {x}, {y} for Z/X/Y tile scheme
{-y} for flipped TMS-style Y coordinates

Example:
https://a.tile.openstreetmap.org/{z}/{x}/{y}.png
`, 'https://a.tile.openstreetmap.org/{z}/{x}/{y}.png');
        
        if (url){
          customLayer.clearLayers();
          const l = L.tileLayer(url, {
            maxZoom: 21,
            minZoom: 0
          });
          customLayer.addLayer(l);
          l.bringToBack();
        }
      });
      this.basemaps["Custom"] = customLayer;
      this.basemaps["None"] = L.layerGroup();
    }

    this.autolayers = Leaflet.control.autolayers({
      overlays: {},
      selectedOverlays: [],
      baseLayers: this.basemaps
    }).addTo(this.map);

    this.map.fitWorld();
    this.map.attributionControl.setPrefix("");

    this.loadImageryLayers(true).then(() => {
        this.map.fitBounds(this.mapBounds);

        this.map.on('click', e => {
          // Find first tile layer at the selected coordinates 
          for (let layer of this.imageryLayers){
            if (layer._map && layer.options.bounds.contains(e.latlng)){
              this.lastClickedLatLng = this.map.mouseEventToLatLng(e.originalEvent);
              this.updatePopupFor(layer);
              layer.openPopup();
              break;
            }
          }
        }).on('popupopen', e => {
            // Load task assets links in popup
            if (e.popup && e.popup._source && e.popup._content){
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
                            $assetLinks.append($("<li>Error: cannot load assets list. </li>"));
                        })
                        .always(() => {
                            $assetLinks.removeClass('loading');
                        });
                }
            }
        });
    });

    PluginsAPI.Map.triggerDidAddControls({
      map: this.map,
      tiles: tiles
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

  componentDidUpdate(prevProps) {
    this.imageryLayers.forEach(imageryLayer => {
      imageryLayer.setOpacity(this.props.opacity / 100);
      this.updatePopupFor(imageryLayer);
    });

    if (prevProps.tiles !== this.props.tiles){
      this.loadImageryLayers();
    }
  }

  componentWillUnmount() {
    this.map.remove();

    if (this.tileJsonRequests) {
      this.tileJsonRequests.forEach(tileJsonRequest => this.tileJsonRequest.abort());
      this.tileJsonRequests = [];
    }
  }

  handleMapMouseDown(e){
    // Make sure the share popup closes
    if (this.shareButton) this.shareButton.hidePopup();
  }

  render() {
    return (
      <div style={{height: "100%"}} className="map">
        <ErrorMessage bind={[this, 'error']} />
        <Standby 
            message="Loading..."
            show={this.state.showLoading}
            />
            
        <div 
          style={{height: "100%"}}
          ref={(domNode) => (this.container = domNode)}
          onMouseDown={this.handleMapMouseDown}
          >
        </div>
        

        <div className="actionButtons">
          {this.state.pluginActionButtons.map((button, i) => <div key={i}>{button}</div>)}
          {(!this.props.public && this.state.singleTask !== null) ? 
            <ShareButton 
              ref={(ref) => { this.shareButton = ref; }}
              task={this.state.singleTask} 
              linksTarget="map"
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
