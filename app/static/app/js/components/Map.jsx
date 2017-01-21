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
    opacity: 100
  };

  static propTypes = {
    maxzoom: React.PropTypes.number,
    minzoom: React.PropTypes.number,
    showBackground: React.PropTypes.bool,
    tiles: React.PropTypes.array.isRequired,
    opacity: React.PropTypes.number
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
  }

  componentDidMount() {
    const { showBackground, tiles } = this.props;
    const assets = AssetDownloads.excludeSeparators();

    this.map = Leaflet.map(this.container, {
      scrollWheelZoom: true,
      measureControl: true,
      positionControl: true
    });

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

    this.map.fitWorld();

    Leaflet.control.scale({
      maxWidth: 250,
    }).addTo(this.map);
    this.map.attributionControl.setPrefix("");

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
                tms: info.scheme === 'tms'
              }).addTo(this.map);

          // Associate metadata with this layer
          meta.name = info.name;
          layer[Symbol.for("meta")] = meta;

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

          done();
        })
        .fail((_, __, err) => done(err))
      );

    }, err => {
      if (err) this.setState({error: err.message});
      else{
        this.map.fitBounds(this.mapBounds);

        // Add basemaps / layers control
        let overlays = {};
        this.imageryLayers.forEach(layer => {
            const meta = layer[Symbol.for("meta")];
            overlays[meta.name] = layer;
          });

        Leaflet.control.autolayers({
          overlays: overlays,
          selectedOverlays: [],
          baseLayers: this.basemaps
        }).addTo(this.map);

        this.map.on('click', e => {
          // Find first tile layer at the selected coordinates 
          for (let layer of this.imageryLayers){
            if (layer._map && layer.options.bounds.contains(e.latlng)){
              layer.openPopup();
              break;
            }
          }
        });
      }
    });
  }

  componentDidUpdate() {
    this.imageryLayers.forEach(imageryLayer => {
      imageryLayer.setOpacity(this.props.opacity / 100);
    });
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