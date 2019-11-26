import React from 'react';
import PropTypes from 'prop-types';
import '../css/LayersControlLayer.scss';
import Histogram from './Histogram';
import { Checkbox, ExpandButton } from './Toggle';
import Utils from '../classes/Utils';

export default class LayersControlLayer extends React.Component {
  static defaultProps = {
      layer: null,
      expanded: false
  };
  static propTypes = {
    layer: PropTypes.object.isRequired,
    expanded: PropTypes.bool
  }

  constructor(props){
    super(props);

    this.map = props.layer._map;

    const url = this.props.layer._url;
    const params = Utils.queryParams({search: url.slice(url.indexOf("?"))});

    this.colorMaps = [
        {key: "jet_r", label: "Jet"},
        {key: "terrain_r", label: "Terrain"},
        {key: "rdylgn", label: "RYG"},
        {key: "spectral_r", label: "Spectral"},
        {key: "pastel1_r", label: "Pastel"},
        {key: "reds_r", label: "Red"},
        {key: "greens_r", label: "Greens"},
        {key: "blues_r", label: "Blue"}
    ];

    this.state = {
        visible: true,
        expanded: props.expanded,
        color: params.color_map
    };
  }

  componentDidUpdate(prevProps, prevState){
    const { layer } = this.props;

    if (prevState.visible !== this.state.visible){
        if (this.state.visible){
            layer.addTo(this.map);
        }else{
            this.map.removeLayer(layer);
        }
    }
  }

  handleLayerClick = () => {
    this.map.fitBounds(this.props.layer.options.bounds);
    this.props.layer.openPopup();
  }

  handleSelectColor = e => {
    this.setState({color: e.target.value});
  }

  render(){
    const { layer } = this.props;
    const { color } = this.state;

    const tmeta = layer[Symbol.for("tile-meta")];
    const meta = layer[Symbol.for("meta")];

    return (<div className="layers-control-layer">
        <ExpandButton bind={[this, 'expanded']} /><Checkbox bind={[this, 'visible']}/> 
        <a className="layer-label" href="javascript:void(0);" onClick={this.handleLayerClick}>{meta.name}</a>

        {this.state.expanded ? 
        <div className="layer-expanded">
            <Histogram width={280} 
                        statistics={tmeta.statistics} 
                        colorMap={tmeta.color_map}/>

            {this.state.color ? 
            <div className="row form-group form-inline">
                <label className="col-sm-3 control-label">Color:</label>
                <div className="col-sm-9 ">
                    <select className="form-control" value={color} onChange={this.handleSelectColor}>
                        {this.colorMaps.map(c => <option key={c.key} value={c.key}>{c.label}</option>)}
                    </select>
                </div>
            </div> : ""}
        </div>
        : ""}
    </div>);
                
  }
}