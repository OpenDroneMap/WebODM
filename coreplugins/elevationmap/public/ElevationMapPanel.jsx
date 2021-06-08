import React from 'react';
import PropTypes from 'prop-types';
import Storage from 'webodm/classes/Storage';
import L from 'leaflet';
import area from '@turf/area'
import './ElevationMapPanel.scss';
import ErrorMessage from 'webodm/components/ErrorMessage';
import ReactTooltip from 'react-tooltip'

export default class ElevationMapPanel extends React.Component {
  static defaultProps = {
  };
  static propTypes = {
    onClose: PropTypes.func.isRequired,
    tasks: PropTypes.object.isRequired,
    isShowed: PropTypes.bool.isRequired,
    map: PropTypes.object.isRequired,
    layersControl: PropTypes.object.isRequired
  }

  constructor(props){
    super(props);

    this.state = {
        error: "",
        permanentError: "",
        interval: Storage.getItem("last_elevationmap_interval") || "5",
        reference: "Sea",
        noiseFilterSize: Storage.getItem("last_elevationmap_noise_filter_size") || "3",
        customNoiseFilterSize: Storage.getItem("last_elevationmap_custom_noise_filter_size") || "3",
        epsg: Storage.getItem("last_elevationmap_epsg") || "4326",
        customEpsg: Storage.getItem("last_elevationmap_custom_epsg") || "4326",
        references: [],
        loading: true,
        task: props.tasks[0] || null,
        previewLoading: false,
        exportLoading: false,
        previewLayer: null,
        opacity: 100,
    };
  }

  componentDidUpdate(){
    if (this.props.isShowed && this.state.loading){
      const {id, project} = this.state.task;

      this.loadingReq = $.getJSON(`/api/projects/${project}/tasks/${id}/`)
          .done(res => {
              const { available_assets } = res;
              let references = ['Sea'];

              if (available_assets.indexOf("dsm.tif") === -1) 
                this.setState({permanentError: "No DSM is available. Make sure to process a task with either the --dsm option checked"});
              if (available_assets.indexOf("dtm.tif") !== -1) 
                references.push("Ground");
              this.setState({references, reference: references[0]});
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

  handleSelectNoiseFilterSize = e => {
    this.setState({noiseFilterSize: e.target.value});
  }

  handleChangeCustomNoiseFilterSize = e => {
    this.setState({customNoiseFilterSize: e.target.value});
  }
  
  handleSelectReference = e => {
    this.setState({reference: e.target.value});
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
      noiseFilterSize, customNoiseFilterSize, reference } = this.state;
    return {
      interval: interval !== "custom" ? interval : customInterval,
      epsg: epsg !== "custom" ? epsg : customEpsg,
      noise_filter_size: noiseFilterSize !== "custom" ? noiseFilterSize : customNoiseFilterSize,
      reference
    };
  }

  waitForCompletion = (taskId, celery_task_id, cb) => {
    let errorCount = 0;

    const check = () => {
      $.ajax({
          type: 'GET',
          url: `/api/plugins/elevationmap/task/${taskId}/elevationmap/check/${celery_task_id}`
      }).done(result => {
          if (result.error){
            cb(result.error);
          }else if (result.ready){
            cb();
          }else{
            // Retry
            setTimeout(() => check(), 2000);
          }
      }).fail(error => {
          console.warn(error);
          if (errorCount++ < 10) setTimeout(() => check(), 2000);
          else cb(JSON.stringify(error));
      });
    };

    check();
  }

  heatmap_coloring = (value, lowest, highest) => {
    const ratio = (value - lowest) / (highest - lowest);
    const h = 315 * (1 - ratio) / 360;
    const s = 1;
    const l = 0.5;
    let r, g, b;
    const hue2rgb = (p, q, t) => {
      if (t < 0) t += 1;
      if (t > 1) t -= 1;
      if (t < 1 / 6) return p + (q - p) * 6 * t;
      if (t < 1 / 2) return q;
      if (t < 2 / 3) return p + (q - p) * (2 / 3 - t) * 6;
      return p;
    };
    const q = l < 0.5 ? l * (1 + s) : l + s - l * s;
    const p = 2 * l - q;
    r = hue2rgb(p, q, h + 1 / 3);
    g = hue2rgb(p, q, h);
    b = hue2rgb(p, q, h - 1 / 3);
    const toHex = x => {
      const hex = Math.round(x * 255).toString(16);
      return hex.length === 1 ? '0' + hex : hex;
    };
    return `#${toHex(r)}${toHex(g)}${toHex(b)}`;
  }

  addGeoJSONFromURL = (url, cb) => {
    const { map, layersControl } = this.props;

    $.getJSON(url)
     .done((geojson) => {
       try{
        this.removePreview();

        // Calculating all the elevation levels present
        const allLevels = geojson.features.map(feature => [feature.properties.bottom, feature.properties.top]).flat().sort((a, b) => a - b);
        const lowestLevel = allLevels[0];
        const highestLevel = allLevels[allLevels.length - 1];

        let featureGroup = L.featureGroup();
        geojson.features.forEach(levelFeature => {
          const top = levelFeature.properties.top;
          const bottom = levelFeature.properties.bottom;
          const rgbHex = this.heatmap_coloring((bottom + top) / 2, lowestLevel, highestLevel);
          const areaInLevel = area(levelFeature).toFixed(2);
          let geojsonForLevel = L.geoJSON(levelFeature).setStyle({color: rgbHex, fill: true, fillColor: rgbHex, fillOpacity: 1})
              .bindPopup(`Altitude: Between ${bottom}m and ${top}m<BR>Area: ${areaInLevel}m2`)
              .on('popupopen', popup => {
                // Make all other layers transparent and highlight the clicked one
                featureGroup.getLayers().forEach(layer => layer.setStyle({ fillOpacity: 0.4 * this.state.opacity}));
                popup.propagatedFrom.setStyle({ color: "black",  fillOpacity: this.state.opacity }).bringToFront()
              })
              .on('popupclose', popup => {
                // Reset all layers to their original state
                featureGroup.getLayers().forEach(layer => layer.bringToFront().setStyle({ fillOpacity: this.state.opacity }));
                popup.propagatedFrom.setStyle({ color: rgbHex });
              });
          featureGroup.addLayer(geojsonForLevel);
        });
        
        featureGroup.geojson = geojson;
        
        this.setState({ previewLayer: featureGroup });
        this.state.previewLayer.addTo(map);
        layersControl.addOverlay(this.state.previewLayer, "Elevation Map");

        cb();
      }catch(e){
        cb(e.message);
      }
     })
     .fail(cb);
  }

  removePreview = () => {
    const { map, layersControl } = this.props;

    if (this.state.previewLayer){
      map.removeLayer(this.state.previewLayer);
      layersControl.removeLayer(this.state.previewLayer);
      this.setState({previewLayer: null});
    }
  }

  generateElevationMap = (data, loadingProp, isPreview) => {
    this.setState({[loadingProp]: true, error: ""});
    const taskId = this.state.task.id;

    // Save settings for next time
    Storage.setItem("last_elevationmap_interval", this.state.interval);
    Storage.setItem("last_elevationmap_custom_interval", this.state.customInterval);
    Storage.setItem("last_elevationmap_noise_filter_size", this.state.noiseFilterSize);
    Storage.setItem("last_elevationmap_custom_noise_filter_size", this.state.customNoiseFilterSize);
    Storage.setItem("last_elevationmap_epsg", this.state.epsg);
    Storage.setItem("last_elevationmap_custom_epsg", this.state.customEpsg);
    
    this.generateReq = $.ajax({
        type: 'POST',
        url: `/api/plugins/elevationmap/task/${taskId}/elevationmap/generate`,
        data: data
    }).done(result => {
        if (result.celery_task_id){
          this.waitForCompletion(taskId, result.celery_task_id, error => {
            if (error) this.setState({[loadingProp]: false, 'error': error});
            else{
              const fileUrl = `/api/plugins/elevationmap/task/${taskId}/elevationmap/download/${result.celery_task_id}`;

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
      const data = this.getFormValues();
      data.format = format;
      this.generateElevationMap(data, 'exportLoading', false);
    };
  }

  handleShowPreview = () => {
    this.setState({previewLoading: true});

    const data = this.getFormValues();
    data.epsg = 4326;
    data.format = "GeoJSON";
    this.generateElevationMap(data, 'previewLoading', true);
  }
  
  handleChangeOpacity = (evt) => {
    const opacity = parseFloat(evt.target.value) / 100;
    this.setState({opacity: opacity});
    this.state.previewLayer.setStyle({ opacity: opacity, fillOpacity: opacity });
    this.props.map.closePopup();
  }

  render(){
    const { loading, task, references, error, permanentError, interval, reference, 
            epsg, customEpsg, exportLoading,
            noiseFilterSize, customNoiseFilterSize,
            previewLoading, previewLayer, opacity} = this.state;
    const noiseFilterSizeValues = [{label: 'Do not filter noise', value: 0},
                            {label: 'Normal', value: 3},
                            {label: 'Aggressive', value: 5}];

    const disabled = (epsg === "custom" && !customEpsg) ||
                      (noiseFilterSize === "custom" && !customNoiseFilterSize);

    let content = "";
    if (loading) content = (<span><i className="fa fa-circle-notch fa-spin"></i> Loading...</span>);
    else if (permanentError) content = (<div className="alert alert-warning">{permanentError}</div>);
    else{
      content = (<div>
        <ErrorMessage bind={[this, "error"]} />
          <div className="row form-group form-inline">
            <label className="col-sm-3 control-label">Interval:</label>
            <div className="col-sm-9 ">
              <input type="text" className="form-control" value={interval} onChange={this.handleSelectInterval} /><span></span>
              <p className="glyphicon glyphicon-info-sign help" data-tip="You have two options:<br/>&#8226; Insert your custom elevation intervals, in the form: 10-15,20-30. <br/>&#8226; Insert a number (for example 5) and the intervals will be auto generated every 5 meters based on the elevation data." />
            </div>
          </div>

        <div className="row form-group form-inline">
          <label className="col-sm-3 control-label">Reference:</label>
          <div className="col-sm-9 ">
            <select className="form-control" value={reference} onChange={this.handleSelectReference}>
              {references.map(r => <option value={r}>{r}</option>)}
            </select>
            <p className="glyphicon glyphicon-info-sign help" data-tip="You can determine if the intervals specified above will be based on the sea level, or on the ground.<br/>Take into account that in order to be able to select 'ground' you need to have run the task with the --dtm option." />
          </div>
        </div>

        <div className="row form-group form-inline">
          <label className="col-sm-3 control-label">Noise Filter:</label>
          <div className="col-sm-9 ">
            <select className="form-control" value={noiseFilterSize} onChange={this.handleSelectNoiseFilterSize}>
              {noiseFilterSizeValues.map(sv => <option value={sv.value}>{sv.label} ({sv.value} meter)</option>)}
              <option value="custom">Custom</option>
            </select>
            <p className="glyphicon glyphicon-info-sign help" data-tip="You can determine the diameter of the area used to filter noise." />
          </div>
        </div>
        {noiseFilterSize === "custom" ? 
          <div className="row form-group form-inline">
            <label className="col-sm-3 control-label">Value:</label>
            <div className="col-sm-9 ">
              <input type="number" className="form-control custom-interval" value={customNoiseFilterSize} onChange={this.handleChangeCustomNoiseFilterSize} /><span> meter</span>
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
        
        {previewLayer ? 
          <div className="row form-group form-inline">
            <label className="col-sm-3 control-label">Opacity:</label>
            <div className="col-sm-9">
              <input type="range" className="slider" step="1" value={opacity * 100} onChange={this.handleChangeOpacity} />
              <p className="glyphicon glyphicon-info-sign help" data-tip="Control the opacity of the elevation map. You must generate a preview to be able to control the opacity." />
              <ReactTooltip place="left" effect="solid" html={true}/>
            </div>
          </div>
        : ""}

        <div className="row action-buttons">          
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
                    <i className="fa fa-file fa-fw"></i> AutoCAD (.DXF)
                  </a>
                </li>
                <li>
                  <a href="javascript:void(0);" onClick={this.handleExport("GeoJSON")}>
                    <i className="fa fa-code fa-fw"></i> GeoJSON (.JSON)
                  </a>
                </li>
                <li>
                  <a href="javascript:void(0);" onClick={this.handleExport("ESRI Shapefile")}>
                    <i className="fa fa-file-archive fa-fw"></i> ShapeFile (.SHP)
                  </a>
                </li>
              </ul>
            </div>
          </div>
        </div>
        <ReactTooltip place="left" effect="solid" html={true}/>
      </div>);
    }

    return (<div className="elevationmap-panel">
      <span className="close-button" onClick={this.props.onClose}/>
      <div className="title">Elevation Map</div>
      <hr/>
      {content}
    </div>);
  }
}