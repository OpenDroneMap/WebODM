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
    bounds: [[-90, -180], [90, 180]],
    maxzoom: 18,
    minzoom: 0,
    scheme: 'tms',
    showBackground: false,
    opacity: 100,
    url: "",
    error: ""
  }

  static propTypes() {
    return {
      bounds: React.PropTypes.array,
      maxzoom: React.PropTypes.integer,
      minzoom: React.PropTypes.integer,
      scheme: React.PropTypes.string, // either 'tms' or 'xyz'
      showBackground: React.PropTypes.boolean,
      showControls: React.PropTypes.boolean,
      tileJSON: React.PropTypes.string,
      url: React.PropTypes.string
    };
  }

  constructor(props) {
    super(props);
    
    this.state = {
        bounds: this.props.bounds,
        maxzoom: this.props.maxzoom,
        minzoom: this.props.minzoom
    };
  }

  componentDidMount() {
    const { showBackground, tileJSON } = this.props;
    const { bounds, maxzoom, minzoom, scheme, url } = this.state;

    if (tileJSON != null) {
        this.tileJsonRequest = $.getJSON(tileJSON)
            .done(info => {
              const bounds = [info.bounds.slice(0, 2).reverse(), info.bounds.slice(2, 4).reverse()];

              this.setState({
                bounds,
                maxzoom: info.maxzoom,
                minzoom: info.minzoom,
                scheme: info.scheme || 'xyz',
                url: info.tiles[0]
              });
            })
            .fail((_, __, err) => this.setState({error: err.message}));
    }

    const layers = [];

    if (url != null) {
      this.imageryLayer = Leaflet.tileLayer(url, {
        minZoom: minzoom,
        maxZoom: maxzoom,
        tms: scheme === 'tms'
      });

      layers.push(this.imageryLayer);
    }

    this.leaflet = Leaflet.map(this.container, {
      scrollWheelZoom: true,
      layers
    });

    if (showBackground) {
      const basemaps = [
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
        }),
        L.tileLayer('//{s}.tile.opentopomap.org/{z}/{x}/{y}.png', {
            attribution: 'Map data: &copy; <a href="http://www.openstreetmap.org/copyright">OpenStreetMap</a>, <a href="http://viewfinderpanoramas.org">SRTM</a> | Map style: &copy; <a href="https://opentopomap.org">OpenTopoMap</a> (<a href="https://creativecommons.org/licenses/by-sa/3.0/">CC-BY-SA</a>',
            maxZoom: 22,
            minZoom: 0,
            label: 'OpenTopoMap'
        })
      ];

      this.leaflet.addControl(Leaflet.control.basemaps({
          basemaps: basemaps,
          tileX: 0,  // tile X coordinate
          tileY: 0,  // tile Y coordinate
          tileZ: 1   // tile zoom level
      }));
    }

    this.leaflet.fitBounds(bounds);

    Leaflet.control.scale({
      maxWidth: 250,
    }).addTo(this.leaflet);
    this.leaflet.attributionControl.setPrefix("");
  }

  componentDidUpdate() {
    const { bounds, maxzoom, minzoom, scheme, url } = this.state;

    if (!this.imageryLayer) {
      this.imageryLayer = Leaflet.tileLayer(url, {
        minZoom: minzoom,
        maxZoom: maxzoom,
        tms: scheme === 'tms'
      }).addTo(this.leaflet);

      this.leaflet.fitBounds(bounds);
    }

    this.imageryLayer.setOpacity(this.props.opacity / 100);
  }

  componentWillUnmount() {
    this.leaflet.remove();
    if (this.tileJsonRequest) this.tileJsonRequest.abort();
  }

  render() {
    const { opacity, error } = this.state;

    return (
      <div style={{height: "100%"}}>
        <ErrorMessage message={error} />
        <div 
          style={{height: "100%"}}
          ref={(domNode) => (this.container = domNode)}
        />
      </div>
    );
  }
}

export default Map;