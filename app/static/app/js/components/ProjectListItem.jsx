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
      updatingTask: false,
      upload: this.getDefaultUploadState()
    };

    this.togglePanel = this.togglePanel.bind(this);
    this.handleUpload = this.handleUpload.bind(this);
    this.closeUploadError = this.closeUploadError.bind(this);
    this.cancelUpload = this.cancelUpload.bind(this);
    this.handleTaskSaved = this.handleTaskSaved.bind(this);
  }

  componentWillUnmount(){
    if (this.updateTaskRequest) this.updateTaskRequest.abort();
  }

  getDefaultUploadState(){
    return {
      uploading: false,
      showEditTask: false,
      error: "",
      progress: 0,
      totalCount: 0,
      totalBytes: 0,
      totalBytesSent: 0,
      savedTaskInfo: false,
      taskId: null
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
        let success = files.length > 0 && files.filter(file => file.status !== "success").length === 0;

        // All files have uploaded!
        if (success){
          this.setUploadState({uploading: false});

          try{
            let response = JSON.parse(files[0].xhr.response);
            if (!response.id) throw new Error(`Expected id field, but none given (${response})`);
            
            let taskId = response.id;
            this.setUploadState({taskId});

            // Update task information (if the user has completed this step)
            if (this.state.upload.savedTaskInfo){
              this.updateTaskInfo(taskId, this.editTaskPanel.getTaskInfo());
            }else{
              // Need to wait for user to confirm task options
            }
          }catch(e){
            this.setUploadState({error: `Invalid response from server: ${e.message}`})
          }

        }else{
          this.setUploadState({
            uploading: false,
            error: "Could not upload all files. An error occured. Please try again."
          });
        }
      })
      .on("reset", () => {
        this.resetUploadState();
      });
  }

  updateTaskInfo(taskId, taskInfo){
    if (!taskId) throw new Error("taskId is not set");
    if (!taskInfo) throw new Error("taskId is not set");
    
    this.setUploadState({showEditTask: false});
    this.setState({updatingTask: true});

    this.updateTaskRequest = 
      $.ajax({
        url: `/api/projects/${this.props.data.id}/tasks/${this.state.upload.taskId}/`,
        contentType: 'application/json',
        data: JSON.stringify({
          name: taskInfo.name,
          options: taskInfo.options,
          processing_node: taskInfo.selectedNode.id
        }),
        dataType: 'json',
        type: 'PATCH'
      }).done(() => {
        if (this.state.showPanel){
          this.projectListItemPanel.refresh();
        }else{
          this.setState({showPanel: true});
        }
      }).fail(() => {
        this.setUploadState({error: "Could not update task information. Plese try again."});
      }).always(() => {
        this.setState({updatingTask: false});
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

  handleTaskSaved(taskInfo){
    this.setUploadState({savedTaskInfo: true});

    // Has the upload finished?
    if (!this.state.upload.uploading && this.state.upload.taskId !== null){
      this.updateTaskInfo(this.state.upload.taskId, taskInfo);
    }
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

          {this.state.showPanel ? <ProjectListItemPanel ref={this.setRef("projectListItemPanel")}/> : ""}

          {this.state.upload.showEditTask ? <UploadProgressBar {...this.state.upload}/> : ""}
          
          {this.state.upload.error !== "" ? 
            <div className="alert alert-warning alert-dismissible">
                <button type="button" className="close" aria-label="Close" onClick={this.closeUploadError}><span aria-hidden="true">&times;</span></button>
                {this.state.upload.error}
            </div>
            : ""}

          {this.state.upload.showEditTask ? 
            <EditTaskPanel 
              uploading={this.state.upload.uploading} 
              onSave={this.handleTaskSaved}
              ref={this.setRef("editTaskPanel")}
            />
          : ""}

          {this.state.updatingTask ? 
            <span>Updating task information... <i className="fa fa-refresh fa-spin fa-fw"></i></span>
          : ""}

        </div>
      </li>
    );
  }
}

export default ProjectListItem;
