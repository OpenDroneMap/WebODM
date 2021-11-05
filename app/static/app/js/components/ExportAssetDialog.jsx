import '../css/ExportAssetDialog.scss';
import React from 'react';
import FormDialog from './FormDialog';
import PropTypes from 'prop-types';
import { _ } from '../classes/gettext';
import ExportAssetPanel from './ExportAssetPanel';

class ExportAssetDialog extends React.Component {
    static defaultProps = {
    };

    static propTypes = {
        onHide: PropTypes.func.isRequired,
        asset: PropTypes.string.isRequired,
        task: PropTypes.object.isRequired,
        exportFormats: PropTypes.arrayOf(PropTypes.string),
        exportParams: PropTypes.object,
        assetLabel: PropTypes.string
    };

    constructor(props){
        super(props);
    }

    handleSave = (cb) => {
        this.exportAssetPanel.handleExport()(cb);
    }
    
    render(){
        return (
            <div className="export-asset-dialog">
                <FormDialog 
                    getFormData={() => {}} 
                    reset={() => {}}
                    show={true}
                    saveIcon="glyphicon glyphicon-download"
                    title={this.props.assetLabel}
                    savingLabel={_("Downloading…")}
                    saveLabel={_("Download")}
                    saveAction={() => {}}
                    handleSaveFunction={this.handleSave}
                    onHide={this.props.onHide}>
                  <ExportAssetPanel asset={this.props.asset} 
                                    task={this.props.task}
                                    ref={(domNode) => { this.exportAssetPanel = domNode; }}
                                    selectorOnly
                                    exportFormats={this.props.exportFormats}
                                    exportParams={this.props.exportParams} />
                </FormDialog>
            </div>
        );
    }
}

export default ExportAssetDialog;