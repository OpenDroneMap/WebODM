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
      const { exifData, hasDateTime } = res;

      let circles = exifData.map(exif => {
        return L.circleMarker([exif.gps.latitude, exif.gps.longitude], {
          radius: 8,
          fillOpacity: 1,
          color: "#fcfcff", //ff9e67
          fillColor: "#4b96f3",
          weight: 1.5,
        });
      });
      console.log(hasDateTime);
      // Only show line if we have reliable date/time info
      if (hasDateTime){
        let coords = exifData.map(exif => [exif.gps.latitude, exif.gps.longitude]);
        console.log(coords)
        const capturePath = L.polyline(coords, {
          color: "#4b96f3",
          weight: 3
        });
        capturePath.addTo(this.map);
      }

      let circlesGroup = L.featureGroup(circles).addTo(this.map);

      this.map.fitBounds(circlesGroup.getBounds());

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
      let hasDateTime = true;
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

          // Try to parse the date from EXIF to JS
          const parts = dateTime.split(" ");
          if (parts.length == 2){
              let [ d, t ] = parts;
              d = d.replace(/:/g, "-");
              const tm = Date.parse(`${d} ${t}`);
              if (!isNaN(tm)){
                  dateTime = new Date(tm).toLocaleDateString();
              }
          }
          
          if (!dateTime) hasDateTime = false;

          exifData.push({
            image: img,
            gps: {
              latitude: gps.latitude,
              longitude: gps.longitude
            },
            dateTime
          });

          if (i < images.length - 1) parseImage(i+1);
          else{
            // Sort by date/time
            if (hasDateTime){
              exifData.sort((a, b) => {
                if (a.dateTime < b.dateTime) return -1;
                else if (a.dateTime > b.dateTime) return 1;
                else return 0;
              });
            }

            resolve({exifData, hasDateTime});
          }
        }).catch(reject);
      };

      if (images.length > 0) parseImage(0);
      else resolve({exifData, hasDateTime});
    });
  }

  componentWillUnmount() {
    this.map.remove();
  }

  render() {
    return (
      <div style={{height: "320px"}} className="map-preview">
        <ErrorMessage bind={[this, 'error']} />

        <Standby 
            message={_("Plotting GPS locations...")}
            show={this.state.showLoading}
            />
            
        <div 
          style={{height: "100%"}}
          ref={(domNode) => (this.container = domNode)}
        />
      </div>
    );
  }
}

export default MapPreview;
