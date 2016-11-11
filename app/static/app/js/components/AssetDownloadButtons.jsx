import React from 'react';
import '../css/AssetDownloadButtons.scss';

class AssetDownloadButtons extends React.Component {
    static defaultProps = {
        disabled: false,
        task: null
    }

    static propTypes() {
        return {
            disabled: React.PropTypes.boolean,
            task: React.PropTypes.object.isRequired
        };
    }


    constructor(props){
        super();

        this.downloadAsset = this.downloadAsset.bind(this);
    }

    downloadAsset(type){
        return () => {
            location.href = ``;
        };
    }

    render(){
        return (<div className="asset-download-buttons btn-group">
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
          </ul>
        </div>);
    }
}

export default AssetDownloadButtons;