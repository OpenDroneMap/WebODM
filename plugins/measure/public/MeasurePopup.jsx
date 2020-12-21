import React from 'react';
import PropTypes from 'prop-types';
import './MeasurePopup.scss';
import Utils from 'webodm/classes/Utils';
import Workers from 'webodm/classes/Workers';
import { _, interpolate } from 'webodm/classes/gettext';

import $ from 'jquery';
import L from 'leaflet';

export default class MeasurePopup extends React.Component {
  static defaultProps = {
    map: {}, 
    model: {},
    resultFeature: {}
  };
  static propTypes = {
    map: PropTypes.object.isRequired,
    model: PropTypes.object.isRequired,
    resultFeature: PropTypes.object.isRequired
  }

  constructor(props){
    super(props);

    this.state = {
        volume: null, // to be calculated
        error: ""
    };

    this.exportMeasurement = this.exportMeasurement.bind(this);
    this.getProperties = this.getProperties.bind(this);
    this.getGeoJSON = this.getGeoJSON.bind(this);
  }

  componentDidMount(){
    this.calculateVolume();
    this.props.resultFeature._measurePopup = this;
  }

  componentWillUnmount(){
    this.props.resultFeature._measurePopup = null;
  }

  getProperties(){
    const result = {
        Length: this.props.model.length,
        Area: this.props.model.area
    };
    if (this.state.volume !== null && this.state.volume !== false){
        result.Volume = this.state.volume;
    }
    
    return result;
  }

  getGeoJSON(){
    const geoJSON = this.props.resultFeature.toGeoJSON();
    geoJSON.properties = this.getProperties();
    return geoJSON;
  }

  exportMeasurement(){
    const geoJSON = {
      type: "FeatureCollection",
      features: [this.getGeoJSON()]
    };

    Utils.saveAs(JSON.stringify(geoJSON, null, 4), "measurement.geojson")
  }

  calculateVolume(){
    const { lastCoord } = this.props.model;
    let layers = this.getLayersAtCoords(L.latLng(
            lastCoord.dd.y,
            lastCoord.dd.x
        ));

    // Did we select a layer?
    if (layers.length > 0){
        const layer = layers[layers.length - 1];
        const meta = layer[Symbol.for("meta")];
        if (meta){
            const task = meta.task;

            $.ajax({
                type: 'POST',
                url: `/api/plugins/measure/task/${task.id}/volume`,
                data: JSON.stringify({'area': this.props.resultFeature.toGeoJSON()}),
                contentType: "application/json"
            }).done(result => {
                if (result.celery_task_id){
                    Workers.waitForCompletion(result.celery_task_id, error => {
                      if (error) this.setState({error});
                      else{
                          Workers.getOutput(result.celery_task_id, (error, volume) => {
                              if (error) this.setState({error});
                              else this.setState({volume: parseFloat(volume)});
                          }, `/api/plugins/measure/task/${task.id}/volume/get/`);
                      }
                    }, `/api/plugins/measure/task/${task.id}/volume/check/`);
                }else if (result.error){
                    this.setState({error: result.error});
                }else{
                    this.setState({error: interpolate(_("Invalid response: %(error)s"), { error: result})});
                }
            }).fail(error => {
                this.setState({error});
            });
        }else{
            console.warn("Cannot find [meta] symbol for layer: ", layer);
            this.setState({volume: false});
        }
    }else{
        this.setState({volume: false});
    }
  }

  // @return the layers in the map
    //      at a specific lat/lon
  getLayersAtCoords(latlng){
    const targetBounds = L.latLngBounds(latlng, latlng);

    const intersects = [];
    for (let l in this.props.map._layers){
        const layer = this.props.map._layers[l];

        if (layer.options && layer.options.bounds){
            if (targetBounds.intersects(layer.options.bounds)){
                intersects.push(layer);
            }
        }
    }

    return intersects;
  }

  render(){
    const { volume, error } = this.state;

    return (<div className="plugin-measure popup">
        <p>{_("Area:")} {this.props.model.areaDisplay}</p>
        <p>{_("Perimeter:")} {this.props.model.lengthDisplay}</p>
        {volume === null && !error && <p>{_("Volume:")} <i>{_("computing…")}</i> <i className="fa fa-cog fa-spin fa-fw" /></p>}
        {typeof volume === "number" && <p>{_("Volume:")} {volume.toFixed("2")} {_("Cubic Meters")} ({(volume * 35.3147).toFixed(2)} {_("Cubic Feet")})</p>}
        {error && <p>{_("Volume:")} <span className={"error theme-background-failed " + (error.length > 200 ? 'long' : '')}>{error}</span></p>}
        <a href="#" onClick={this.exportMeasurement} className="export-measurements"><i className="fa fa-download"></i> {_("Export to GeoJSON")}</a>
    </div>);
  }
}