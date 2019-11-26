import React from 'react';
import PropTypes from 'prop-types';
import '../css/LayersControlLayer.scss';
import Histogram from './Histogram';
import { Checkbox, ExpandButton } from './Toggle';
import Utils from '../classes/Utils';
import $ from 'jquery';

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

    this.meta = props.layer[Symbol.for("meta")];
    this.tmeta = props.layer[Symbol.for("tile-meta")];

    this.state = {
        visible: true,
        expanded: props.expanded,
        colorMap: params.color_map || "",
        formula: params.formula || "",
        bands: params.bands || "",
        hillshade: params.hillshade || "",
        histogramLoading: false
    };

    this.rescale = params.rescale || "";
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

    if (prevState.hillshade !== this.state.hillshade){
        this.updateLayer();
    }

    if (prevState.formula !== this.state.formula){
        this.updateHistogram();
    }
  }

  componentWillUnmount(){
    if (this.updateHistogramReq){
        this.updateHistogramReq.abort();
        this.updateHistogramReq = null;
    }
  }

  handleLayerClick = () => {
    this.map.fitBounds(this.props.layer.options.bounds);
    this.props.layer.openPopup();
  }

  handleSelectColor = e => {
    this.setState({colorMap: e.target.value});
  }

  handleSelectHillshade = e => {
    this.setState({hillshade: e.target.value});
  }

  handleSelectFormula = e => {
    this.setState({formula: e.target.value});
  }

  updateHistogram = () => {
    if (this.updateHistogramReq){
        this.updateHistogramReq.abort();
        this.updateHistogramReq = null;
    }

    this.setState({histogramLoading: true});
    this.updateHistogramReq = $.getJSON(Utils.buildUrlWithQuery(this.meta.metaUrl, this.getLayerParams()))
        .done(mres => {
            this.tmeta = this.props.layer[Symbol.for("tile-meta")] = mres;
            
            // Update rescale values
            const { statistics } = this.tmeta;
            if (statistics && statistics["1"]){
                this.rescale = `${statistics["1"]["min"]},${statistics["1"]["max"]}`;
            }

            this.updateLayer();
        })
        .fail(err => console.error)
        .always(() => {
            this.setState({histogramLoading: false});
        });
  }

  getLayerParams = () => {
    const { colorMap,
        formula,
        bands,
        hillshade } = this.state;
    
    return {
        color_map: colorMap,
        formula,
        bands,
        hillshade,
        rescale: this.rescale
    };
  }
  
  updateLayer = () => {
      if (this.updateTimer){
          clearTimeout(this.updateTimer);
          this.updateTimer = null;
      }

      this.updateTimer = setTimeout(() => {
        const url = this.getLayerUrl();
        const { layer } = this.props;
        const newUrl = Utils.buildUrlWithQuery(url, this.getLayerParams());

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
    const { colorMap, hillshade, formula, histogramLoading } = this.state;
    const { meta, tmeta } = this;
    const { color_maps, algorithms } = tmeta;

    let cmapValues = null;
    if (colorMap){
        cmapValues = (color_maps.find(c => c.key === colorMap) || {}).color_map;
    }

    return (<div className="layers-control-layer">
        <ExpandButton bind={[this, 'expanded']} /><Checkbox bind={[this, 'visible']}/>
        <a className="layer-label" href="javascript:void(0);" onClick={this.handleLayerClick}>{meta.name}</a>

        {this.state.expanded ? 
        <div className="layer-expanded">
            <Histogram width={280}
                        loading={histogramLoading}
                        statistics={tmeta.statistics} 
                        colorMap={cmapValues}
                        onUpdate={this.handleHistogramUpdate} />

            {formula !== "" && algorithms ? 
            <div className="row form-group form-inline">
                <label className="col-sm-3 control-label">Algorithm:</label>
                <div className="col-sm-9 ">
                    {histogramLoading ? 
                    <i className="fa fa-circle-notch fa-spin fa-fw" /> :
                    <select className="form-control" value={formula} onChange={this.handleSelectFormula}>
                        {algorithms.map(c => <option key={c.id} value={c.id}>{c.id}</option>)}
                    </select>}
                </div>
            </div> : ""}

            {colorMap && color_maps.length ? 
            <div className="row form-group form-inline">
                <label className="col-sm-3 control-label">Color:</label>
                <div className="col-sm-9 ">
                    <select className="form-control" value={colorMap} onChange={this.handleSelectColor}>
                        {color_maps.map(c => <option key={c.key} value={c.key}>{c.label}</option>)}
                    </select>
                </div>
            </div> : ""}

            {hillshade !== "" ? 
            <div className="row form-group form-inline">
                <label className="col-sm-3 control-label">Shading:</label>
                <div className="col-sm-9 ">
                    <select className="form-control" value={hillshade} onChange={this.handleSelectHillshade}>
                        <option value="0">None</option>
                        <option value="1">Normal</option>
                        <option value="3">Extruded</option>
                    </select>
                </div>
            </div> : ""}
        </div> : ""}
    </div>);
                
  }
}