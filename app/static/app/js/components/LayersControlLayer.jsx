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

    const url = this.getLayerUrl();
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
        color_map: params.color_map || "",
        formula: params.formula || "",
        bands: params.bands || "",
        hillshade: params.hillshade || ""
    };

    this.rescale = "";
  }

  getLayerUrl = () => {
      return this.props.layer._url;
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
    this.setState({color_map: e.target.value});
  }

  updateLayer = () => {
      if (this.updateTimer){
          clearTimeout(this.updateTimer);
          this.updateTimer = null;
      }

      this.updateTimer = setTimeout(() => {
        const url = this.getLayerUrl();
        const { color_map,
                formula,
                bands,
                hillshade } = this.state;

        const newUrl = (url.indexOf("?") !== -1 ? url.slice(0, url.indexOf("?")) : url) + Utils.toSearchQuery({
            color_map,
            formula,
            bands,
            hillshade,
            rescale: encodeURIComponent(this.rescale)
        });

        const { layer } = this.props;

        layer.setUrl(newUrl, true);
            
        // Hack to get leaflet to actually redraw tiles :/
        layer._removeAllTiles();
        setTimeout(() => {
            layer.redraw();
        }, 1);
    }, 200);
  }

  handleHistogramUpdate = e => {
    this.rescale = `${e.min},${e.max}`;
    this.updateLayer();
  }

  render(){
    const { layer } = this.props;
    const { color_map } = this.state;

    const tmeta = layer[Symbol.for("tile-meta")];
    const meta = layer[Symbol.for("meta")];

    return (<div className="layers-control-layer">
        <ExpandButton bind={[this, 'expanded']} /><Checkbox bind={[this, 'visible']}/> 
        <a className="layer-label" href="javascript:void(0);" onClick={this.handleLayerClick}>{meta.name}</a>

        {this.state.expanded ? 
        <div className="layer-expanded">
            <Histogram width={280} 
                        statistics={tmeta.statistics} 
                        colorMap={tmeta.color_map}
                        onUpdate={this.handleHistogramUpdate} />

            {this.state.color_map ? 
            <div className="row form-group form-inline">
                <label className="col-sm-3 control-label">Color:</label>
                <div className="col-sm-9 ">
                    <select className="form-control" value={color_map} onChange={this.handleSelectColor}>
                        {this.colorMaps.map(c => <option key={c.key} value={c.key}>{c.label}</option>)}
                    </select>
                </div>
            </div> : ""}
        </div>
        : ""}
    </div>);
                
  }
}