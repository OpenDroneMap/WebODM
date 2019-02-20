import '../css/ImportTaskPanel.scss';
import React from 'react';
import PropTypes from 'prop-types';
import Dropzone from '../vendor/dropzone';
import csrf from '../django/csrf';

class ImportTaskPanel extends React.Component {
  static defaultProps = {
  };

  static propTypes = {
      // onSave: PropTypes.func.isRequired,
      onCancel: PropTypes.func,
      projectId: PropTypes.number.isRequired
  };

  constructor(props){
    super(props);

    this.state = {
    };
  }

  componentDidMount(){
    Dropzone.autoDiscover = false;

    this.dz = new Dropzone(this.dropzone, {
        paramName: "file",
        url : `/api/projects/${this.props.projectId}/tasks/import`,
        parallelUploads: 1,
        uploadMultiple: false,
        acceptedFiles: "application/zip",
        autoProcessQueue: true,
        createImageThumbnails: false,
        previewTemplate: '<div style="display:none"></div>',
        clickable: this.uploadButton,
        chunkSize: 2147483647,
        timeout: 2147483647,
        
        headers: {
          [csrf.header]: csrf.token
        }
    });

    this.dz.on("error", function(file){
        // Show 
      })
      .on("uploadprogress", function(file, progress){
          console.log(progress);
      })
      .on("complete", function(file){
          if (file.status === "success"){
          }else{
            // error
          }
      });
  }

  cancel = (e) => {
    this.props.onCancel();
  }

  setRef = (prop) => {
    return (domNode) => {
      if (domNode != null) this[prop] = domNode;
    }
  }

  render() {
    return (
      <div ref={this.setRef("dropzone")} className="import-task-panel theme-background-highlight">
        <div className="form-horizontal">
          <button type="button" className="close theme-color-primary" aria-label="Close" onClick={this.cancel}><span aria-hidden="true">&times;</span></button>
          <h4>Import Existing Assets</h4>
          <p>You can import .zip files that have been exported from existing tasks via Download Assets <i className="glyphicon glyphicon-arrow-right"></i> All Assets.</p>
          <button type="button" 
                  className="btn btn-primary"
                  onClick={this.handleUpload}
                  ref={this.setRef("uploadButton")}>
            <i className="glyphicon glyphicon-upload"></i>
            Upload a File
          </button>
          <button type="button" 
                  className="btn btn-primary"
                  onClick={this.handleImportFromUrl}
                  ref={this.setRef("importFromUrlButton")}>
            <i className="glyphicon glyphicon-cloud-download"></i>
            Import From URL
          </button>
        </div>
      </div>
    );
  }
}

export default ImportTaskPanel;
