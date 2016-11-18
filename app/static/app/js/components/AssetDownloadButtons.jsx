import React from 'react';
import '../css/AssetDownloadButtons.scss';
import AssetDownloads from '../classes/AssetDownloads';

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

    downloadAsset(asset){
        return (e) => {
            e.preventDefault();
            location.href = asset.downloadUrl(this.props.task.project, this.props.task.id)
        };
    }

    render(){
        const assetDownloads = AssetDownloads.all();
        let i = 0;

        return (<div className={"asset-download-buttons btn-group " + (this.props.direction === "up" ? "dropup" : "")}>
          <button type="button" className="btn btn-sm btn-primary" disabled={this.props.disabled} data-toggle="dropdown">
            <i className="glyphicon glyphicon-download"></i> Download Assets
          </button>
          <button type="button" className="btn btn-primary btn-sm dropdown-toggle" data-toggle="dropdown" disabled={this.props.disabled}>
                <span className="caret"></span>
          </button>
          <ul className="dropdown-menu">
            {assetDownloads.map(asset => {
                if (!asset.separator){
                    return (<li key={i++}>
                            <a href="javascript:void(0);" onClick={this.downloadAsset(asset)}><i className={asset.icon}></i> {asset.label}</a>
                        </li>);
                }else{
                    return (<li key={i++} className="divider"></li>);
                }
            })}
          </ul>
        </div>);
    }
}

export default AssetDownloadButtons;