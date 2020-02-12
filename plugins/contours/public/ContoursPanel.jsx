import React from 'react';
import PropTypes from 'prop-types';
import Storage from 'webodm/classes/Storage';
import L from 'leaflet';
import './ContoursPanel.scss';
import ErrorMessage from 'webodm/components/ErrorMessage';
import Workers from 'webodm/classes/Workers';

export default class ContoursPanel extends React.Component {
  static defaultProps = {
  };
  static propTypes = {
    onClose: PropTypes.func.isRequired,
    tasks: PropTypes.object.isRequired,
    isShowed: PropTypes.bool.isRequired,
    map: PropTypes.object.isRequired
  }

  constructor(props){
    super(props);

    this.state = {
        error: "",
        permanentError: "",
        interval: Storage.getItem("last_contours_interval") || "1",
        customInterval: Storage.getItem("last_contours_custom_interval") || "1",
        simplify: Storage.getItem("last_contours_simplify") || "0.2",
        customSimplify: Storage.getItem("last_contours_custom_simplify") || "0.2",
        layer: "",
        epsg: Storage.getItem("last_contours_epsg") || "4326",
        customEpsg: Storage.getItem("last_contours_custom_epsg") || "4326",
        layers: [],
        loading: true,
        task: props.tasks[0] || null,
        previewLoading: false,
        exportLoading: false,
        previewLayer: null,
    };
  }

  componentDidUpdate(){
    if (this.props.isShowed && this.state.loading){
      const {id, project} = this.state.task;

      this.loadingReq = $.getJSON(`/api/projects/${project}/tasks/${id}/`)
          .done(res => {
              const { available_assets } = res;
              let layers = [];

              if (available_assets.indexOf("dsm.tif") !== -1) layers.push("DSM");
              if (available_assets.indexOf("dtm.tif") !== -1) layers.push("DTM");

              if (layers.length > 0){
                this.setState({layers, layer: layers[0]});
            }else{
                this.setState({permanentError: "No DSM or DTM is available. To export contours, make sure to process a task with either the --dsm or --dtm option checked."});
              }
          })
          .fail(() => {
            this.setState({permanentError: `Cannot retrieve information for task ${id}. Are you are connected to the internet?`})
          })
          .always(() => {
            this.setState({loading: false});
            this.loadingReq = null;
          });
    }
  }

  componentWillUnmount(){
    if (this.loadingReq){
      this.loadingReq.abort();
      this.loadingReq = null;
    }
    if (this.generateReq){
      this.generateReq.abort();
      this.generateReq = null;
    }
  }

  handleSelectInterval = e => {
    this.setState({interval: e.target.value});
  }

  handleSelectSimplify = e => {
    this.setState({simplify: e.target.value});
  }

  handleChangeCustomSimplify = e => {
    this.setState({customSimplify: e.target.value});
  }
  
  handleSelectLayer = e => {
    this.setState({layer: e.target.value});
  }

  handleChangeCustomInterval = e => {
    this.setState({customInterval: e.target.value});
  }

  handleSelectEpsg = e => {
    this.setState({epsg: e.target.value});
  }

  handleChangeCustomEpsg = e => {
    this.setState({customEpsg: e.target.value});
  }

  getFormValues = () => {
    const { interval, customInterval, epsg, customEpsg, 
      simplify, customSimplify, layer } = this.state;
    return {
      interval: interval !== "custom" ? interval : customInterval,
      epsg: epsg !== "custom" ? epsg : customEpsg,
      simplify: simplify !== "custom" ? simplify : customSimplify,
      layer
    };
  }

  addGeoJSONFromURL = (url, cb) => {
    const { map } = this.props;

    $.getJSON(url)
     .done((geojson) => {
      try{
        this.handleRemovePreview();

        this.setState({previewLayer: L.geoJSON(geojson, {
          onEachFeature: (feature, layer) => {
              if (feature.properties && feature.properties.level !== undefined) {
                  layer.bindPopup(`<b>Elevation:</b> ${feature.properties.level} meters`);
              }
          },
          style: feature => {
              // TODO: different colors for different elevations?
              return {color: "yellow"};
          }
        })});
        this.state.previewLayer.addTo(map);

        cb();
      }catch(e){
        cb(e.message);
      }
     })
     .fail(cb);
  }

  handleRemovePreview = () => {
    const { map } = this.props;

    if (this.state.previewLayer){
      map.removeLayer(this.state.previewLayer);
      this.setState({previewLayer: null});
    }
  }

  generateContours = (data, loadingProp, isPreview) => {
    this.setState({[loadingProp]: true, error: ""});
    const taskId = this.state.task.id;

    // Save settings for next time
    Storage.setItem("last_contours_interval", this.state.interval);
    Storage.setItem("last_contours_custom_interval", this.state.customInterval);
    Storage.setItem("last_contours_simplify", this.state.simplify);
    Storage.setItem("last_contours_custom_simplify", this.state.customSimplify);
    Storage.setItem("last_contours_epsg", this.state.epsg);
    Storage.setItem("last_contours_custom_epsg", this.state.customEpsg);
    
    this.generateReq = $.ajax({
        type: 'POST',
        url: `/api/plugins/contours/task/${taskId}/contours/generate`,
        data: data
    }).done(result => {
        if (result.celery_task_id){
          Workers.waitForCompletion(result.celery_task_id, error => {
            if (error) this.setState({[loadingProp]: false, error});
            else{
              const fileUrl = `/api/plugins/contours/task/${taskId}/contours/download/${result.celery_task_id}`;

              // Preview
              if (isPreview){
                this.addGeoJSONFromURL(fileUrl, e => {
                  if (e) this.setState({error: JSON.stringify(e)});
                  this.setState({[loadingProp]: false});
                });
              }else{
                // Download
                location.href = fileUrl;
                this.setState({[loadingProp]: false});
              }
            }
          }, `/api/plugins/contours/task/${taskId}/contours/check/`);
        }else if (result.error){
            this.setState({[loadingProp]: false, error: result.error});
        }else{
            this.setState({[loadingProp]: false, error: "Invalid response: " + result});
        }
    }).fail(error => {
        this.setState({[loadingProp]: false, error: JSON.stringify(error)});
    });
  }

  handleExport = (format) => {
    return () => {
      const data = this.getFormValues();
      data.format = format;
      this.generateContours(data, 'exportLoading', false);
    };
  }

  handleShowPreview = () => {
    this.setState({previewLoading: true});

    const data = this.getFormValues();
    data.epsg = 4326;
    data.format = "GeoJSON";
    this.generateContours(data, 'previewLoading', true);
  }

  render(){
    const { loading, task, layers, error, permanentError, interval, customInterval, layer, 
            epsg, customEpsg, exportLoading,
            simplify, customSimplify,
            previewLoading, previewLayer } = this.state;
    const intervalValues = [0.25, 0.5, 1, 1.5, 2];
    const simplifyValues = [{label: 'Do not simplify', value: 0},
                            {label: 'Normal', value: 0.2},
                            {label: 'Aggressive', value: 1}];

    const disabled = (interval === "custom" && !customInterval) ||
                      (epsg === "custom" && !customEpsg) ||
                      (simplify === "custom" && !customSimplify);

    let content = "";
    if (loading) content = (<span><i className="fa fa-circle-notch fa-spin"></i> Loading...</span>);
    else if (permanentError) content = (<div className="alert alert-warning">{permanentError}</div>);
    else{
      content = (<div>
        <ErrorMessage bind={[this, "error"]} />
        <div className="row form-group form-inline">
          <label className="col-sm-3 control-label">Interval:</label>
          <div className="col-sm-9 ">
            <select className="form-control" value={interval} onChange={this.handleSelectInterval}>
              {intervalValues.map(iv => <option value={iv}>{iv} meter</option>)}
              <option value="custom">Custom</option>
            </select>
          </div>
        </div>
        {interval === "custom" ? 
          <div className="row form-group form-inline">
            <label className="col-sm-3 control-label">Value:</label>
            <div className="col-sm-9 ">
              <input type="number" className="form-control custom-interval" value={customInterval} onChange={this.handleChangeCustomInterval} /><span> meter</span>
            </div>
          </div>
        : ""}

        <div className="row form-group form-inline">
          <label className="col-sm-3 control-label">Layer:</label>
          <div className="col-sm-9 ">
            <select className="form-control" value={layer} onChange={this.handleSelectLayer}>
              {layers.map(l => <option value={l}>{l}</option>)}
            </select>
          </div>
        </div>

        <div className="row form-group form-inline">
          <label className="col-sm-3 control-label">Simplify:</label>
          <div className="col-sm-9 ">
            <select className="form-control" value={simplify} onChange={this.handleSelectSimplify}>
              {simplifyValues.map(sv => <option value={sv.value}>{sv.label} ({sv.value} meter)</option>)}
              <option value="custom">Custom</option>
            </select>
          </div>
        </div>
        {simplify === "custom" ? 
          <div className="row form-group form-inline">
            <label className="col-sm-3 control-label">Value:</label>
            <div className="col-sm-9 ">
              <input type="number" className="form-control custom-interval" value={customSimplify} onChange={this.handleChangeCustomSimplify} /><span> meter</span>
            </div>
          </div>
        : ""}

        <div className="row form-group form-inline">
          <label className="col-sm-3 control-label">Projection:</label>
          <div className="col-sm-9 ">
            <select className="form-control" value={epsg} onChange={this.handleSelectEpsg}>
              <option value="4326">WGS84 (EPSG:4326)</option>
              <option value="3857">Web Mercator (EPSG:3857)</option>
              <option value="custom">Custom EPSG</option>
            </select>
          </div>
        </div>
        {epsg === "custom" ? 
          <div className="row form-group form-inline">
            <label className="col-sm-3 control-label">EPSG:</label>
            <div className="col-sm-9 ">
              <input type="number" className="form-control custom-interval" value={customEpsg} onChange={this.handleChangeCustomEpsg} />
            </div>
          </div>
        : ""}

        <div className="row action-buttons">
          <div className="col-sm-3">
            {previewLayer ? <a title="Delete Preview" href="javascript:void(0);" onClick={this.handleRemovePreview}>
              <i className="fa fa-trash"></i>
            </a> : ""}
          </div>
          <div className="col-sm-9 text-right">
            <button onClick={this.handleShowPreview}
                    disabled={disabled || previewLoading} type="button" className="btn btn-sm btn-primary btn-preview">
              {previewLoading ? <i className="fa fa-spin fa-circle-notch"/> : <i className="glyphicon glyphicon-eye-open"/>} Preview
            </button>

            <div className="btn-group">
              <button disabled={disabled || exportLoading} type="button" className="btn btn-sm btn-primary" data-toggle="dropdown">
                {exportLoading ? <i className="fa fa-spin fa-circle-notch"/> : <i className="glyphicon glyphicon-download" />} Export
              </button>
              <button disabled={disabled|| exportLoading} type="button" className="btn btn-sm dropdown-toggle btn-primary" data-toggle="dropdown"><span className="caret"></span></button>
              <ul className="dropdown-menu  pull-right">
                <li>
                  <a href="javascript:void(0);" onClick={this.handleExport("GPKG")}>
                    <i className="fa fa-globe fa-fw"></i> GeoPackage (.GPKG)
                  </a>
                </li>
                <li>
                  <a href="javascript:void(0);" onClick={this.handleExport("DXF")}>
                    <i className="far fa-file fa-fw"></i> AutoCAD (.DXF)
                  </a>
                </li>
                <li>
                  <a href="javascript:void(0);" onClick={this.handleExport("GeoJSON")}>
                    <i className="fa fa-code fa-fw"></i> GeoJSON (.JSON)
                  </a>
                </li>
                <li>
                  <a href="javascript:void(0);" onClick={this.handleExport("ESRI Shapefile")}>
                    <i className="far fa-file-archive fa-fw"></i> ShapeFile (.SHP)
                  </a>
                </li>
              </ul>
            </div>
          </div>
        </div>
      </div>);
    }

    return (<div className="contours-panel">
      <span className="close-button" onClick={this.props.onClose}/>
      <div className="title">Contours</div>
      <hr/>
      {content}
    </div>);
  }
}