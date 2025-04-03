import React from 'react';
import ReactDOM from 'ReactDOM';
import L from 'leaflet';
import '../css/CropButton.scss';
import PropTypes from 'prop-types';
import { _ } from '../classes/gettext';

const Colors = {
    fill: '#fff',
    stroke: '#1a1a1a'
};

class CropButton extends React.Component {
  static defaultProps = {
    group: null,
    title: _("Crop"),
    color: "#ffa716",
    pulse: false,
    onPolygonCreated: () => {},
    onPolygonChange: () => {},
    willCrop: () => {}
  };

  static propTypes = {
    map: PropTypes.object.isRequired,
    group: PropTypes.object,
    title: PropTypes.string,
    color: PropTypes.string,
    pulse: PropTypes.bool,
    onPolygonCreated: PropTypes.func,
    onPolygonChange: PropTypes.func
  };

  constructor(props){
    super(props);

    this.state = {
        cropping: false
    }

    this.map = props.map;
    this.group = props.group;
    if (!this.group){
        this.group = L.layerGroup();
        this.group.addTo(this.map);
    }
  }

  toggleCrop = (e) => {
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
        }else{
            if (e && this.props.willCrop()) return;

            if (!this.captureMarker) {
                this.captureMarker = L.marker(this.map.getCenter(), {
                    clickable: true,
                    zIndexOffset: 10001
                }).setIcon(L.divIcon({
                    iconSize: this.map.getSize().multiplyBy(2),
                    className: "crop-button-marker-layer"
                })).addTo(this.group);

                this.captureMarker.on('click', this.handleMarkerClick);
                this.captureMarker.on('dblclick', this.handleMarkerDblClick);
                this.captureMarker.on('mousemove', this.handleMarkerMove);
                this.captureMarker.on('contextmenu', this.handleMarkerContextMenu);

                this.map.on('move', this.onMapMove);
                this.map.on('resize', this.onMapResize);
            }

            this.deletePolygon();

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
                className: "crop-button-accept-button",
                }),
                zIndexOffset: 99999
            }).addTo(this.group)
                .on("click", onAccept)
                .on("contextmenu", onAccept);
        }
    }

    deletePolygon = (opts = {}) => {
        if (this.polygon){
            const remove = () => {
                this.group.removeLayer(this.polygon);
                this.polygon = null;
                if (opts.triggerEvents) this.props.onPolygonChange(null);
            };

            if (opts.fade){
                this.polygon._path.classList.add("fade");
                setTimeout(remove, 1500);
            }else{
                remove();
            }
        }
    }

    confirmPolygon = () => {
        if (this.latlngs.length >= 3){
            this.polygon = L.polygon(this.latlngs, {
                clickable: true,
                weight: 3,
                opacity: 0.9,
                color: this.props.color,
                fillColor: this.props.color,
                fillOpacity: 0.2,
                className: "crop" + (this.props.pulse ? " pulse" : "")
        }).addTo(this.group);
            this.props.onPolygonCreated(this.polygon);
            this.props.onPolygonChange(this.getCropPolygon());
        }

        this.toggleCrop();
    }

    getCropPolygon = () => {
        if (!this.polygon) return null;
        return this.polygon.toGeoJSON(14);
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
        }else if (this.state.cropping){
            this.toggleCrop();
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
  
    render() {
        return (<div>
            <a href="javascript:void(0);"
                onClick={this.toggleCrop} 
                title={this.props.title}
                className={"leaflet-control-crop-button leaflet-bar-part theme-secondary " + (this.state.cropping ? "selected" : "")}><i className="fa fa-crop-alt"></i></a>
        </div>);
    }
}

export default L.Control.extend({
    _btn: null,
    
    options: {
        position: 'topright'
    },

    onAdd: function (map) {
        var container = L.DomUtil.create('div', 'crop-button leaflet-control-crop leaflet-bar leaflet-control');
        L.DomEvent.disableClickPropagation(container);
        ReactDOM.render(<CropButton ref={(domNode) => this._btn = domNode} map={map} 
                                    group={this.options.group}
                                    title={this.options.title}
                                    color={this.options.color}
                                    pulse={this.options.pulse}
                                    willCrop={this.options.willCrop}
                                    onPolygonCreated={this.options.onPolygonCreated}
                                    onPolygonChange={this.options.onPolygonChange} />, container);

        return container;
    },

    deletePolygon: function(opts = {}){
        return this._btn.deletePolygon(opts);
    },

    getCropPolygon: function(){
        return this._btn.getCropPolygon();
    }
});
