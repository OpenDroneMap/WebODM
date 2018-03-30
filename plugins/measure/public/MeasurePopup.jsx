import React from 'react';
import PropTypes from 'prop-types';
import './MeasurePopup.scss';
import $ from 'jquery';
import L from 'leaflet';

module.exports = class MeasurePopup extends React.Component {
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
  }

  componentDidMount(){
    this.calculateVolume();
  }

  calculateVolume(){
    const { lastCoord } = this.props.model;
    let layers = this.getLayersAtCoords(L.latLng(
            lastCoord.dd.y,
            lastCoord.dd.x
        ));

    console.log(layers);

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
                if (result.volume){
                    this.setState({volume: parseFloat(result.volume)});
                }else if (result.error){
                    this.setState({error: result.error});
                }else{
                    this.setState({error: "Invalid response: " + result});
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
        <p>Area: {this.props.model.areaDisplay}</p>
        <p>Perimeter: {this.props.model.lengthDisplay}</p>
        {volume === null && !error && <p>Volume: <i>computing...</i> <i className="fa fa-cog fa-spin fa-fw" /></p>}
        {typeof volume === "number" && <p>Volume: {volume.toFixed("2")} Cubic Meters ({(volume * 35.3147).toFixed(2)} Cubic Feet)</p>}
        {error && <p>Volume: <span className={"error theme-background-failed " + (error.length > 200 ? 'long' : '')}>{error}</span></p>}
    </div>);
  }
}