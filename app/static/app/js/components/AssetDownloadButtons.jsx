import React from 'react';
import '../css/AssetDownloadButtons.scss';
import AssetDownloads from '../classes/AssetDownloads';
import PropTypes from 'prop-types';
import { _ } from '../classes/gettext';

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

        return (<div className={"asset-download-buttons " + (this.props.showLabel ? "btn-group" : "") + " " + (this.props.direction === "up" ? "dropup" : "")}>
          <button type="button" className={"btn btn-sm " + this.props.buttonClass} disabled={this.props.disabled} data-toggle="dropdown">
            <i className="glyphicon glyphicon-download"></i>{this.props.showLabel ? " " + _("Download Assets") : ""}
          </button>
          {this.props.showLabel ? 
          <button type="button" className={"btn btn-sm dropdown-toggle " + this.props.buttonClass} data-toggle="dropdown" disabled={this.props.disabled}>
                <span className="caret"></span>
          </button> : ""}
          <ul className="dropdown-menu">
            {assetDownloads.map((asset, i) => {
                if (!asset.separator){
                    return (<li key={i}>
                            <a href={asset.downloadUrl(this.props.task.project, this.props.task.id)}><i className={asset.icon + " fa-fw"}></i> {asset.label}</a>
                        </li>);
                }else{
                    return (<li key={i} className="divider"></li>);
                }
            })}
          </ul>
        </div>);
    }
}

export default AssetDownloadButtons;