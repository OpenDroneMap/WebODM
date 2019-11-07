import React from 'react';
import PropTypes from 'prop-types';
import Storage from '../classes/Storage';
import L from 'leaflet';
import '../css/LayersControlPanel.scss';
import ErrorMessage from './ErrorMessage';

export default class LayersControlPanel extends React.Component {
  static defaultProps = {
  };
  static propTypes = {
    onClose: PropTypes.func.isRequired,
    tasks: PropTypes.object.isRequired,
    map: PropTypes.object.isRequired
  }

  constructor(props){
    super(props);

    this.state = {
        error: "",
        // epsg: Storage.getItem("last_contours_epsg") || "4326",
        loading: true
    };
  }

  componentWillUnmount(){
    // if (this.loadingReq){
    //   this.loadingReq.abort();
    //   this.loadingReq = null;
    // }
  }

  render(){
    const { loading } = this.state;

    let content = "";
    if (loading) content = (<span><i className="fa fa-circle-notch fa-spin"></i> Loading...</span>);
    else{
      content = (<div>
        <ErrorMessage bind={[this, "error"]} />
        <div className="row form-group form-inline">
          <label className="col-sm-3 control-label">Filter:</label>
          <div className="col-sm-9 ">
            <select className="form-control" value={interval} onChange={this.handleSelectInterval}>
              {/*intervalValues.map(iv => <option value={iv}>{iv} meter</option>)*/}
              <option value="custom">Custom</option>
            </select>
          </div>
        </div>
      </div>);
    }

    return (<div className="layers-control-panel">
      <span className="close-button" onClick={this.props.onClose}/>
      <div className="title">Layers Control</div>
      <hr/>
      {content}
    </div>);
  }
}