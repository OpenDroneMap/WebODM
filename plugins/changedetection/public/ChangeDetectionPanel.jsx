import React from 'react';
import PropTypes from 'prop-types';
import Storage from 'webodm/classes/Storage';
import L from 'leaflet';
require('leaflet.heat')
import './ChangeDetectionPanel.scss';
import ErrorMessage from 'webodm/components/ErrorMessage';
import ReactTooltip from 'react-tooltip'

export default class ChangeDetectionPanel extends React.Component {
  static defaultProps = {
  };
  static propTypes = {
    onClose: PropTypes.func.isRequired,
    tasks: PropTypes.object.isRequired,
    isShowed: PropTypes.bool.isRequired,
    map: PropTypes.object.isRequired,
    alignSupported: PropTypes.bool.isRequired,
  }

  constructor(props){
    super(props);

    this.state = {
        error: "",
        permanentError: "",
        epsg: Storage.getItem("last_changedetection_epsg") || "4326",
        customEpsg: Storage.getItem("last_changedetection_custom_epsg") || "4326",
        displayType: Storage.getItem("last_changedetection_display_type") || "contours",
        resolution: Storage.getItem("last_changedetection_resolution") || 0.2,
        minArea: Storage.getItem("last_changedetection_min_area") || 40,
        minHeight: Storage.getItem("last_changedetection_min_height") || 5,
        role: Storage.getItem("last_changedetection_role") || 'reference',
        align: this.props.alignSupported ? (Storage.getItem("last_changedetection_align") || false) : false,
        other: "",
        otherTasksInProject: new Map(),
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
      const {id: taskId, project} = this.state.task;

      this.loadingReq = $.getJSON(`/api/projects/${project}/tasks/`)
          .done(res => {

              const otherTasksInProject = new Map()

              if (!this.props.alignSupported) {
                const myTask = res.filter(({ id }) => id === taskId)[0]
                const { available_assets: myAssets } = myTask;
                const errors = []

                if (myAssets.indexOf("dsm.tif") === -1)
                  errors.push("No DSM is available. Make sure to process a task with either the --dsm option checked");
                if (myAssets.indexOf("dtm.tif") === -1)
                  errors.push("No DTM is available. Make sure to process a task with either the --dtm option checked");

                if (errors.length > 0) {
                  this.setState({permanentError: errors.join('\n')});
                  return
                }

                const otherTasksWithDEMs = res.filter(({ id }) => id !== taskId)
                  .filter(({ available_assets }) => available_assets.indexOf("dsm.tif") >= 0 && available_assets.indexOf("dtm.tif") >= 0)

                if (otherTasksWithDEMs.length === 0) {
                  this.setState({permanentError: "Couldn't find other tasks on the project. Please make sure there are other tasks on the project that have both a DTM and DSM."});
                  return
                }
                otherTasksWithDEMs.forEach(({ id, name }) => otherTasksInProject.set(id, name))
              } else {
                res.filter(({ id }) => id !== taskId)
                  .forEach(({ id, name }) => otherTasksInProject.set(id, name))
              }

              if (otherTasksInProject.size === 0) {
                  this.setState({permanentError: `Couldn't find other tasks on this project. This plugin must be used on projects with 2 or more tasks.`})
              } else {
                  const firstOtherTask = Array.from(otherTasksInProject.entries())[0][0]
                  this.setState({otherTasksInProject, other: firstOtherTask});
              }
          })
          .fail(() => {
            this.setState({permanentError: `Cannot retrieve information for the current project. Are you are connected to the internet?`})
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

  handleSelectMinArea = e => {
    this.setState({minArea: e.target.value});
  }

  handleSelectResolution = e => {
    this.setState({resolution: e.target.value});
  }

  handleSelectMinHeight = e => {
    this.setState({minHeight: e.target.value});
  }

  handleSelectRole = e => {
    this.setState({role: e.target.value});
  }

  handleSelectOther = e => {
    this.setState({other: e.target.value});
  }

  handleSelectEpsg = e => {
    this.setState({epsg: e.target.value});
  }

  handleSelectDisplayType = e => {
    this.setState({displayType: e.target.value});
  }

  handleChangeAlign = e => {
    this.setState({align: e.target.checked});
  }

  handleChangeCustomEpsg = e => {
    this.setState({customEpsg: e.target.value});
  }

  getFormValues = () => {
    const { epsg, customEpsg, displayType, align,
       resolution, minHeight, minArea, other, role } = this.state;
    return {
      display_type: displayType,
      resolution: resolution,
      min_height: minHeight,
      min_area: minArea,
      role: role,
      epsg: epsg !== "custom" ? epsg : customEpsg,
      other_task: other,
      align: align,
    };
  }

  waitForCompletion = (taskId, celery_task_id, cb) => {
    let errorCount = 0;

    const check = () => {
      $.ajax({
          type: 'GET',
          url: `/api/plugins/changedetection/task/${taskId}/changedetection/check/${celery_task_id}`
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

  addPreview = (url, cb) => {
    const { map } = this.props;

    $.getJSON(url)
     .done((result) => {
       try{
        this.removePreview();

        if (result.max) {
            const heatMap = L.heatLayer(result.values, { max: result.max, radius: 9, minOpacity: 0 })
            heatMap.setStyle = ({ opacity }) => heatMap.setOptions({ max: result.max / opacity } )
            this.setState({ previewLayer: heatMap });
        } else {
            let featureGroup = L.featureGroup();
            result.features.forEach(feature => {
              const area = feature.properties.area.toFixed(2);
              const min = feature.properties.min.toFixed(2);
              const max = feature.properties.max.toFixed(2);
              const avg = feature.properties.avg.toFixed(2);
              const std = feature.properties.std.toFixed(2);
              let geojsonForLevel = L.geoJSON(feature)
                  .bindPopup(`Area: ${area}m2<BR/>Min: ${min}m<BR/>Max: ${max}m<BR/>Avg: ${avg}m<BR/>Std: ${std}m`)
              featureGroup.addLayer(geojsonForLevel);
            });
            featureGroup.geojson = result;
            this.setState({ previewLayer: featureGroup });
        }

        this.state.previewLayer.addTo(map);

        cb();
      }catch(e){
          throw e
        cb(e.message);
      }
     })
     .fail(cb);
  }

  removePreview = () => {
    const { map } = this.props;

    if (this.state.previewLayer){
      map.removeLayer(this.state.previewLayer);
      this.setState({previewLayer: null});
    }
  }

  generateChangeMap = (data, loadingProp, isPreview) => {
    this.setState({[loadingProp]: true, error: ""});
    const taskId = this.state.task.id;

    // Save settings for next time
    Storage.setItem("last_changedetection_display_type", this.state.displayType);
    Storage.setItem("last_changedetection_resolution", this.state.resolution);
    Storage.setItem("last_changedetection_min_height", this.state.minHeight);
    Storage.setItem("last_changedetection_min_area", this.state.minArea);
    Storage.setItem("last_changedetection_epsg", this.state.epsg);
    Storage.setItem("last_changedetection_custom_epsg", this.state.customEpsg);
    Storage.setItem("last_changedetection_role", this.state.role);
    Storage.setItem("last_changedetection_align", this.state.align);



    this.generateReq = $.ajax({
        type: 'POST',
        url: `/api/plugins/changedetection/task/${taskId}/changedetection/generate`,
        data: data
    }).done(result => {
        if (result.celery_task_id){
          this.waitForCompletion(taskId, result.celery_task_id, error => {
            if (error) this.setState({[loadingProp]: false, 'error': error});
            else{
              const fileUrl = `/api/plugins/changedetection/task/${taskId}/changedetection/download/${result.celery_task_id}`;

              // Preview
              if (isPreview){
                this.addPreview(fileUrl, e => {
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
      data.display_type = 'contours'
      this.generateChangeMap(data, 'exportLoading', false);
    };
  }

  handleShowPreview = () => {
    this.setState({previewLoading: true});

    const data = this.getFormValues();
    data.epsg = 4326;
    data.format = "GeoJSON";
    this.generateChangeMap(data, 'previewLoading', true);
  }

  handleChangeOpacity = (evt) => {
    const opacity = parseFloat(evt.target.value) / 100;
    this.setState({opacity: opacity});
    this.state.previewLayer.setStyle({ opacity: opacity });
    this.props.map.closePopup();
  }

  render(){
    const { loading, task, otherTasksInProject, error, permanentError, other,
            epsg, customEpsg, exportLoading, minHeight, minArea, displayType,
            resolution, previewLoading, previewLayer, opacity, role, align } = this.state;

    const disabled = (epsg === "custom" && !customEpsg) || !other;

    let content = "";
    if (loading) content = (<span><i className="fa fa-circle-notch fa-spin"></i> Loading...</span>);
    else if (permanentError) content = (<div className="alert alert-warning">{permanentError}</div>);
    else{
      content = (<div>
        <ErrorMessage bind={[this, "error"]} />

        <div className="row form-group form-inline">
          <label className="col-sm-3 control-label">Role:</label>
          <div className="col-sm-9 ">
            <select className="form-control" value={role} onChange={this.handleSelectRole}>
              <option value="reference">Reference</option>
              <option value="compare">Compare</option>
            </select>
            <p className="glyphicon glyphicon-info-sign help" data-tip="This plugin will take the reference task, and substract the compare task. Then, we will apply the filters<BR/>available below to determine if some difference is a valid change or not." />
          </div>
        </div>

        <div className="row form-group form-inline">
          <label className="col-sm-3 control-label">Other:</label>
          <div className="col-sm-9 ">
            <select className="form-control" value={other} onChange={this.handleSelectOther}>
              {Array.from(otherTasksInProject.entries()).map(([id, name]) => <option value={id} title={name}>{name.length > 20 ? name.substring(0, 19) + '...' : name}</option>)}
            </select>
            {this.props.alignSupported ?
              <p className="glyphicon glyphicon-info-sign help" data-tip="Select the other task on the project to compare this task against." />
            :
              <p className="glyphicon glyphicon-info-sign help" data-tip="Select the other task on the project to compare this task against.<BR/>Take into account that only tasks with both a DSM and DTM will be available here." />
            }
          </div>
        </div>

        {this.props.alignSupported ?
          <div className="row form-group form-inline">
            <label className="col-sm-3 control-label">Align:</label>
            <div className="col-sm-9 ">
              <input type="checkbox" className="form-control" checked={align} onChange={this.handleChangeAlign} />
              <p className="glyphicon glyphicon-info-sign help" data-tip="It is possible to align the two tasks to detect changes more accurately.<BR/>But take into account that the processing can take longer if you do so." />
            </div>
          </div>
        : ""}


        <div className="row form-group form-inline">
          <label className="col-sm-3 control-label">Display mode:</label>
          <div className="col-sm-9 ">
            <select className="form-control" value={displayType} onChange={this.handleSelectDisplayType}>
              <option value="contours">Contours</option>
              <option value="heatmap">Heatmap</option>
            </select>
            <p className="glyphicon glyphicon-info-sign help" data-tip="You can select to display a heatmap with all the substraction, or the contours of the filtered changes.<BR/>Export is only available for the 'Contours' mode." />
          </div>
        </div>

        <div className="row form-group form-inline">
          <label className="col-sm-3 control-label">Resolution:</label>
          <div className="col-sm-9 ">
            <input type="number" className="form-control custom-interval" value={resolution} onChange={this.handleSelectResolution} /><span> meters/pixel</span>
            <p className="glyphicon glyphicon-info-sign help" data-tip="You can indicate the resolution to use when detecting changes. The final resolution used will be: max(input, resolution(reference), resolution(compare)).<BR/>The higher the resolution, the faster the result will be calculated. You can set to 0 to use the DEMs resolutions." />
          </div>
        </div>

        <div className="row form-group form-inline">
          <label className="col-sm-3 control-label">Min Height:</label>
          <div className="col-sm-9 ">
            <input type="number" className="form-control custom-interval" value={minHeight} onChange={this.handleSelectMinHeight} /><span> meters</span>
            <p className="glyphicon glyphicon-info-sign help" data-tip="When detecting change, there can be some noise. Please indicate the min height that change needs to have to consider it a valid change." />
          </div>
        </div>

        <div className="row form-group form-inline">
          <label className="col-sm-3 control-label">Min Area:</label>
          <div className="col-sm-9 ">
            <input type="number" disabled={displayType === 'heatmap'} className="form-control custom-interval" value={minArea} onChange={this.handleSelectMinArea} /><span> sq meters</span>
            <p className="glyphicon glyphicon-info-sign help" data-tip="When detecting change, there can be some noise. Please indicate the min area that change needs to have to consider it a valid change.<BR/>This option is only available with the 'Contours' display mode." />

          </div>
        </div>

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
              <p className="glyphicon glyphicon-info-sign help" data-tip="Control the opacity of the change map. You must generate a preview to be able to control the opacity." />
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
              <button disabled={disabled || exportLoading || displayType === 'heatmap'} title={displayType === 'heatmap' ? "Export is only available for the 'Contours' display mode" : ""} type="button" className="btn btn-sm btn-primary" data-toggle="dropdown">
                {exportLoading ? <i className="fa fa-spin fa-circle-notch"/> : <i className="glyphicon glyphicon-download" />} Export
              </button>
              <button disabled={disabled|| exportLoading || displayType === 'heatmap'} title={displayType === 'heatmap' ? "Export is only available for the 'Contours' display mode" : ""} type="button" className="btn btn-sm dropdown-toggle btn-primary" data-toggle="dropdown"><span className="caret"></span></button>
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

    return (<div className="changedetection-panel">
      <span className="close-button" onClick={this.props.onClose}/>
      <div className="title">Change Detection</div>
      <hr/>
      {content}
    </div>);
  }
}
