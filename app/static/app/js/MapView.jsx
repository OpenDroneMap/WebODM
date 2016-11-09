import React from 'react';
import './css/MapView.scss';
import Map from './components/Map';

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
  }

  render(){
    return (<div className="map-view">
        <Map tileJSON={this.tileJSON} showBackground={true}/>
      </div>);
  }
}

export default MapView;
