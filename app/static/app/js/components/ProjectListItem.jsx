import '../css/ProjectListItem.scss';
import React from 'react';
import update from 'react-addons-update';
import ProjectListItemPanel from './ProjectListItemPanel';
import EditTaskPanel from './EditTaskPanel';
import UploadProgressBar from './UploadProgressBar';
import Dropzone from '../vendor/dropzone';
import csrf from '../django/csrf';
import $ from 'jquery';

class ProjectListItem extends React.Component {
  constructor(props){
    super(props);

    this.state = {
      showPanel: false,
      upload: this.getDefaultUploadState(),
      taskId: null
    };

    this.togglePanel = this.togglePanel.bind(this);
    this.handleUpload = this.handleUpload.bind(this);
    this.closeUploadError = this.closeUploadError.bind(this);
    this.cancelUpload = this.cancelUpload.bind(this);
  }

  getDefaultUploadState(){
    return {
      uploading: false,
      showEditTask: false,
      error: "",
      progress: 0,
      totalCount: 0,
      totalBytes: 0,
      totalBytesSent: 0
    };
  }

  resetUploadState(){
    this.setUploadState(this.getDefaultUploadState());
  }

  setUploadState(props){
    this.setState(update(this.state, {
      upload: {
        $merge: props
      }
    }));
  }

  componentDidMount(){
    Dropzone.autoDiscover = false;

    this.dz = new Dropzone(this.dropzone, {
        paramName: "images",
        url : `/api/projects/${this.props.data.id}/tasks/`,
        parallelUploads: 9999999,
        uploadMultiple: true,
        acceptedFiles: "image/*",
        autoProcessQueue: true,
        createImageThumbnails: false,
        clickable: this.uploadButton,
        
        headers: {
          [csrf.header]: csrf.token
        }
    });

    this.dz.on("totaluploadprogress", (progress, totalBytes, totalBytesSent) => {
          this.setUploadState({
            progress, totalBytes, totalBytesSent
          });
      })
      .on("addedfile", () => {
        this.setUploadState({
          totalCount: this.state.upload.totalCount + 1
        });
      })
      .on("processingmultiple", () => {
        this.setUploadState({
          uploading: true,
          showEditTask: true
        })
      })
      .on("completemultiple", (files) => {
        // Check
        let success = files.filter(file => file.status !== "success").length === 0;

        if (success){
          this.setUploadState({uploading: false});
        }else{
          this.setUploadState({
            uploading: false,
            error: "Could not upload all files. An error occured."
          });
        }
      })
      .on("reset", () => {
        this.resetUploadState();
      });
  }

  setRef(prop){
    return (domNode) => {
      if (domNode != null) this[prop] = domNode;
    }
  }

  togglePanel(){
    this.setState({
      showPanel: !this.state.showPanel
    });
  }

  closeUploadError(){
    this.setUploadState({error: ""});
  }

  cancelUpload(e){
    this.dz.removeAllFiles(true);
  }

  handleUpload(){
    this.resetUploadState();
  }

  render() {

    return (
      <li className="project-list-item list-group-item"
         href="javascript:void(0);">
        <div className="row no-margin">
          <div className="btn-group pull-right">
            <button type="button" 
                    className={"btn btn-primary btn-sm " + (this.state.upload.uploading ? "hide" : "")} 
                    onClick={this.handleUpload} 
                    ref={this.setRef("uploadButton")}>
              <i className="glyphicon glyphicon-upload"></i>
              Upload Images
            </button>
              
            <button disabled={this.state.upload.error !== ""} 
                    type="button" 
                    className={"btn btn-primary btn-sm " + (!this.state.upload.uploading ? "hide" : "")} 
                    onClick={this.cancelUpload}>
              <i className="glyphicon glyphicon-remove-circle"></i>
              Cancel Upload
            </button> 

            <button type="button" className="btn btn-default btn-sm">
              <i className="fa fa-globe"></i> Map View
            </button>
            <button type="button" className="btn btn-default btn-sm dropdown-toggle" data-toggle="dropdown">
              <span className="caret"></span>
            </button>
            <ul className="dropdown-menu">
              <li><a href="javascript:alert('TODO!');"><i className="fa fa-cube"></i> 3D View</a></li>
            </ul>
          </div>

          <i style={{width: 14}} className={'fa ' + (this.state.showPanel ? 'fa-caret-down' : 'fa-caret-right')}>
          </i> <a href="javascript:void(0);" onClick={this.togglePanel}>
            {this.props.data.name}
          </a>
        </div>
        <div className="row">
          <div className="dropzone" ref={this.setRef("dropzone")}>
              <div className="dz-default dz-message text-center">
              </div>
          </div>

          {this.state.upload.uploading ? <UploadProgressBar {...this.state.upload}/> : ""}
          
          {this.state.upload.error !== "" ? 
            <div className="alert alert-warning alert-dismissible">
                <button type="button" className="close" aria-label="Close" onClick={this.closeUploadError}><span aria-hidden="true">&times;</span></button>
                {this.state.upload.error}
            </div>
            : ""}

          <EditTaskPanel className={!this.state.upload.showEditTask ? "hide" : ""} />

          {this.state.showPanel ? <ProjectListItemPanel /> : ""}
        </div>
      </li>
    );
  }
}

export default ProjectListItem;
