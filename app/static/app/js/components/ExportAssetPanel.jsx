import React from 'react';
import PropTypes from 'prop-types';
import '../css/ExportAssetPanel.scss';
import ErrorMessage from './ErrorMessage';
import Storage from '../classes/Storage';
import { _ } from '../classes/gettext';
import Utils from '../classes/Utils';
import Workers from '../classes/Workers';

export default class ExportAssetPanel extends React.Component {
  static defaultProps = {
      exportFormats: ["gtiff", "gtiff-rgb", "jpg", "png"],
      asset: "",
      exportParams: {},
      task: null,
      dropUp: false
  };
  static propTypes = {
      exportFormats: PropTypes.arrayOf(PropTypes.string),
      asset: PropTypes.string.isRequired,
      exportParams: PropTypes.oneOfType([
          PropTypes.func,
          PropTypes.object
      ]),
      task: PropTypes.object.isRequired,
      dropUp: PropTypes.bool
  }

  constructor(props){
    super(props);

    this.efInfo = {
        'gtiff': {
            label: _("GeoTIFF (Raw)"),
            icon: "far fa-image"
        },
        'gtiff-rgb': {
            label: _("GeoTIFF (RGB)"),
            icon: "fas fa-palette"
        },
        'jpg': {
            label: _("JPEG (RGB)"),
            icon: "fas fa-palette"
        },
        'png': {
            label: _("PNG (RGB)"),
            icon: "fas fa-palette"
        }
    };

    this.state = {
        error: "",
        format: props.exportFormats[0],
        epsg: this.props.task.epsg || "4326",
        customEpsg: Storage.getItem("last_export_custom_epsg") || "4326",
        exporting: false
    }
  }

  

  getEpsg = () => {
    return this.state.epsg !== "custom" ? this.state.epsg : this.state.customEpsg;
  }

  handleSelectFormat = e => {
    this.setState({format: e.target.value});
  }


  handleSelectEpsg = e => {
    this.setState({epsg: e.target.value});
  }

  handleChangeCustomEpsg = e => {
    this.setState({customEpsg: e.target.value});
  }

  getExportParams = (format) => {
      let params = {};

      if (typeof this.props.exportParams === 'function'){
        params = Utils.clone(this.props.exportParams());
      }else{
        params = Utils.clone(this.props.exportParams);
      }
      
      params.format = format;
      params.epsg = this.getEpsg();
      return params;
  }

  handleExport = (format) => {
    return () => {
        const { task } = this.props;
        this.setState({exporting: true, error: ""});
        const data = this.getExportParams(format);

        if (this.state.epsg === "custom") Storage.setItem("last_export_custom_epsg", data.epsg);
        
        this.exportReq = $.ajax({
                type: 'POST',
                url: `/api/projects/${task.project}/tasks/${task.id}/${this.props.asset}/export`,
                data
            }).done(result => {
                if (result.celery_task_id){
                    Workers.waitForCompletion(result.celery_task_id, error => {
                        if (error) this.setState({exporting: false, error});
                        else{
                            this.setState({exporting: false});
                            Workers.downloadFile(result.celery_task_id, result.filename);
                        }
                    });
                }else if (result.url){
                    // Simple download
                    this.setState({exporting: false});
                    window.location.href = `${result.url}?filename=${result.filename}`;
                }else if (result.error){
                    this.setState({exporting: false, error: result.error});
                }else{
                    this.setState({exporting: false, error: interpolate(_("Invalid JSON response: %(error)s"), {error: JSON.stringify(result)})});
                }
            }).fail(error => {
                this.setState({exporting: false, error: (error.responseJSON || {})[0] || JSON.stringify(error)});
            });
    }
  }

  componentWillUnmount(){
    if (this.exportReq) this.exportReq.abort();
  }

  render(){
    const {epsg, customEpsg, exporting} = this.state;
    const { exportFormats } = this.props;
    const utmEPSG = this.props.task.epsg;

    const disabled = (epsg === "custom" && !customEpsg) || exporting;

    let projection = utmEPSG ? (<div><div className="row form-group form-inline">
    <label className="col-sm-3 control-label">{_("Projection:")}</label>
    <div className="col-sm-9 ">
      <select className="form-control" value={epsg} onChange={this.handleSelectEpsg}>
        {utmEPSG ? <option value={utmEPSG}>UTM (EPSG:{utmEPSG})</option> : ""}
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
  </div>) : "";

    return (<div className="export-asset-panel">
        <ErrorMessage bind={[this, "error"]} />

        {projection}

        <div className="row form-group form-inline">
            <label className="col-sm-3 control-label">{_("Export:")}</label>
            <div className="col-sm-9">
                <div className={"btn-group " + (this.props.dropUp ?  "dropup" : "")}>
                    <button onClick={this.handleExport(exportFormats[0])}
                        disabled={disabled} type="button" className="btn btn-sm btn-primary btn-export">
                        {exporting ? <i className="fa fa-spin fa-circle-notch"/> : <i className={this.efInfo[exportFormats[0]].icon + " fa-fw"}/>} {this.efInfo[exportFormats[0]].label}
                    </button>
                    <button disabled={disabled} type="button" className="btn btn-sm dropdown-toggle btn-primary" data-toggle="dropdown"><span className="caret"></span></button>
                    <ul className="dropdown-menu pull-right">
                    {exportFormats.map(ef => <li key={ef}>
                            <a href="javascript:void(0);" onClick={this.handleExport(ef)}>
                                <i className={this.efInfo[ef].icon + " fa-fw"}></i> {this.efInfo[ef].label}
                            </a>
                        </li>)}
                    </ul>
                </div>
            </div>
        </div>
    </div>);
  }
}
