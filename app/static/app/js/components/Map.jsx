import React from 'react';
import '../css/Map.scss';
import '../vendor/leaflet/leaflet.css';
import Leaflet from '../vendor/leaflet/leaflet';
import $ from 'jquery';
import ErrorMessage from './ErrorMessage';

class Map extends React.Component {
  static defaultProps = {
    bounds: [[-85.05112877980659, -180], [85.0511287798066, 180]],
    maxzoom: 18,
    minzoom: 0,
    scheme: 'tms',
    showBackground: false,
    showControls: true,
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
        minzoom: this.props.minzoom,
        opacity: 100
    };

    this.updateOpacity = this.updateOpacity.bind(this);
  }

  componentDidMount() {
    const { showBackground, tileJSON } = this.props;
    const { bounds, maxzoom, minzoom, scheme, url } = this.state;

    // TODO: https, other basemaps selection
    let backgroundTileLayer = Leaflet.tileLayer('http://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}',
            {
                attribution: 'Tiles &copy; Esri &mdash; Source: Esri, i-cubed, USDA, USGS, AEX, GeoEye, Getmapping, Aerogrid, IGN, IGP, UPR-EGP, and the GIS User Community'
            }
        );

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

    if (showBackground) {
        layers.push(backgroundTileLayer);
    }

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

    this.leaflet.fitBounds(bounds);

    Leaflet.control.scale({
      maxWidth: 250,
    }).addTo(this.leaflet);
    this.leaflet.attributionControl.setPrefix("");
  }

  componentDidUpdate() {
    const { bounds, maxzoom, minzoom, opacity, scheme, url } = this.state;

    if (!this.imageryLayer) {
      this.imageryLayer = Leaflet.tileLayer(url, {
        minZoom: minzoom,
        maxZoom: maxzoom,
        tms: scheme === 'tms'
      }).addTo(this.leaflet);

      this.leaflet.fitBounds(bounds);
    }

    this.imageryLayer.setOpacity(opacity / 100);
  }

  componentWillUnmount() {
    this.leaflet.remove();
    if (this.tileJsonRequest) this.tileJsonRequest.abort();
  }

  updateOpacity(evt) {
    this.setState({
      opacity: evt.target.value,
    });
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
        {this.props.showControls ?
            <div className="row">
              <div className="col-md-3">
                Layer opacity: <input type="range" step="1" value={opacity} onChange={this.updateOpacity} />
              </div>
            </div>
        : ""}
      </div>
    );
  }
}

export default Map;