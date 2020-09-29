import React from 'react';
import '../css/AssetDownloadButtons.scss';
import AssetDownloads from '../classes/AssetDownloads';
import PropTypes from 'prop-types';

class AssetDownloadButtons extends React.Component {
    static defaultProps = {
        disabled: false,
        direction: "down", // or "up",
        buttonClass: "btn-primary",
        task: null,
        showLabel: true
    };

    static propTypes = {
        disabled: PropTypes.bool,
        task: PropTypes.object.isRequired,
        direction: PropTypes.string,
        buttonClass: PropTypes.string,
        showLabel: PropTypes.bool
    };

    constructor(props){
        super();
    }

    render(){
        const assetDownloads = AssetDownloads.only(this.props.task.available_assets);

        return (<div className={"asset-download-buttons " + (this.props.showLabel ? "btn-group small" : "") + " " + (this.props.direction === "up" ? "dropup" : "")}>
          <button type="button" className={"btn btn-sm btn-info " + this.props.buttonClass} disabled={this.props.disabled} data-toggle="dropdown">
            <i className="fas fa-download"></i>{this.props.showLabel ? " Download Assets" : ""}
          </button>
          {this.props.showLabel ? 
          <button type="button" className={"btn btn-info db-btn btn-sm dropdown-toggle " + this.props.buttonClass} data-toggle="dropdown" disabled={this.props.disabled}>
                <span className="caret"></span>
          </button> : ""}
          <div className="dropdown-menu db-dropdown-menu">
            {assetDownloads.map((asset, i) => {
                if (!asset.separator){
                    return (<div className="dropdown-item" key={i}>
                            <a href={asset.downloadUrl(this.props.task.project, this.props.task.id)}><i className={asset.icon + " fa-fw"}></i> {asset.label}</a>
                        </div>)
                }else{
                    return (<div key={i} className="divider"></div>)
                }
            })}
          </div>
        </div>);
    }
}

export default AssetDownloadButtons;