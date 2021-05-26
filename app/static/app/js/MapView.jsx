import React from 'react';
import './css/MapView.scss';
import Map from './components/Map';
import $ from 'jquery';
import PropTypes from 'prop-types';
import { _, interpolate } from './classes/gettext';

class MapView extends React.Component {
  static defaultProps = {
    mapItems: [],
    selectedMapType: 'orthophoto',
    title: "",
    public: false,
    shareButtons: true
  };

  static propTypes = {
      mapItems: PropTypes.array.isRequired, // list of dictionaries where each dict is a {mapType: 'orthophoto', url: <tiles.json>},
      selectedMapType: PropTypes.oneOf(['orthophoto', 'plant', 'dsm', 'dtm']),
      title: PropTypes.string,
      public: PropTypes.bool,
      shareButtons: PropTypes.bool
  };

  constructor(props){
    super(props);

    this.state = {
      selectedMapType: props.selectedMapType,
      tiles: this.getTilesByMapType(props.selectedMapType)
    };

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
          meta: mapItem.meta,
          type: tile.type
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

  render(){
    let mapTypeButtons = [
      {
        label: _("Orthophoto"),
        type: "orthophoto",
        icon: "far fa-image"
      },
      {
        label: _("Plant Health"),
        type: "plant",
        icon: "fa fa-seedling"
      },
      {
        label: _("Surface Model"),
        type: "dsm",
        icon: "fa fa-chart-area"
      },
      {
        label: _("Terrain Model"),
        type: "dtm",
        icon: "fa fa-chart-area"
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
              className={"btn btn-sm " + (mapType.type === this.state.selectedMapType ? "btn-primary" : "btn-default")}><i className={mapType.icon}></i> {mapType.label}</button>
          )}
        </div>

        {this.props.title ? 
          <h3><i className="fa fa-globe"></i> {this.props.title}</h3>
        : ""}

        <div className="map-container">
            <Map 
                tiles={this.state.tiles} 
                showBackground={true} 
                mapType={this.state.selectedMapType} 
                public={this.props.public}
                shareButtons={this.props.shareButtons}
            />
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
