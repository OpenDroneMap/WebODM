import React from 'react';
import './css/MapView.scss';
import Map from './components/Map';
import AssetDownloadButtons from './components/AssetDownloadButtons';

class MapView extends React.Component {
  static defaultProps = {
    task: "",
    project: ""
  }

  static propTypes() {
    return {
      // task id to display, if empty display all for a particular project
      task: React.PropTypes.string,

      // project id to display, if empty display all
      project: React.PropTypes.string
    };
  }

  constructor(props){
    super(props);

    this.tileJSON = "";
    if (this.props.project === ""){
      this.tileJSON = "/api/projects/tiles.json"
      throw new Error("TODO: not built yet");
    }else if (this.props.task === ""){
      this.tileJSON = `/api/projects/${this.props.project}/tasks/tiles.json`;
      throw new Error("TODO: not built yet");
    }else{
      this.tileJSON = `/api/projects/${this.props.project}/tasks/${this.props.task}/tiles.json`;
    }

    this.state = {
      opacity: 100
    };

    this.updateOpacity = this.updateOpacity.bind(this);
  }

  updateOpacity(evt) {
    this.setState({
      opacity: evt.target.value,
    });
  }

  render(){
    const { opacity } = this.state;

    return (<div className="map-view">
        <Map tileJSON={this.tileJSON} showBackground={true} opacity={opacity}/>
        <div className="row controls">
          <div className="col-md-3">
            <AssetDownloadButtons task={{id: this.props.task, project: this.props.project}} />
          </div>
          <div className="col-md-9 text-right">
            Orthophoto opacity: <input type="range" step="1" value={opacity} onChange={this.updateOpacity} />
          </div>
        </div>
      </div>);
  }
}

export default MapView;
