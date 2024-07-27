import React from 'react';
import ReactDOM from 'ReactDOM';
import '../css/MapPreview.scss';
import 'leaflet/dist/leaflet.css';
import Leaflet from 'leaflet';
import PropTypes from 'prop-types';
import $ from 'jquery';
import ErrorMessage from './ErrorMessage';
import Utils from '../classes/Utils';
import '../vendor/leaflet/Leaflet.Autolayers/css/leaflet.auto-layers.css';
import '../vendor/leaflet/Leaflet.Autolayers/leaflet-autolayers';
import Basemaps from '../classes/Basemaps';
import Standby from './Standby';
import exifr from '../vendor/exifr';
import '../vendor/leaflet/leaflet-markers-canvas';
import { _, interpolate } from '../classes/gettext';

class MapPreview extends React.Component {
  static defaultProps = {
    getFiles: null
  };

  static propTypes = {
    getFiles: PropTypes.func.isRequired
  };

  constructor(props) {
    super(props);
    
    this.state = {
        showLoading: true,
        error: ""
    };

    this.basemaps = {};
    this.mapBounds = null;

  }

  componentDidMount() {
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

    //add zoom control with your options
    let zoomControl = Leaflet.control.zoom({
         position:'bottomleft'
    }).addTo(this.map);

    this.basemaps = {};
    
    Basemaps.forEach((src, idx) => {
    const { url, ...props } = src;
    const tileProps = Utils.clone(props);
    tileProps.maxNativeZoom = tileProps.maxZoom;
    tileProps.maxZoom = tileProps.maxZoom + 99;
    const layer = L.tileLayer(url, tileProps);

    if (idx === 2) {
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

    this.autolayers = Leaflet.control.autolayers({
      overlays: {},
      selectedOverlays: [],
      baseLayers: this.basemaps
    }).addTo(this.map);

    this.map.fitBounds([
     [13.772919746115805,
     45.664640939831735],
     [13.772825784981254,
     45.664591558975154]]);
    this.map.attributionControl.setPrefix("");

    this.setState({showLoading: true});

    this.readExifData().then(res => {
      const { exifData, hasTimestamp } = res;

      this.hasTimestamp = hasTimestamp;

      let images = exifData.map(exif => {
        let layer = L.circleMarker([exif.gps.latitude, exif.gps.longitude], {
          radius: 8,
          fillOpacity: 1,
          color: "#fcfcff", //ff9e67
          fillColor: "#4b96f3",
          weight: 1.5,
        }).bindPopup(exif.image.name);
        layer.feature = layer.feature || {};
        layer.feature.type = "Feature";
        layer.feature.properties = layer.feature.properties || {};
        layer.feature.properties["Filename"] = exif.image.name;
        if (hasTimestamp) layer.feature.properties["Timestamp"] = exif.timestamp;
        return layer;
      });

      // Only show line if we have reliable date/time info
      if (hasTimestamp){
        let coords = exifData.map(exif => [exif.gps.latitude, exif.gps.longitude]);
        const capturePath = L.polyline(coords, {
          color: "#4b96f3",
          weight: 3
        });
        capturePath.addTo(this.map);
      }

      this.imagesGroup = L.featureGroup(images).addTo(this.map);

      this.map.fitBounds(this.imagesGroup.getBounds());

      this.setState({showLoading: false});

    }).catch(e => {
      this.setState({showLoading: false, error: e.message});
    });

  }

  readExifData = () => {
    return new Promise((resolve, reject) => {
      const files = this.props.getFiles();
      const images = [];
      const exifData = [];
      let hasTimestamp = true;
      // TODO: gcps? geo files?

      for (let i = 0; i < files.length; i++){
        const f = files[i];
        if (f.type.indexOf("image") === 0) images.push(f);
      }

      // Parse EXIF
      const options = {
        ifd0: false,
        exif: [0x9003],
        gps: [0x0001, 0x0002, 0x0003, 0x0004],
        interop: false,
        ifd1: false // thumbnail
      };
      
      const parseImage = i => {
        const img = images[i];
        exifr.parse(img, options).then(gps => {
          if (!gps.latitude || !gps.longitude){
              reject(new Error(interpolate(_("Cannot extract GPS data from %(file)s"), {file: img.name})));
              return;
          }

          let dateTime = gps["36867"];
          let timestamp = null;

          // Try to parse the date from EXIF to JS
          const parts = dateTime.split(" ");
          
          if (parts.length == 2){
              let [ d, t ] = parts;
              d = d.replace(/:/g, "-");
              const tm = Date.parse(`${d} ${t}`);
              if (!isNaN(tm)){
                  timestamp = new Date(tm).getTime();
              }
          }
          
          if (!timestamp) hasTimestamp = false;

          exifData.push({
            image: img,
            gps: {
              latitude: gps.latitude,
              longitude: gps.longitude
            },
            timestamp
          });

          if (i < images.length - 1) parseImage(i+1);
          else{
            // Sort by date/time
            if (hasTimestamp){
              exifData.sort((a, b) => {
                if (a.timestamp < b.timestamp) return -1;
                else if (a.timestamp > b.timestamp) return 1;
                else return 0;
              });
            }

            resolve({exifData, hasTimestamp});
          }
        }).catch(reject);
      };

      if (images.length > 0) parseImage(0);
      else resolve({exifData, hasTimestamp});
    });
  }

  componentWillUnmount() {
    this.map.remove();
  }

  download = format => {
    let output = "";
    let filename = `images.${format}`;
    const feats = this.imagesGroup.toGeoJSON(14);

    if (format === 'geojson'){
      output = JSON.stringify(feats, null, 4);
    }else if (format === 'csv'){
      output = `Filename,Timestamp,Latitude,Longitude\r\n${feats.features.map(feat => {
        return `${feat.properties.Filename},${feat.properties.Timestamp},${feat.geometry.coordinates[1]},${feat.geometry.coordinates[0]}`
      }).join("\r\n")}`;
    }else{
      console.error("Invalid format");
    }

    Utils.saveAs(output, filename);
  }

  render() {
    return (
      <div style={{height: "280px"}} className="map-preview">
        <ErrorMessage bind={[this, 'error']} />

        <Standby 
            message={_("Plotting GPS locations...")}
            show={this.state.showLoading}
            />

        {this.state.error === "" ? <div className="download-control">
          <button type="button" className="btn btn-sm btn-secondary dropdown-toggle" data-toggle="dropdown">
            <i className="fa fa-download"></i>
          </button>
          <ul className="dropdown-menu">
            <li>
              <a href="javascript:void(0);" onClick={() => this.download('geojson')}><i className="fas fa-map fa-fw"></i> GeoJSON</a>
              <a href="javascript:void(0);" onClick={() => this.download('csv')}><i className="fas fa-file-alt fa-fw"></i> CSV</a>
            </li>
          </ul>
        </div> : ""}
            
        <div 
          style={{height: "100%"}}
          ref={(domNode) => (this.container = domNode)}
          />

      </div>
    );
  }
}

export default MapPreview;
