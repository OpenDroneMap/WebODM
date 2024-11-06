import React from 'react';
import './css/MapView.scss';
import Map from './components/Map';
import $ from 'jquery';
import PropTypes from 'prop-types';
import { _, interpolate } from './classes/gettext';

class MapView extends React.Component {
  static defaultProps = {
    mapItems: [],
    selectedMapType: 'auto',
    title: "",
    public: false,
    publicEdit: false,
    shareButtons: true,
    permissions: ["view"]
  };

  static propTypes = {
      mapItems: PropTypes.array.isRequired, // list of dictionaries where each dict is a {mapType: 'orthophoto', url: <tiles.json>},
      selectedMapType: PropTypes.oneOf(['auto', 'orthophoto', 'plant', 'dsm', 'dtm']),
      title: PropTypes.string,
      public: PropTypes.bool,
      publicEdit: PropTypes.bool,
      shareButtons: PropTypes.bool,
      permissions: PropTypes.array
  };

  constructor(props){
    super(props);

    let selectedMapType = props.selectedMapType;

    // Automatically select type based on available tiles
    // and preference order (below)
    if (props.selectedMapType === "auto"){
      let preferredTypes = ['orthophoto', 'dsm', 'dtm'];
      if (this.isThermalMap()) preferredTypes = ['plant'].concat(preferredTypes);

      for (let i = 0; i < this.props.mapItems.length; i++){
        let mapItem = this.props.mapItems[i];
        for (let j = 0; j < preferredTypes.length; j++){
          if (mapItem.tiles.find(t => t.type === preferredTypes[j])){
            selectedMapType = preferredTypes[j];
            break;
          }
        }
        if (selectedMapType !== "auto") break;
      }
    }

    if (selectedMapType === "auto") selectedMapType = "orthophoto"; // Hope for the best

    this.state = {
      selectedMapType,
      tiles: this.getTilesByMapType(selectedMapType)
    };

    this.getTilesByMapType = this.getTilesByMapType.bind(this);
    this.handleMapTypeButton = this.handleMapTypeButton.bind(this);
  }

  isThermalMap = () => {
    let thermalCount = 0;
    for (let item of this.props.mapItems){
      if (item.meta && item.meta.task && item.meta.task.orthophoto_bands){
        if (item.meta.task.orthophoto_bands.length === 2 && item.meta.task.orthophoto_bands &&
            item.meta.task.orthophoto_bands[0] && typeof(item.meta.task.orthophoto_bands[0].description) === "string" &&
            item.meta.task.orthophoto_bands[0].description.toLowerCase() === "lwir"){
          thermalCount++;
        }
      }
    }

    return thermalCount === this.props.mapItems.length;
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
    const isThermal = this.isThermalMap();

    let mapTypeButtons = [
      {
        label: _("Orthophoto"),
        type: "orthophoto",
        icon: "far fa-image"
      },
      {
        label: isThermal ? _("Thermal") : _("Plant Health"),
        type: "plant",
        icon: isThermal ? "fa fa-thermometer-half" : "fa fa-seedling"
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
        <div className="map-view-header">
          {this.props.title ?
            <h3 className="map-title" title={this.props.title}><i className="fa fa-globe"></i> {this.props.title}</h3>
          : ""}

          <div className="map-type-selector btn-group" role="group">
            {mapTypeButtons.map(mapType =>
              <button
                key={mapType.type}
                onClick={this.handleMapTypeButton(mapType.type)}
                title={mapType.label}
                className={"btn btn-sm " + (mapType.type === this.state.selectedMapType ? "btn-primary" : "btn-default")}><i className={mapType.icon + " fa-fw"}></i><span className="hidden-sm hidden-xs"> {mapType.label}</span></button>
            )}
          </div>
        </div>
      
        <div className="map-container">
            <Map 
                tiles={this.state.tiles} 
                showBackground={true} 
                mapType={this.state.selectedMapType} 
                public={this.props.public}
                publicEdit={this.props.publicEdit}
                shareButtons={this.props.shareButtons}
                permissions={this.props.permissions}
                thermal={isThermal}
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
