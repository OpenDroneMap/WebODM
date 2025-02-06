import React from 'react';
import PropTypes from 'prop-types';
import Storage from 'webodm/classes/Storage';
import L from 'leaflet';
import './ContoursPanel.scss';
import ErrorMessage from 'webodm/components/ErrorMessage';
import Workers from 'webodm/classes/Workers';
import { _ } from 'webodm/classes/gettext';
import { systems, getUnitSystem, onUnitSystemChanged, offUnitSystemChanged, toMetric } from 'webodm/classes/Units';

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

    const unitSystem = getUnitSystem();
    const defaultInterval = unitSystem === "metric" ? "1" : "4";
    const defaultSimplify = unitSystem === "metric" ? "0.2" : "0.6";

    // Remove legacy parameters
    Storage.removeItem("last_contours_interval");
    Storage.removeItem("last_contours_custom_interval");
    Storage.removeItem("last_contours_simplify");
    Storage.removeItem("last_contours_custom_simplify");

    this.state = {
        error: "",
        permanentError: "",
        interval: Storage.getItem("last_contours_interval_" + unitSystem) || defaultInterval,
        customInterval: Storage.getItem("last_contours_custom_interval_" + unitSystem) || defaultInterval,
        simplify: Storage.getItem("last_contours_simplify_" + unitSystem) || defaultSimplify,
        customSimplify: Storage.getItem("last_contours_custom_simplify_" + unitSystem) || defaultSimplify,
        layer: "",
        epsg: Storage.getItem("last_contours_epsg") || "4326",
        customEpsg: Storage.getItem("last_contours_custom_epsg") || "4326",
        layers: [],
        loading: true,
        task: props.tasks[0] || null,
        previewLoading: false,
        exportLoading: false,
        previewLayer: null,
        unitSystem
    };
  }

  componentDidMount(){
    onUnitSystemChanged(this.unitsChanged);
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
                this.setState({permanentError: _("No DSM or DTM is available. To export contours, make sure to process a task with either the --dsm or --dtm option checked.")});
              }
          })
          .fail(() => {
            this.setState({permanentError: _("Cannot retrieve information for task. Are you are connected to the internet?")})
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

    offUnitSystemChanged(this.unitsChanged);
  }

  unitsChanged = e => {
    this.saveInputValues();

    const unitSystem = e.detail;

    const defaultInterval = unitSystem === "metric" ? "1" : "4";
    const defaultSimplify = unitSystem === "metric" ? "0.2" : "0.5";

    const interval = Storage.getItem("last_contours_interval_" + unitSystem) || defaultInterval;
    const customInterval = Storage.getItem("last_contours_custom_interval_" + unitSystem) || defaultInterval;
    const simplify = Storage.getItem("last_contours_simplify_" + unitSystem) || defaultSimplify;
    const customSimplify = Storage.getItem("last_contours_custom_simplify_" + unitSystem) || defaultSimplify;

    this.setState({unitSystem, interval, customInterval, simplify, customSimplify });
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

  getFormValues = (preview) => {
    const { interval, customInterval, epsg, customEpsg, 
      simplify, customSimplify, layer, unitSystem } = this.state;
    const su = systems[unitSystem];

    let meterInterval = interval !== "custom" ? interval : customInterval;
    let meterSimplify = simplify !== "custom" ? simplify : customSimplify;

    meterInterval = toMetric(meterInterval, su.lengthUnit(1)).value;
    meterSimplify = toMetric(meterSimplify, su.lengthUnit(1)).value;
    
    const zfactor = preview ? 1 : su.lengthUnit(1).factor;

    return {
      interval: meterInterval,
      epsg: epsg !== "custom" ? epsg : customEpsg,
      simplify: meterSimplify,
      zfactor,
      layer
    };
  }

  addGeoJSONFromURL = (url, cb) => {
    const { map } = this.props;
    const us = systems[this.state.unitSystem];

    $.getJSON(url)
     .done((geojson) => {
      try{
        this.handleRemovePreview();

        this.setState({previewLayer: L.geoJSON(geojson, {
          onEachFeature: (feature, layer) => {
              if (feature.properties && feature.properties.level !== undefined) {
                  layer.bindPopup(`<div style="margin-right: 32px;"><b>${_("Elevation:")}</b> ${us.elevation(feature.properties.level)}</div>`);
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

  saveInputValues = () => {
    const us = this.state.unitSystem;

    // Save settings
    Storage.setItem("last_contours_interval_" + us, this.state.interval);
    Storage.setItem("last_contours_custom_interval_" + us, this.state.customInterval);
    Storage.setItem("last_contours_simplify_" + us, this.state.simplify);
    Storage.setItem("last_contours_custom_simplify_" + us, this.state.customSimplify);
    Storage.setItem("last_contours_epsg", this.state.epsg);
    Storage.setItem("last_contours_custom_epsg", this.state.customEpsg);
  }

  generateContours = (data, loadingProp, isPreview) => {
    this.setState({[loadingProp]: true, error: ""});
    const taskId = this.state.task.id;
    this.saveInputValues();

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
          });
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
      const data = this.getFormValues(false);
      data.format = format;
      this.generateContours(data, 'exportLoading', false);
    };
  }

  handleShowPreview = () => {
    this.setState({previewLoading: true});

    const data = this.getFormValues(true);
    data.epsg = 4326;
    data.format = "GeoJSON";
    this.generateContours(data, 'previewLoading', true);
  }

  render(){
    const { loading, task, layers, error, permanentError, interval, customInterval, layer, 
            epsg, customEpsg, exportLoading,
            simplify, customSimplify,
            previewLoading, previewLayer, unitSystem } = this.state;
    const us = systems[unitSystem];
    const lengthUnit = us.lengthUnit(1); 

    const intervalStart = unitSystem === "metric" ? 1 : 4;
    const intervalValues = [intervalStart / 4, intervalStart / 2, intervalStart, intervalStart * 2, intervalStart * 4];
    const simplifyValues = [{label: _('Do not simplify'), value: 0},
                            {label: _('Normal'), value: unitSystem === "metric" ? 0.2 : 0.5},
                            {label: _('Aggressive'), value: unitSystem === "metric" ? 1 : 4}];

    const disabled = (interval === "custom" && !customInterval) ||
                      (epsg === "custom" && !customEpsg) ||
                      (simplify === "custom" && !customSimplify);

    let content = "";
    if (loading) content = (<span><i className="fa fa-circle-notch fa-spin"></i> {_("Loading…")}</span>);
    else if (permanentError) content = (<div className="alert alert-warning">{permanentError}</div>);
    else{
      content = (<div>
        <ErrorMessage bind={[this, "error"]} />
        <div className="row form-group form-inline">
          <label className="col-sm-3 control-label">{_("Interval:")}</label>
          <div className="col-sm-9 ">
            <select className="form-control" value={interval} onChange={this.handleSelectInterval}>
              {intervalValues.map(iv => <option value={iv}>{iv} {lengthUnit.label}</option>)}
              <option value="custom">{_("Custom")}</option>
            </select>
          </div>
        </div>
        {interval === "custom" ? 
          <div className="row form-group form-inline">
            <label className="col-sm-3 control-label">{_("Value:")}</label>
            <div className="col-sm-9 ">
              <input type="number" className="form-control custom-interval" value={customInterval} onChange={this.handleChangeCustomInterval} /><span> {lengthUnit.label}</span>
            </div>
          </div>
        : ""}

        <div className="row form-group form-inline">
          <label className="col-sm-3 control-label">{_("Layer:")}</label>
          <div className="col-sm-9 ">
            <select className="form-control" value={layer} onChange={this.handleSelectLayer}>
              {layers.map(l => <option value={l}>{l}</option>)}
            </select>
          </div>
        </div>

        <div className="row form-group form-inline">
          <label className="col-sm-3 control-label">{_("Simplify:")}</label>
          <div className="col-sm-9 ">
            <select className="form-control" value={simplify} onChange={this.handleSelectSimplify}>
              {simplifyValues.map(sv => <option value={sv.value}>{sv.label} ({sv.value} {lengthUnit.label})</option>)}
              <option value="custom">{_("Custom")}</option>
            </select>
          </div>
        </div>
        {simplify === "custom" ? 
          <div className="row form-group form-inline">
            <label className="col-sm-3 control-label">{_("Value:")}</label>
            <div className="col-sm-9 ">
              <input type="number" className="form-control custom-interval" value={customSimplify} onChange={this.handleChangeCustomSimplify} /><span> {lengthUnit.label}</span>
            </div>
          </div>
        : ""}

        <div className="row form-group form-inline">
          <label className="col-sm-3 control-label">{_("Projection:")}</label>
          <div className="col-sm-9 ">
            <select className="form-control" value={epsg} onChange={this.handleSelectEpsg}>
              <option value="4326">{_("Lat/Lon")} (EPSG:4326)</option>
              <option value="3857">{_("Web Mercator")} (EPSG:3857)</option>
              <option value="custom">{_("Custom")} EPSG</option>
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
              {previewLoading ? <i className="fa fa-spin fa-circle-notch"/> : <i className="glyphicon glyphicon-eye-open"/>} {_("Preview")}
            </button>

            <div className="btn-group">
              <button disabled={disabled || exportLoading} type="button" className="btn btn-sm btn-primary" data-toggle="dropdown">
                {exportLoading ? <i className="fa fa-spin fa-circle-notch"/> : <i className="glyphicon glyphicon-download" />} {_("Export")}
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
      <div className="title">{_("Contours")}</div>
      <hr/>
      {content}
    </div>);
  }
}
