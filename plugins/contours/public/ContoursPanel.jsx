import React from 'react';
import PropTypes from 'prop-types';
import Storage from 'webodm/classes/Storage';
import L from 'leaflet';
import './ContoursPanel.scss';
import ErrorMessage from 'webodm/components/ErrorMessage';

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
        layer: "",
        epsg: Storage.getItem("last_contours_epsg") || "4326",
        customEpsg: Storage.getItem("last_contours_custom_epsg") || "4326",
        layers: [],
        loading: true,
        task: props.tasks[0] || null,
        previewLoading: false,
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
            this.setState({permanentError: `Cannot retrieve information for task ${id}. Are you are connected to the internet.`})
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
    const { interval, customInterval, epsg, customEpsg, layer } = this.state;
    return {
      interval: interval !== "custom" ? interval : customInterval,
      epsg: epsg !== "custom" ? epsg : customEpsg,
      layer
    };
  }

  waitForCompletion = (taskId, celery_task_id, cb) => {
    let errorCount = 0;

    const check = () => {
      $.ajax({
          type: 'GET',
          url: `/api/plugins/contours/task/${taskId}/contours/check/${celery_task_id}`
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

  addGeoJSONFromURL = (url, cb) => {
    const { map } = this.props;

    $.getJSON(url)
     .done((geojson) => {
      try{
        if (this.previewLayer){
          map.removeLayer(this.previewLayer);
          this.previewLayer = null;
        }

        this.previewLayer = L.geoJSON(geojson, {
          onEachFeature: (feature, layer) => {
              if (feature.properties && feature.properties.elevation !== undefined) {
                  layer.bindPopup(`<b>Elevation:</b> ${feature.properties.elevation} meters`);
              }
          },
          style: feature => {
              // TODO: different colors for different elevations?
              return {color: "yellow"};
          }
        });
        this.previewLayer.addTo(map);

        cb();
      }catch(e){
        cb(e.message);
      }
     })
     .fail(cb);
  }

  handleShowPreview = () => {
    this.setState({previewLoading: true});

    const data = this.getFormValues();
    data.epsg = 4326;
    data.format = "GeoJSON";
    data.simplify = 0.05;
    const taskId = this.state.task.id;

    this.generateReq = $.ajax({
        type: 'POST',
        url: `/api/plugins/contours/task/${taskId}/contours/generate`,
        data: data
    }).done(result => {
        if (result.celery_task_id){
          this.waitForCompletion(taskId, result.celery_task_id, error => {
            if (error) this.setState({previewLoading: false, error});
            else{
              const fileUrl = `/api/plugins/contours/task/${taskId}/contours/download/${result.celery_task_id}`;

              // Preview
              this.addGeoJSONFromURL(fileUrl, e => {
                if (e) this.setState({error: JSON.stringify(e)});
                this.setState({previewLoading: false});
              });

              // Download
              // location.href = ;
              // this.setState({previewLoading: false});
            }
          });
        }else if (result.error){
            this.setState({previewLoading: false, error: result.error});
        }else{
            this.setState({previewLoading: false, error: "Invalid response: " + result});
        }
    }).fail(error => {
        this.setState({previewLoading: false, error: JSON.stringify(error)});
    });
  }

  render(){
    const { loading, task, layers, error, permanentError, interval, customInterval, layer, 
            epsg, customEpsg,
            previewLoading } = this.state;
    const intervalValues = [0.25, 0.5, 1, 1.5, 2];

    const disabled = (interval === "custom" && !customInterval) ||
                      (epsg === "custom" && !customEpsg);

    let content = "";
    if (loading) content = (<span><i className="fa fa-circle-o-notch fa-spin"></i> Loading...</span>);
    else if (error) content = (<ErrorMessage bind={[this, "error"]} />);
    else if (permanentError) content = (<div className="alert alert-warning">{permanentError}</div>);
    else{
      content = (<div>
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

        <div className="text-right action-buttons">
          <button onClick={this.handleShowPreview}
                  disabled={disabled || previewLoading} type="button" className="btn btn-sm btn-primary btn-preview">
            {previewLoading ? <i className="fa fa-spin fa-circle-o-notch"/> : <i className="glyphicon glyphicon-eye-open"/>} Preview
          </button>

          <div className="btn-group">
            <button disabled={disabled} type="button" className="btn btn-sm btn-primary" data-toggle="dropdown">
              <i className="glyphicon glyphicon-download"></i> Export
            </button>
            <button disabled={disabled} type="button" className="btn btn-sm dropdown-toggle btn-primary" data-toggle="dropdown"><span className="caret"></span></button>
            <ul className="dropdown-menu  pull-right">
              <li>
                <a href="javascript:void(0);">
                  <i className="fa fa-globe fa-fw"></i> GeoPackage (.GPKG)
                </a>
              </li>
              <li>
                <a href="javascript:void(0);">
                  <i className="fa fa-file-o fa-fw"></i> AutoCAD (.DXF)
                </a>
              </li>
              <li>
                <a href="javascript:void(0);">
                  <i className="fa fa-file-zip-o fa-fw"></i> ShapeFile (.SHP)
                </a>
              </li>
            </ul>
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