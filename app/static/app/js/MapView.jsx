import React from 'react';
import './css/MapView.scss';
import Map from './components/Map';
import $ from 'jquery';
import PropTypes from 'prop-types';

class MapView extends React.Component {
  static defaultProps = {
    mapItems: [],
    selectedMapType: 'orthophoto',
    title: "",
    public: false
  };

  static propTypes = {
      mapItems: PropTypes.array.isRequired, // list of dictionaries where each dict is a {mapType: 'orthophoto', url: <tiles.json>},
      selectedMapType: PropTypes.oneOf(['orthophoto', 'dsm', 'dtm']),
      title: PropTypes.string,
      public: PropTypes.bool
  };

  constructor(props){
    super(props);

    this.state = {
      opacity: 100,
      selectedMapType: props.selectedMapType,
      tiles: this.getTilesByMapType(props.selectedMapType)
    };

    this.updateOpacity = this.updateOpacity.bind(this);
    this.getTilesByMapType = this.getTilesByMapType.bind(this);
    this.handleMapTypeButton = this.handleMapTypeButton.bind(this);
  }

  getTilesByMapType(type){
    // Go through the list of map items and return 
    // only those that match a particular type (in tile format)
    const tiles = [];

    this.props.mapItems.forEach(mapItem => {
      mapItem.tiles.forEach(tile => {
        if (tile.type === type) tiles.push({
          url: tile.url,
          meta: mapItem.meta
        });
      });
    });

    return tiles;
  }

  handleMapTypeButton(type){
    return () => {
      this.setState({
        selectedMapType: type,
        tiles: this.getTilesByMapType(type)
      });
    };
  }

  updateOpacity(evt) {
    this.setState({
      opacity: parseFloat(evt.target.value),
    });
  }

  render(){
    const { opacity } = this.state;
    let mapTypeButtons = [
      {
        label: "Orthophoto",
        type: "orthophoto"
      },
      {
        label: "Surface Model",
        type: "dsm"
      },
      {
        label: "Terrain Model",
        type: "dtm"
      }
    ].filter(mapType => this.getTilesByMapType(mapType.type).length > 0 );

    // If we have only one button, hide it...
    if (mapTypeButtons.length === 1) mapTypeButtons = [];

    return (<div className="map-view">
        <div className="map-type-selector btn-group" role="group">
          {mapTypeButtons.map(mapType =>
            <button 
              key={mapType.type}
              onClick={this.handleMapTypeButton(mapType.type)}
              className={"btn btn-sm " + (mapType.type === this.state.selectedMapType ? "btn-primary" : "btn-default")}>{mapType.label}</button>
          )}
        </div>

        {this.props.title ? 
          <h3><i className="fa fa-globe"></i> {this.props.title}</h3>
        : ""}
  
        <Map 
          tiles={this.state.tiles} 
          showBackground={true} 
          opacity={opacity}
          mapType={this.state.selectedMapType} 
          public={this.props.public} />
        <div className="opacity-slider theme-secondary">
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
