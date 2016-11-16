import React from 'react';
import '../css/Map.scss';
//import 'leaflet.css';
import 'leaflet/dist/leaflet.css';
import 'leaflet-basemaps/L.Control.Basemaps.css';
import Leaflet from 'leaflet';
import 'leaflet-basemaps/L.Control.Basemaps';
import $ from 'jquery';
import ErrorMessage from './ErrorMessage';

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
      bounds: null
    };

    this.imageryLayers = [];
  }

  componentDidMount() {
    const { showBackground, tiles } = this.props;

    this.leaflet = Leaflet.map(this.container, {
      scrollWheelZoom: true
    });

    if (showBackground) {
      const basemaps = [
        L.tileLayer('//{s}.google.com/vt/lyrs=s,h&x={x}&y={y}&z={z}', {
            attribution: 'Map data: &copy; Google Maps',
            subdomains: ['mt0','mt1','mt2','mt3'],
            maxZoom: 22,
            minZoom: 0,
            label: 'Google Maps Hybrid'
        }),
        L.tileLayer('//server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}', {
            attribution: 'Tiles &copy; Esri &mdash; Source: Esri, i-cubed, USDA, USGS, AEX, GeoEye, Getmapping, Aerogrid, IGN, IGP, UPR-EGP, and the GIS User Community',
            maxZoom: 22,
            minZoom: 0,
            label: 'ESRI Satellite'  // optional label used for tooltip
        }),
        L.tileLayer('//{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
            attribution: '&copy; <a href="http://www.openstreetmap.org/copyright">OpenStreetMap</a>',
            maxZoom: 22,
            minZoom: 0,
            label: 'OSM Mapnik'  // optional label used for tooltip
        })
      ];

      this.leaflet.addControl(Leaflet.control.basemaps({
          basemaps: basemaps,
          tileX: 0,  // tile X coordinate
          tileY: 0,  // tile Y coordinate
          tileZ: 1   // tile zoom level
      }));
    }

    this.leaflet.fitWorld();

    Leaflet.control.scale({
      maxWidth: 250,
    }).addTo(this.leaflet);
    this.leaflet.attributionControl.setPrefix("");

    this.tileJsonRequests = [];

    tiles.forEach(tile => {
      const { url, meta } = tile;

      this.tileJsonRequests.push($.getJSON(url)
          .done(info => {
            const bounds = [info.bounds.slice(0, 2).reverse(), info.bounds.slice(2, 4).reverse()];

            const layer = Leaflet.tileLayer(info.tiles[0], {
              bounds,
              minZoom: info.minzoom,
              maxZoom: info.maxzoom,
              tms: info.scheme === 'tms'
            }).addTo(this.leaflet);

            // Associate metadata with this layer
            layer[Symbol.for("meta")] = meta;

            this.imageryLayers.push(layer);

            let mapBounds = this.state.bounds || Leaflet.latLngBounds(bounds);
            mapBounds.extend(bounds);
            this.setState({bounds: mapBounds});
          })
          .fail((_, __, err) => this.setState({error: err.message}))
        );
    });
  }

  componentDidUpdate() {
    const { bounds } = this.state;

    if (bounds) this.leaflet.fitBounds(bounds);
    
    this.imageryLayers.forEach(imageryLayer => {
      imageryLayer.setOpacity(this.props.opacity / 100);
    });
  }

  componentWillUnmount() {
    this.leaflet.remove();

    if (this.tileJsonRequests) {
      this.tileJsonRequests.forEach(tileJsonRequest => this.tileJsonRequest.abort());
      this.tileJsonRequests = [];
    }
  }

  render() {
    return (
      <div style={{height: "100%"}}>
        <ErrorMessage bind={[this, 'error']} />
        <div 
          style={{height: "100%"}}
          ref={(domNode) => (this.container = domNode)}
        />
      </div>
    );
  }
}

export default Map;