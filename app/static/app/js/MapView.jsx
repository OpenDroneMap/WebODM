import React from 'react';
import './css/MapView.scss';
import Map from './components/Map';
import $ from 'jquery';

class MapView extends React.Component {
  static defaultProps = {
    tiles: [],
    selectedMapType: 'orthophoto',
    title: ""
  };

  static propTypes = {
      tiles: React.PropTypes.array.isRequired, // list of dictionaries where each dict is a {mapType: 'orthophoto', url: <tiles.json>},
      selectedMapType: React.PropTypes.oneOf(['orthophoto', 'dsm', 'dtm']),
      title: React.PropTypes.string,
  };

  constructor(props){
    super(props);

    this.state = {
      opacity: 100,
      mapType: props.mapType
    };

    console.log(props);

    this.updateOpacity = this.updateOpacity.bind(this);
  }

  updateOpacity(evt) {
    this.setState({
      opacity: parseFloat(evt.target.value),
    });
  }

  render(){
    const { opacity } = this.state;
    const mapTypeButtons = [
      {
        label: "Orthophoto",
        key: "orthophoto"
      },
      {
        label: "Surface Model",
        key: "dsm"
      },
      {
        label: "Terrain Model",
        key: "dtm"
      }
    ];

    return (<div className="map-view">
        <div className="map-type-selector btn-group" role="group">
          <button className="btn btn-sm btn-primary active">Preview</button>
          <button className="btn btn-sm btn-secondary">Source Code</button>
        </div>

        {this.props.title ? 
          <h3><i className="fa fa-globe"></i> {this.props.title}</h3>
        : ""}
  
        <Map tiles={this.props.tiles} showBackground={true} opacity={opacity}/>
        <div className="opacity-slider">
          Opacity: <input type="range" step="1" value={opacity} onChange={this.updateOpacity} />
        </div>
      </div>);
  }
}

$(function(){
    $("[data-mapview]").each(function(){
        let props = $(this).data();
        delete(props.mapview);
        window.ReactDOM.render(<MapView {...props}/>, $(this).get(0));
    });
});

export default MapView;
