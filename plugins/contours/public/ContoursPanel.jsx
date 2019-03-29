import React from 'react';
import PropTypes from 'prop-types';
import Storage from 'webodm/classes/Storage';
import L from 'leaflet';
import './ContoursPanel.scss';

export default class ContoursPanel extends React.Component {
  static defaultProps = {

  };
  static propTypes = {
    onClose: PropTypes.func.isRequired
  }

  constructor(props){
    super(props);

    this.state = {
        error: "",
        interval: Storage.getItem("last_contours_interval") || "1",
        customInterval: Storage.getItem("last_contours_custom_interval") || "1",
        layer: "",
        projection: Storage.getItem("last_contours_projection") || "4326",
        customProjection: Storage.getItem("last_contours_custom_projection") || "4326",
    };
  }

  componentDidMount(){
  }

  componentWillUnmount(){
  }

    calculateVolume(){
            // $.ajax({
            //     type: 'POST',
            //     url: `/api/plugins/measure/task/${task.id}/volume`,
            //     data: JSON.stringify({'area': this.props.resultFeature.toGeoJSON()}),
            //     contentType: "application/json"
            // }).done(result => {
            //     if (result.volume){
            //         this.setState({volume: parseFloat(result.volume)});
            //     }else if (result.error){
            //         this.setState({error: result.error});
            //     }else{
            //         this.setState({error: "Invalid response: " + result});
            //     }
            // }).fail(error => {
            //     this.setState({error});
            // });
  }

  handleSelectInterval = e => {
    this.setState({interval: e.target.value});
  }

  handleSelectLayer = e => {
    this.setState({layer: e.target.value});
  }

  handleChangeCustomInterval = e => {
    this.setState({customInterval: e.target.value});
  }

  handleSelectProjection = e => {
    this.setState({projection: e.target.value});
  }

  handleChangeCustomProjection = e => {
    this.setState({customProjection: e.target.value});
  }

  render(){
    const { error, interval, customInterval, layer, 
            projection, customProjection } = this.state;
    const intervalValues = [0.25, 0.5, 1, 1.5, 2];

    return (<div className="contours-panel">
      <span className="close-button" onClick={this.props.onClose}/>
      <div className="title">Contours</div>
      <hr/>

      <div className="row form-group form-inline">
        <label className="col-sm-3 control-label">Interval:</label>
        <div className="col-sm-9 ">
          <select className="form-control" value={interval} onChange={this.handleSelectInterval}>
            {intervalValues.map(iv => <option value={iv}>{iv} meter</option>)}
            <option value="custom">Custom</option>
          </select>
        </div>
      </div>
      {interval === "custom" ? 
        <div className="row form-group form-inline">
          <label className="col-sm-3 control-label">Value:</label>
          <div className="col-sm-9 ">
            <input type="number" className="form-control custom-interval" value={customInterval} onChange={this.handleChangeCustomInterval} /><span> meter</span>
          </div>
        </div>
      : ""}

      <div className="row form-group form-inline">
        <label className="col-sm-3 control-label">Layer:</label>
        <div className="col-sm-9 ">
          <select className="form-control" value={layer} onChange={this.handleSelectLayer}>
            <option value="DSM">DSM</option>
          </select>
        </div>
      </div>

      <div className="row form-group form-inline">
        <label className="col-sm-3 control-label">Projection:</label>
        <div className="col-sm-9 ">
          <select className="form-control" value={projection} onChange={this.handleSelectProjection}>
            <option value="4326">WGS84 (EPSG:4326)</option>
            <option value="3857">Web Mercator (EPSG:3857)</option>
            <option value="custom">Custom EPSG</option>
          </select>
        </div>
      </div>
      {projection === "custom" ? 
        <div className="row form-group form-inline">
          <label className="col-sm-3 control-label">EPSG:</label>
          <div className="col-sm-9 ">
            <input type="number" className="form-control custom-interval" value={customProjection} onChange={this.handleChangeCustomProjection} />
          </div>
        </div>
      : ""}

      <div className="text-right action-buttons">
        <button type="button" className="btn btn-sm btn-primary btn-preview">
          <i className="glyphicon glyphicon-eye-open"></i> Preview
        </button>

        <div className="btn-group">
          <button type="button" className="btn btn-sm btn-primary" data-toggle="dropdown">
            <i className="glyphicon glyphicon-download"></i> Export
          </button>
          <button type="button" className="btn btn-sm dropdown-toggle btn-primary" data-toggle="dropdown"><span className="caret"></span></button>
          <ul className="dropdown-menu">
            <li>
              <a href="javascript:void(0);">
                <i className="fa fa-map-o fa-fw"></i> Orthophoto (GeoTIFF)
              </a>
            </li>
            <li>
              <a href="javascript:void(0);">
                <i className="fa fa-map-o fa-fw"></i> Orthophoto (GeoTIFF)
              </a>
            </li>
          </ul>
        </div>
      </div>

    </div>);
  }
}