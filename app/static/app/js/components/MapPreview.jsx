import React from 'react';
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
import 'leaflet-fullscreen/dist/Leaflet.fullscreen';
import 'leaflet-fullscreen/dist/leaflet.fullscreen.css';

const Colors = {
  fill: '#fff',
  stroke: '#1a1a1a'
};

class MapPreview extends React.Component {
  static defaultProps = {
    getFiles: null,
    onPolygonChange: () => {}
  };
    
  static propTypes = {
    getFiles: PropTypes.func.isRequired,
    onPolygonChange: PropTypes.func
  };

  constructor(props) {
    super(props);
    
    this.state = {
        showLoading: true,
        error: "",
        cropping: false
    };

    this.basemaps = {};
    this.mapBounds = null;
    this.exifData = [];
    this.hasTimestamp = true;
    this.MaxImagesPlot = 10000;
  }

  componentDidMount() {
    this.map = Leaflet.map(this.container, {
      scrollWheelZoom: true,
      positionControl: false,
      zoomControl: false,
      minZoom: 0,
      maxZoom: 24
    });

    this.group = L.layerGroup();
    this.group.addTo(this.map);

    // For some reason, in production this class is not added (but we need it)
    // leaflet bug?
    $(this.container).addClass("leaflet-touch");

    //add zoom control with your options
    Leaflet.control.zoom({
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

    this.map.addControl(new L.Control.Fullscreen({
        position: 'bottomleft'
    }));

    var fullscreenchange;

    if ('onfullscreenchange' in document) {
        fullscreenchange = 'fullscreenchange';
    } else if ('onmozfullscreenchange' in document) {
        fullscreenchange = 'mozfullscreenchange';
    } else if ('onwebkitfullscreenchange' in document) {
        fullscreenchange = 'webkitfullscreenchange';
    } else if ('onmsfullscreenchange' in document) {
        fullscreenchange = 'MSFullscreenChange';
    }

    if (fullscreenchange) {
        var onFullscreenChange = L.bind(this.map._onFullscreenChange, this.map);

        this.map.whenReady(function () {
            L.DomEvent.on(document, fullscreenchange, onFullscreenChange);
        });

        this.map.on('unload', function () {
            L.DomEvent.off(document, fullscreenchange, onFullscreenChange);
        });
    }

    this.map.fitBounds([
     [13.772919746115805,
     45.664640939831735],
     [13.772825784981254,
     45.664591558975154]]);
    this.map.attributionControl.setPrefix("");

    this.loadNewFiles();
  }

  sampled = (arr, N) => {
    // Return a uniformly sampled array with max N elements
    if (arr.length <= N) return arr;
    else{
      const res = [];
      const step = arr.length / N;
      for (let i = 0; i < N; i++){
        res.push(arr[Math.floor(i * step)]);
      }

      return res;
    }
  };

  loadNewFiles = () => {
    this.setState({showLoading: true});

    if (this.imagesGroup){
      this.map.removeLayer(this.imagesGroup);
      this.imagesGroup = null;
    }

    this.readExifData().then(() => {
      let images = this.sampled(this.exifData, this.MaxImagesPlot).map(exif => {
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
        if (this.hasTimestamp) layer.feature.properties["Timestamp"] = exif.timestamp;
        return layer;
      });
      
      if (this.capturePath){
        this.map.removeLayer(this.capturePath);
        this.capturePath = null;
      }

      // Only show line if we have reliable date/time info
      if (this.hasTimestamp){
        let coords = this.exifData.map(exif => [exif.gps.latitude, exif.gps.longitude]);
        this.capturePath = L.polyline(coords, {
          color: "#4b96f3",
          weight: 3
        });
        this.capturePath.addTo(this.map);
      }
      
      if (images.length > 0){
        this.imagesGroup = L.featureGroup(images).addTo(this.map);
        this.map.fitBounds(this.imagesGroup.getBounds());
      }

      this.setState({showLoading: false});

    }).catch(e => {
      this.setState({showLoading: false, error: e.message});
    });
  }

  readExifData = () => {
    return new Promise((resolve, reject) => {
      const files = this.props.getFiles();
      const images = [];
      // TODO: gcps? geo files?

      for (let i = 0; i < files.length; i++){
        const f = files[i];
        if (f.type.indexOf("image") === 0) images.push(f);
      }

      // Parse EXIF
      const options = {
        ifd0: false,
        exif: [0x9003],
        gps: [0x0001, 0x0002, 0x0003, 0x0004, 0x0005, 0x0006],
        interop: false,
        ifd1: false // thumbnail
      };

      const next = (i) => {
        if (i < images.length - 1) parseImage(i+1);
        else{
          // Sort by date/time
          if (this.hasTimestamp){
            this.exifData.sort((a, b) => {
              if (a.timestamp < b.timestamp) return -1;
              else if (a.timestamp > b.timestamp) return 1;
              else return 0;
            });
          }

          resolve();
        }
      };
      
      const parseImage = i => {
        const img = images[i];
        exifr.parse(img, options).then(exif => {
          if (!exif.latitude || !exif.longitude){
              // reject(new Error(interpolate(_("Cannot extract GPS data from %(file)s"), {file: img.name})));
              next(i);
              return;
          }

          let dateTime = exif.DateTimeOriginal;
          let timestamp = null;
          if (dateTime && dateTime.getTime) timestamp = dateTime.getTime();
          if (!timestamp) this.hasTimestamp = false;

          this.exifData.push({
            image: img,
            gps: {
              latitude: exif.latitude,
              longitude: exif.longitude,
              altitude: exif.GPSAltitude !== undefined ? exif.GPSAltitude : null,
            },
            timestamp
          });

          next(i);
        }).catch((e) => {
          console.warn(e);
          next(i);
        });
      };

      if (images.length > 0) parseImage(0);
      else resolve();
    });
  }

  componentWillUnmount() {
    this.map.remove();
  }

  getCropPolygon = () => {
    if (!this.polygon) return null;
    return this.polygon.toGeoJSON(14);
  }

  toggleCrop = () => {
    const { cropping } = this.state;

    let crop = !cropping;
    if (!crop) {
      if (this.captureMarker) {
        this.captureMarker.off('click', this.handleMarkerClick);
        this.captureMarker.off('dblclick', this.handleMarkerDblClick);
        this.captureMarker.off('mousemove', this.handleMarkerMove);
        this.captureMarker.off('contextmenu', this.handleMarkerContextMenu);

        this.map.off('move', this.onMapMove);
        this.map.off('resize', this.onMapResize);

        this.group.removeLayer(this.captureMarker);
        this.captureMarker = null;
      }

      if (this.acceptMarker) {
        this.group.removeLayer(this.acceptMarker);
        this.acceptMarker = null;
      }
      if (this.measureBoundary) {
        this.group.removeLayer(this.measureBoundary);
        this.measureBoundary = null;
      }
      if (this.measureArea) {
        this.group.removeLayer(this.measureArea);
        this.measureArea = null;
      }
      this.cropButton.blur();
    }
    else{
      if (!this.captureMarker) {
        this.captureMarker = L.marker(this.map.getCenter(), {
          clickable: true,
          zIndexOffset: 10001
        }).setIcon(L.divIcon({
          iconSize: this.map.getSize().multiplyBy(2),
          className: "map-preview-marker-layer"
        })).addTo(this.group);

        this.captureMarker.on('click', this.handleMarkerClick);
        this.captureMarker.on('dblclick', this.handleMarkerDblClick);
        this.captureMarker.on('mousemove', this.handleMarkerMove);
        this.captureMarker.on('contextmenu', this.handleMarkerContextMenu);

        this.map.on('move', this.onMapMove);
        this.map.on('resize', this.onMapResize);
      }

      if (this.polygon){
        this.group.removeLayer(this.polygon);
        this.polygon = null;
        this.props.onPolygonChange();
      }

      // Reset latlngs
      this.latlngs = [];
    }
    

    this.setState({cropping: !cropping});
  }

  handleMarkerClick = e => {
    L.DomEvent.stop(e);

    const latlng = this.map.mouseEventToLatLng(e.originalEvent);
    this.uniqueLatLonPush(latlng);

    if (this.latlngs.length >= 1) {
      if (!this.measureBoundary) {
        this.measureBoundary = L.polyline(this.latlngs.concat(latlng), {
          clickable: false,
          color: Colors.stroke,
          weight: 2,
          opacity: 0.9,
          fill: false,
        }).addTo(this.group);
      } else {
        this.measureBoundary.setLatLngs(this.latlngs.concat(latlng));
      }
    }

    if (this.latlngs.length >= 2) {
      if (!this.measureArea) {
        this.measureArea = L.polygon(this.latlngs.concat(latlng), {
          clickable: false,
          stroke: false,
          fillColor: Colors.fill,
          fillOpacity: 0.2,
        }).addTo(this.group);
      } else {
        this.measureArea.setLatLngs(this.latlngs.concat(latlng));
      }
    }

    if (this.latlngs.length >= 3) {
      if (this.acceptMarker) {
        this.group.removeLayer(this.acceptMarker);
        this.acceptMarker = null;
      }

      const onAccept = e => {
        L.DomEvent.stop(e);
        this.confirmPolygon();
        return false;
      };

      let acceptLatlng = this.latlngs[0];

      this.acceptMarker = L.marker(acceptLatlng, {
        icon: L.icon({
          iconUrl: `/static/app/img/accept.png`,
          iconSize: [20, 20],
          iconAnchor: [10, 10],
          className: "map-preview-accept-button",
        }),
        zIndexOffset: 99999
      }).addTo(this.group)
        .on("click", onAccept)
        .on("contextmenu", onAccept);
    }
  };

  confirmPolygon = () => {
    if (this.latlngs.length >= 3){
      const popupContainer = L.DomUtil.create('div');
      popupContainer.className = "map-preview-delete";
      const deleteLink = L.DomUtil.create('a');
      deleteLink.href = "javascript:void(0)";
      deleteLink.innerHTML = `<i class="fa fa-trash"></i> ${_("Delete")}`;
      deleteLink.onclick = (e) => {
        L.DomEvent.stop(e);
        if (this.polygon){
          this.group.removeLayer(this.polygon);
          this.polygon = null;
          this.props.onPolygonChange();
        }
      };
      popupContainer.appendChild(deleteLink);

      this.polygon = L.polygon(this.latlngs, {
        clickable: true,
        weight: 3,
        opacity: 0.9,
        color: "#ffa716",
        fillColor: "#ffa716",
        fillOpacity: 0.2
      }).bindPopup(popupContainer).addTo(this.group);

      this.props.onPolygonChange();
    }

    this.toggleCrop();
  }

  uniqueLatLonPush = latlng => {
    if (this.latlngs.length === 0) this.latlngs.push(latlng);
    else{
      const last = this.latlngs[this.latlngs.length - 1];
      if (last.lat !== latlng.lat && last.lng !== latlng.lng) this.latlngs.push(latlng);
    }
  };

  handleMarkerDblClick = e => {
    if (this.latlngs.length >= 2){
      const latlng = this.map.mouseEventToLatLng(e.originalEvent);
      this.uniqueLatLonPush(latlng);
      this.confirmPolygon();
    }
  }

  handleMarkerMove = e => {
    const latlng = this.map.mouseEventToLatLng(e.originalEvent);
    let lls = this.latlngs.concat(latlng);
    lls.push(lls[0]);
    if (this.measureBoundary) {
      this.measureBoundary.setLatLngs(lls);
    }
    if (this.measureArea) {
      this.measureArea.setLatLngs(lls);
    }
  }

  handleMarkerContextMenu = e => {
    if (this.latlngs.length >= 2){
      const latlng = this.map.mouseEventToLatLng(e.originalEvent);
      this.uniqueLatLonPush(latlng);
      this.confirmPolygon();
    }

    return false;
  }

  onMapMove = () => {
    if (this.captureMarker) this.captureMarker.setLatLng(this.map.getCenter());
  };

  onMapResize = () => {
    if (this.captureMarker) this.captureMarker.setIcon(L.divIcon({
        iconSize: this._map.getSize().multiplyBy(2)
      }));
  }

  download = format => {
    let output = "";
    let filename = `images.${format}`;
    const feats = {
      type: "FeatureCollection",
      features: this.exifData.map(ed => {
        return {
          type: "Feature",
          properties: {
            Filename: ed.image.name,
            Timestamp: ed.timestamp
          },
          geometry:{
            type: "Point",
            coordinates: [
              ed.gps.longitude,
              ed.gps.latitude,
              ed.gps.altitude !== null ? ed.gps.altitude : 0
            ]
          }
        }
      })
    };

    if (format === 'geojson'){
      output = JSON.stringify(feats, null, 4);
    }else if (format === 'csv'){
      output = `Filename,Timestamp,Latitude,Longitude,Altitude\r\n${feats.features.map(feat => {
        return `${feat.properties.Filename},${feat.properties.Timestamp},${feat.geometry.coordinates[1]},${feat.geometry.coordinates[0]},${feat.geometry.coordinates[2]}`
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

        {this.state.error === "" && this.exifData.length > this.MaxImagesPlot ? 
        <div className="plot-warning btn-warning" title={interpolate(_("For performance reasons, only %(num)s images are plotted"), {num: this.MaxImagesPlot})}>
          <i className="fa fa-exclamation-triangle"></i>
        </div>
        : ""}

        {this.state.error === "" ? <div className="download-control">
          <button title={_("Download")} type="button" className="btn btn-sm btn-secondary dropdown-toggle" data-toggle="dropdown">
            <i className="fa fa-download"></i>
          </button>
          <ul className="dropdown-menu">
            <li>
              <a href="javascript:void(0);" onClick={() => this.download('geojson')}><i className="fas fa-map fa-fw"></i> GeoJSON</a>
              <a href="javascript:void(0);" onClick={() => this.download('csv')}><i className="fas fa-file-alt fa-fw"></i> CSV</a>
            </li>
          </ul>
        </div> : ""}

        {this.state.error === "" ? 
            <div className="crop-control">
              <button ref={(domNode) => {this.cropButton = domNode; }} type="button" onClick={this.toggleCrop} className={"btn btn-sm " + (this.state.cropping ? "btn-default" : "btn-secondary")} title={_("Set Reconstruction Area (optional)")}>
              <i className="fa fa-crop-alt"></i>
            </button>
            </div>
          : ""}

        <div 
          style={{height: "100%"}}
          ref={(domNode) => (this.container = domNode)}
        >
          
        </div>


      </div>
    );
  }
}

export default MapPreview;
