import React from 'react';
import ReactDOMServer from 'react-dom/server';
import ReactDOM from 'react-dom';
import '../css/Map.scss';
import 'leaflet/dist/leaflet.css';
import Leaflet from 'leaflet';
import async from 'async';
import 'leaflet-measure/dist/leaflet-measure.css';
import 'leaflet-measure/dist/leaflet-measure';
import '../vendor/leaflet/L.Control.MousePosition.css';
import '../vendor/leaflet/L.Control.MousePosition';
import '../vendor/leaflet/Leaflet.Autolayers/css/leaflet.auto-layers.css';
import '../vendor/leaflet/Leaflet.Autolayers/leaflet-autolayers';
import $ from 'jquery';
import ErrorMessage from './ErrorMessage';
import SwitchModeButton from './SwitchModeButton';
import AssetDownloads from '../classes/AssetDownloads';

class Map extends React.Component {
  static defaultProps = {
    maxzoom: 18,
    minzoom: 0,
    showBackground: false,
    opacity: 100,
    mapType: "orthophoto"
  };

  static propTypes = {
    maxzoom: React.PropTypes.number,
    minzoom: React.PropTypes.number,
    showBackground: React.PropTypes.bool,
    tiles: React.PropTypes.array.isRequired,
    opacity: React.PropTypes.number,
    mapType: React.PropTypes.oneOf(['orthophoto', 'dsm', 'dtm'])
  };

  constructor(props) {
    super(props);
    
    this.state = {
      error: "",
      switchButtonTask: null // When this is set to a task, show a switch mode button to view the 3d model
    };

    this.imageryLayers = [];
    this.basemaps = {};
    this.mapBounds = null;
    this.autolayers = null;

    this.loadImageryLayers = this.loadImageryLayers.bind(this);
  }

  loadImageryLayers(forceAddLayers = false){
    const { tiles } = this.props,
          assets = AssetDownloads.excludeSeparators(),
          layerId = layer => {
            const meta = layer[Symbol.for("meta")];
            return meta.project + "_" + meta.task;
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
            const task = {
              id: meta.task,
              project: meta.project
            };

            if (tiles.length === 1){
              this.setState({switchButtonTask: task});
            }

            // For some reason, getLatLng is not defined for tileLayer?
            // We need this function if other code calls layer.openPopup()
            layer.getLatLng = function(){
              return this.options.bounds.getCenter();
            };

            layer.bindPopup(`<div class="title">${info.name}</div>
              <div>Bounds: [${layer.options.bounds.toBBoxString().split(",").join(", ")}]</div>
              <ul class="asset-links">
                ${assets.map(asset => {
                    return `<li><a href="${asset.downloadUrl(meta.project, meta.task)}">${asset.label}</a></li>`;
                }).join("")}
              </ul>

              <button 
                onclick="location.href='/3d/project/${task.project}/task/${task.id}/';"
                type="button"
                class="switchModeButton btn btn-sm btn-default btn-white">
                <i class="fa fa-cube"></i> 3D
              </button>
            `);
            
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
      positionControl: true
    });

    const measureControl = Leaflet.control.measure({
      primaryLengthUnit: 'meters',
      secondaryLengthUnit: 'feet',
      primaryAreaUnit: 'sqmeters',
      secondaryAreaUnit: 'acres'
    });
    measureControl.addTo(this.map);

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

    Leaflet.control.scale({
      maxWidth: 250,
    }).addTo(this.map);
    this.map.attributionControl.setPrefix("");

    this.loadImageryLayers(true).then(() => {
        this.map.fitBounds(this.mapBounds);

        this.map.on('click', e => {
          // Find first tile layer at the selected coordinates 
          for (let layer of this.imageryLayers){
            if (layer._map && layer.options.bounds.contains(e.latlng)){
              layer.openPopup();
              break;
            }
          }
        });
    });
  }

  componentDidUpdate(prevProps) {
    this.imageryLayers.forEach(imageryLayer => {
      imageryLayer.setOpacity(this.props.opacity / 100);
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

  render() {
    return (
      <div style={{height: "100%"}} className="map">
        <ErrorMessage bind={[this, 'error']} />
        <div 
          style={{height: "100%"}}
          ref={(domNode) => (this.container = domNode)}>
          <SwitchModeButton 
            task={this.state.switchButtonTask}
            type="mapToModel" />
        </div>
      </div>
    );
  }
}

export default Map;