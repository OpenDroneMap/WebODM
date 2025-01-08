import React from 'react';
import '../css/AssetDownloadButtons.scss';
import AssetDownloads from '../classes/AssetDownloads';
import PropTypes from 'prop-types';
import ExportAssetDialog from './ExportAssetDialog';
import { _ } from '../classes/gettext';

class AssetDownloadButtons extends React.Component {
    static defaultProps = {
        disabled: false,
        direction: "up", // or "up",
        buttonClass: "", // cortando a cor primaria
        task: null,
        showLabel: true
    };

    static propTypes = {
        disabled: PropTypes.bool,
        task: PropTypes.object.isRequired,
        direction: PropTypes.string,
        buttonClass: PropTypes.string,
        showLabel: PropTypes.bool,
        onModalOpen: PropTypes.func,
        onModalClose: PropTypes.func
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

    render(){
        const assetDownloads = AssetDownloads.only(this.props.task.available_assets);

        return (
        <div className={"asset-download-buttons " + (this.props.showLabel ? "btn-group" : "") + " " + (this.props.direction === "up" ? "dropup" : "")}>
          
          {this.state.exportDialogProps ? 
            <ExportAssetDialog task={this.props.task}
                               asset={this.state.exportDialogProps.asset}
                               exportFormats={this.state.exportDialogProps.exportFormats}  
                               exportParams={this.state.exportDialogProps.exportParams}
                               onHide={this.onHide}
                               assetLabel={this.state.exportDialogProps.assetLabel}
            /> 
            : ""}

                <button
                type="button"
                className={"" + this.props.buttonClass}
                disabled={this.props.disabled}
                data-toggle="dropdown"
                style={{ display: "flex", alignItems: "center" ,borderRadius:'10px'}} // Centraliza verticalmente
                    >
                    <i className="glyphicon glyphicon-download-alt" style={{ fontSize: "1em" }}></i>
                    {this.props.showLabel ? (
                        <>
                        {" " + _("Baixar recursos")}
                        {/* Divisor vertical */}
                        <span
                            style={{
                            margin: "0 5px",
                            borderLeft: "1px solid #ccc",
                            height: "20px",
                            }}
                        ></span>
                        </>
                    ) : null}
                    <span
                        className="glyphicon glyphicon-chevron-up"
                        style={{
                        fontSize: "1em", // Aumenta o tamanho da caret
                        // marginLeft: "10px", // Espaçamento entre a caret e o divisor
                        }}
                    ></span>
                </button>

          {/* {this.props.showLabel ? 
          <button type="button" className={"dropdown-toggle " + this.props.buttonClass} data-toggle="dropdown" disabled={this.props.disabled}>
                
          </button> : ""} */}
          <ul className="dropdown-menu">
            {assetDownloads.map((asset, i) => {
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
          </ul>
        </div>);
    }
}

export default AssetDownloadButtons;