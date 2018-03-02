import React from 'react';
import '../css/Map.scss';
import 'leaflet/dist/leaflet.css';
import Leaflet from 'leaflet';
import async from 'async';
import '../vendor/leaflet/L.Control.MousePosition.css';
import '../vendor/leaflet/L.Control.MousePosition';
import '../vendor/leaflet/Leaflet.Autolayers/css/leaflet.auto-layers.css';
import '../vendor/leaflet/Leaflet.Autolayers/leaflet-autolayers';
import $ from 'jquery';
import ErrorMessage from './ErrorMessage';
import SwitchModeButton from './SwitchModeButton';
import ShareButton from './ShareButton';
import AssetDownloads from '../classes/AssetDownloads';
import PropTypes from 'prop-types';
import PluginsAPI from '../classes/plugins/API';

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
      singleTask: null // When this is set to a task, show a switch mode button to view the 3d model
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
          assets = AssetDownloads.excludeSeparators(),
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
                  maxZoom: info.maxzoom,
                  tms: info.scheme === 'tms',
                  opacity: this.props.opacity / 100
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
            layer.getLatLng = function(){
              return this.options.bounds.getCenter();
            };

            var popup = L.DomUtil.create('div', 'infoWindow');

            popup.innerHTML = `<div class="title">
                                    ${info.name}
                                </div>
                                <div class="popup-opacity-slider">Opacity: <input id="layerOpacity" type="range" value="${layer.options.opacity}" min="0" max="1" step="0.01" /></div>
                                <div>Bounds: [${layer.options.bounds.toBBoxString().split(",").join(", ")}]</div>
                                    <ul class="asset-links">
                                    ${assets.map(asset => {
                                        return `<li><a href="${asset.downloadUrl(meta.task.project, meta.task.id)}">${asset.label}</a></li>`;
                                    }).join("")}
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
    const { showBackground } = this.props;

    this.map = Leaflet.map(this.container, {
      scrollWheelZoom: true,
      positionControl: true,
      zoomControl: false
    });

    PluginsAPI.Map.triggerWillAddControls({
      map: this.map
    });

    Leaflet.control.scale({
      maxWidth: 250,
    }).addTo(this.map);

    //add zoom control with your options
    Leaflet.control.zoom({
         position:'bottomleft'
    }).addTo(this.map);

    if (showBackground) {
      this.basemaps = {
        "Google Maps Hybrid": L.tileLayer('//{s}.google.com/vt/lyrs=s,h&x={x}&y={y}&z={z}', {
            attribution: 'Map data: &copy; Google Maps',
            subdomains: ['mt0','mt1','mt2','mt3'],
            maxZoom: 21,
            minZoom: 0,
            label: 'Google Maps Hybrid'
        }).addTo(this.map),
        "ESRI Satellite": L.tileLayer('//server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}', {
            attribution: 'Tiles &copy; Esri &mdash; Source: Esri, i-cubed, USDA, USGS, AEX, GeoEye, Getmapping, Aerogrid, IGN, IGP, UPR-EGP, and the GIS User Community',
            maxZoom: 21,
            minZoom: 0,
            label: 'ESRI Satellite'  // optional label used for tooltip
        }),
        "OSM Mapnik": L.tileLayer('//{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
            attribution: '&copy; <a href="http://www.openstreetmap.org/copyright">OpenStreetMap</a>',
            maxZoom: 21,
            minZoom: 0,
            label: 'OSM Mapnik'  // optional label used for tooltip
        })
      };
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
              this.updatePopupFor(layer);
              layer.openPopup();
              break;
            }
          }
        });
    });

    // PluginsAPI.events.addListener('Map::AddPanel', (e) => {
    //   console.log("Received response: " + e);
    // });
    PluginsAPI.Map.triggerDidAddControls({
      map: this.map
    });
  }

  componentDidUpdate(prevProps) {
    this.imageryLayers.forEach(imageryLayer => {
      imageryLayer.setOpacity(this.props.opacity / 100);
      this.updatePopupFor(imageryLayer);
    });

    if (prevProps.tiles !== this.props.tiles){
      this.loadImageryLayers().then(() => {
        // console.log("GOT: ", this.autolayers, this.autolayers.selectedOverlays);
      });
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
    this.shareButton.hidePopup();
  }

  render() {
    return (
      <div style={{height: "100%"}} className="map">
        <ErrorMessage bind={[this, 'error']} />

        <div 
          style={{height: "100%"}}
          ref={(domNode) => (this.container = domNode)}
          onMouseDown={this.handleMapMouseDown}
          >
        </div>
        

        <div className="actionButtons">
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
