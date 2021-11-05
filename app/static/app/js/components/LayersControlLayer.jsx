import React from 'react';
import PropTypes from 'prop-types';
import '../css/LayersControlLayer.scss';
import Histogram from './Histogram';
import { Checkbox, ExpandButton } from './Toggle';
import Utils from '../classes/Utils';
import Workers from '../classes/Workers';
import ErrorMessage from './ErrorMessage';
import ExportAssetPanel from './ExportAssetPanel';
import $ from 'jquery';
import { _, interpolate } from '../classes/gettext';

export default class LayersControlLayer extends React.Component {
  static defaultProps = {
      layer: null,
      expanded: false,
      map: null,
      overlay: false
  };
  static propTypes = {
    layer: PropTypes.object.isRequired,
    expanded: PropTypes.bool,
    map: PropTypes.object.isRequired,
    overlay: PropTypes.bool
  }

  constructor(props){
    super(props);

    this.map = props.map;
    
    const url = this.getLayerUrl();
    const params = Utils.queryParams({search: url.slice(url.indexOf("?"))});

    this.meta = props.layer[Symbol.for("meta")] || {};
    this.tmeta = props.layer[Symbol.for("tile-meta")] || {};

    // Compute download URL from metadata
    // (not ideal, but works)
    const mUrl = this.meta.metaUrl;
    const mUrlToDownload = [
        {url: "orthophoto/metadata", download: "orthophoto"},
        {url: "dsm/metadata", download: "dsm"},
        {url: "dtm/metadata", download: "dtm"}
    ];

    if (mUrl){
        for (let d of mUrlToDownload){
            const idx = mUrl.lastIndexOf(d.url);
            if (idx !== -1){
                this.asset = d.download;
                break;
            }
        }
    }

    this.state = {
        visible: this.map.hasLayer(props.layer),
        expanded: props.expanded,
        colorMap: params.color_map || "",
        formula: params.formula || "",
        bands: params.bands || "",
        hillshade: params.hillshade || "",
        histogramLoading: false,
        exportLoading: false,
        error: ""
    };

    this.rescale = params.rescale || "";
  }

  getLayerUrl = () => {
      return this.props.layer._url || "";
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

    if (prevState.formula !== this.state.formula ||
        prevState.bands !== this.state.bands){
        this.updateHistogram();
    }

    if (prevProps.expanded !== this.props.expanded){
        this.state.expanded = this.props.expanded;
    }
  }

  componentWillUnmount(){
    if (this.updateHistogramReq){
        this.updateHistogramReq.abort();
        this.updateHistogramReq = null;
    }

    if (this.exportReq){
        this.exportReq.abort();
        this.exportReq = null;
    }
  }

  handleLayerClick = () => {
    const { layer } = this.props;

    const bounds = layer.options.bounds !== undefined ? 
                   layer.options.bounds :
                   layer.getBounds();
    this.map.fitBounds(bounds);

    if (layer.getPopup()) layer.openPopup();
  }

  handleSelectColor = e => {
    this.setState({colorMap: e.target.value});
  }

  handleSelectHillshade = e => {
    this.setState({hillshade: e.target.value});
  }

  handleSelectFormula = e => {
    let bands = this.state.bands;

    // Check if bands need to be switched
    const algo = this.getAlgorithm(e.target.value);
    if (algo && algo['filters'].indexOf(bands) === -1) bands = algo['filters'][0]; // Pick first

    this.setState({formula: e.target.value, bands});
  }

  getAlgorithm = id => {
    const { algorithms } = this.tmeta;
    if (!id) return null;
    if (!algorithms) return null;

    for (let i in algorithms){
        const algo = algorithms[i];
        if (algo['id'] === id){
            return algo;
        }
    }
  }

  handleSelectBands = e => {
      this.setState({bands: e.target.value});
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

  handleExport = e => {
      const { formula } = this.state;
      const { tmeta } = this;
      const { algorithms } = tmeta;
      
      // Plant health needs to be exported
      if (formula !== "" && algorithms){
        this.setState({exportLoading: true, error: ""});
        
        this.exportReq = $.ajax({
                type: 'POST',
                url: `/api/projects/${this.meta.task.project}/tasks/${this.meta.task.id}/orthophoto/export`,
                data: this.getLayerParams()
            }).done(result => {
                if (result.celery_task_id){
                    Workers.waitForCompletion(result.celery_task_id, error => {
                        if (error) this.setState({exportLoading: false, error});
                        else{
                            this.setState({exportLoading: false});
                            Workers.downloadFile(result.celery_task_id, "odm_orthophoto_" + encodeURIComponent(this.state.formula) + ".tif");
                        }
                    });
                }else if (result.error){
                    this.setState({exportLoading: false, error: result.error});
                }else{
                    this.setState({exportLoading: false, error: interpolate(_("Invalid JSON response: %(error)s"), {error: JSON.stringify(result)})});
                }
            }).fail(error => {
                this.setState({exportLoading: false, error: JSON.stringify(error)});
            });
      }else{
          // Simple download
          window.location.href = this.downloadFileUrl;
      }
  }

  render(){
    const { colorMap, bands, hillshade, formula, histogramLoading, exportLoading } = this.state;
    const { meta, tmeta } = this;
    const { color_maps, algorithms } = tmeta;
    const algo = this.getAlgorithm(formula);

    let cmapValues = null;
    if (colorMap){
        cmapValues = (color_maps.find(c => c.key === colorMap) || {}).color_map;
    }

    return (<div className="layers-control-layer">
        {!this.props.overlay ? <ExpandButton bind={[this, 'expanded']} /> : <div className="overlayIcon"><i className={meta.icon || "fa fa-vector-square fa-fw"}></i></div>}<Checkbox bind={[this, 'visible']}/>
        <a title={meta.name} className="layer-label" href="javascript:void(0);" onClick={this.handleLayerClick}>{meta.name}</a>

        {this.state.expanded ? 
        <div className="layer-expanded">
            <Histogram width={274}
                        loading={histogramLoading}
                        statistics={tmeta.statistics} 
                        colorMap={cmapValues}
                        onUpdate={this.handleHistogramUpdate} />

            <ErrorMessage bind={[this, "error"]} />

            {formula !== "" && algorithms ? 
            <div className="row form-group form-inline">
                <label className="col-sm-3 control-label">{_("Algorithm:")}</label>
                <div className="col-sm-9 ">
                    {histogramLoading ? 
                    <i className="fa fa-circle-notch fa-spin fa-fw" /> :
                    <select title={algo.help + '\n' + algo.expr} className="form-control" value={formula} onChange={this.handleSelectFormula}>
                        {algorithms.map(a => <option key={a.id} value={a.id} title={a.help + "\n" + a.expr}>{a.id}</option>)}
                    </select>}
                </div>
            </div> : ""}

            {bands !== "" && algo ? 
            <div className="row form-group form-inline">
                <label className="col-sm-3 control-label">{_("Filter:")}</label>
                <div className="col-sm-9 ">
                    {histogramLoading ? 
                    <i className="fa fa-circle-notch fa-spin fa-fw" /> :
                    <select className="form-control" value={bands} onChange={this.handleSelectBands}>
                        {algo.filters.map(f => <option key={f} value={f}>{f}</option>)}
                    </select>}
                </div>
            </div> : ""}

            {colorMap && color_maps.length ? 
            <div className="row form-group form-inline">
                <label className="col-sm-3 control-label">{_("Color:")}</label>
                <div className="col-sm-9 ">
                    {histogramLoading ? 
                    <i className="fa fa-circle-notch fa-spin fa-fw" /> :
                    <select className="form-control" value={colorMap} onChange={this.handleSelectColor}>
                        {color_maps.map(c => <option key={c.key} value={c.key}>{c.label}</option>)}
                    </select>}
                </div>
            </div> : ""}

            {hillshade !== "" ? 
            <div className="row form-group form-inline">
                <label className="col-sm-3 control-label">{_("Shading:")}</label>
                <div className="col-sm-9 ">
                    <select className="form-control" value={hillshade} onChange={this.handleSelectHillshade}>
                        <option value="0">{_("None")}</option>
                        <option value="6">{_("Normal")}</option>
                        <option value="18">{_("Extruded")}</option>
                    </select>
                </div>
            </div> : ""}

            <ExportAssetPanel task={meta.task} 
                            asset={this.asset} 
                            exportParams={this.getLayerParams} 
                            dropUp />
        </div> : ""}
    </div>);

   }
}