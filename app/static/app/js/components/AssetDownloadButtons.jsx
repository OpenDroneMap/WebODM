import React from 'react';
import '../css/AssetDownloadButtons.scss';

class AssetDownloadButtons extends React.Component {
    static defaultProps = {
        disabled: false,
        direction: "down", // or "up"
        task: null
    };

    static propTypes = {
        disabled: React.PropTypes.bool,
        task: React.PropTypes.object.isRequired,
        direction: React.PropTypes.string
    };

    constructor(props){
        super();

        this.downloadAsset = this.downloadAsset.bind(this);
    }

    downloadAsset(type){
        return (e) => {
            e.preventDefault();
            location.href = `/api/projects/${this.props.task.project}/tasks/${this.props.task.id}/download/${type}/`;
        };
    }

    render(){
        return (<div className={"asset-download-buttons btn-group " + (this.props.direction === "up" ? "dropup" : "")}>
          <button type="button" className="btn btn-sm btn-primary" disabled={this.props.disabled} data-toggle="dropdown">
            <i className="glyphicon glyphicon-download"></i> Download Assets
          </button>
          <button type="button" className="btn btn-primary btn-sm dropdown-toggle" data-toggle="dropdown" disabled={this.props.disabled}>
                <span className="caret"></span>
          </button>
          <ul className="dropdown-menu">
            <li><a href="javascript:void(0);" onClick={this.downloadAsset("geotiff")}><i className="fa fa-map-o"></i> GeoTIFF</a></li>
            <li><a href="javascript:void(0);" onClick={this.downloadAsset("las")}><i className="fa fa-cube"></i> LAS</a></li>
            <li><a href="javascript:void(0);" onClick={this.downloadAsset("ply")}><i className="fa fa-cube"></i> PLY</a></li>
            <li><a href="javascript:void(0);" onClick={this.downloadAsset("ply")}><i className="fa fa-cube"></i> CSV</a></li>
            <li className="divider"></li>
            <li><a href="javascript:void(0);" onClick={this.downloadAsset("all")}><i className="fa fa-file-archive-o"></i> All Assets</a></li>
          </ul>
        </div>);
    }
}

export default AssetDownloadButtons;