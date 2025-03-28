import React from 'react';
import ReactDOM from 'ReactDOM';
import '../css/AssetDownloadButtons.scss';
import AssetDownloads from '../classes/AssetDownloads';
import PropTypes from 'prop-types';
import ExportAssetDialog from './ExportAssetDialog';
import { _ } from '../classes/gettext';

class AssetDownloadButtons extends React.Component {
    static defaultProps = {
        disabled: false,
        direction: "down", // or "up",
        buttonClass: "btn-primary",
        task: null,
        showLabel: true,
        hideItems: [],
        modalContainer: null
    };

    static propTypes = {
        disabled: PropTypes.bool,
        task: PropTypes.object.isRequired,
        direction: PropTypes.string,
        buttonClass: PropTypes.string,
        showLabel: PropTypes.bool,
        onModalOpen: PropTypes.func,
        onModalClose: PropTypes.func,
        hideItems: PropTypes.array,
        modalContainer: PropTypes.object
    };

    constructor(props){
        super();

        this.state = {
            exportDialogProps: null
        }
    }

    onHide = () => {
        this.setState({exportDialogProps: null});
        if (this.props.onModalClose) this.props.onModalClose();
    }

    componentDidUpdate(prevProps, prevState){
        // Do we need to render the export dialog to a specific dom node
        // (rather then inline?)
        if (this.props.modalContainer && prevState.exportDialogProps !== this.state.exportDialogProps){
            ReactDOM.render(this.getAssetDialog(), this.props.modalContainer);
        }
    }

    getAssetDialog = () => {
        let assetDialog = "";
        
        if (this.state.exportDialogProps){
            assetDialog = (<ExportAssetDialog task={this.props.task}
                    asset={this.state.exportDialogProps.asset}
                    exportFormats={this.state.exportDialogProps.exportFormats}  
                    exportParams={this.state.exportDialogProps.exportParams}
                    onHide={this.onHide}
                    assetLabel={this.state.exportDialogProps.assetLabel}
            />);
        }

        return assetDialog;
    }

    render(){
        const assetDownloads = AssetDownloads.only(this.props.task.available_assets);
        
        return (<div className={"asset-download-buttons " + (this.props.showLabel ? "btn-group" : "") + " " + (this.props.direction === "up" ? "dropup" : "")}>
          
          {this.state.exportDialogProps && !this.props.modalContainer ? 
           this.getAssetDialog()
          : ""}

          <button type="button" className={"btn btn-sm " + this.props.buttonClass} disabled={this.props.disabled} data-toggle="dropdown">
            <i className="glyphicon glyphicon-download"></i><span className="hidden-xs hidden-sm">{this.props.showLabel ? " " + _("Download Assets") : ""}</span>
          </button>
          {this.props.showLabel ? 
          <button type="button" className={"btn btn-sm dropdown-toggle " + this.props.buttonClass} data-toggle="dropdown" disabled={this.props.disabled}>
                <span className="caret"></span>
          </button> : ""}
          <ul className="dropdown-menu">
            {assetDownloads.filter(asset => {
                return this.props.hideItems.indexOf(asset.asset) === -1;
            }).map((asset, i) => {
                if (asset.separator){
                    return (<li key={i} className="divider"></li>);
                }else{
                    let onClick = undefined;
                    if (asset.exportFormats){
                        onClick = e => {
                            e.preventDefault();
                            this.setState({exportDialogProps: {
                                asset: asset.exportId(),
                                exportFormats: asset.exportFormats,
                                exportParams: asset.exportParams,
                                assetLabel: asset.label
                            }});
                            if (this.props.onModalOpen) this.props.onModalOpen();
                        }
                    }
                    return (<li key={i}>
                            <a href={asset.downloadUrl(this.props.task.project, this.props.task.id)} onClick={onClick}><i className={asset.icon + " fa-fw"}></i> {asset.label}</a>
                        </li>);
                }
            })}
            {this.props.hideItems.indexOf("backup.zip") === -1 ? <li>
                <a href={`/api/projects/${this.props.task.project}/tasks/${this.props.task.id}/backup`}><i className="fa fa-file-download fa-fw"></i> {_("Backup")}</a>
            </li> : ""}
          </ul>
        </div>);
    }
}

export default AssetDownloadButtons;