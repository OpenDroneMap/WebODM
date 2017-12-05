import '../css/ProjectListItem.scss';
import React from 'react';
import update from 'immutability-helper';
import TaskList from './TaskList';
import NewTaskPanel from './NewTaskPanel';
import UploadProgressBar from './UploadProgressBar';
import ProgressBar from './ProgressBar';
import ErrorMessage from './ErrorMessage';
import EditProjectDialog from './EditProjectDialog';
import Dropzone from '../vendor/dropzone';
import csrf from '../django/csrf';
import HistoryNav from '../classes/HistoryNav';
import PropTypes from 'prop-types';
import $ from 'jquery';

class ProjectListItem extends React.Component {
  static propTypes = {
      history: PropTypes.object.isRequired,
      data: PropTypes.object.isRequired, // project json
      onDelete: PropTypes.func
  }

  constructor(props){
    super(props);

    this.historyNav = new HistoryNav(props.history);

    this.state = {
      showTaskList: this.historyNav.isValueInQSList("project_task_open", props.data.id),
      upload: this.getDefaultUploadState(),
      error: "",
      data: props.data,
      refreshing: false
    };

    this.toggleTaskList = this.toggleTaskList.bind(this);
    this.handleUpload = this.handleUpload.bind(this);
    this.closeUploadError = this.closeUploadError.bind(this);
    this.cancelUpload = this.cancelUpload.bind(this);
    this.handleTaskSaved = this.handleTaskSaved.bind(this);
    this.viewMap = this.viewMap.bind(this);
    this.handleDelete = this.handleDelete.bind(this);
    this.handleEditProject = this.handleEditProject.bind(this);
    this.updateProject = this.updateProject.bind(this);
    this.taskDeleted = this.taskDeleted.bind(this);
    this.hasPermission = this.hasPermission.bind(this);
  }

  refresh(){
    // Update project information based on server
    this.setState({refreshing: true});

    this.refreshRequest = 
      $.getJSON(`/api/projects/${this.state.data.id}/`)
        .done((json) => {
          this.setState({data: json});
        })
        .fail((_, __, e) => {
          this.setState({error: e.message});
        })
        .always(() => {
          this.setState({refreshing: false});
        });
  }

  componentWillUnmount(){
    if (this.deleteProjectRequest) this.deleteProjectRequest.abort();
    if (this.refreshRequest) this.refreshRequest.abort();
  }

  getDefaultUploadState(){
    return {
      uploading: false,
      editing: false,
      resizing: false,
      resizedImages: 0,
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

  hasPermission(perm){
    return this.state.data.permissions.indexOf(perm) !== -1;
  }

  componentDidMount(){
    Dropzone.autoDiscover = false;

    if (this.hasPermission("add")){
      this.dz = new Dropzone(this.dropzone, {
          paramName: "images",
          url : `/api/projects/${this.state.data.id}/tasks/`,
          parallelUploads: 2147483647,
          uploadMultiple: true,
          acceptedFiles: "image/*, .txt",
          autoProcessQueue: false,
          createImageThumbnails: false,
          clickable: this.uploadButton,
          chunkSize: 2147483647,
          timeout: 2147483647,
          
          headers: {
            [csrf.header]: csrf.token
          }
      });

      this.dz.on("totaluploadprogress", (progress, totalBytes, totalBytesSent) => {
          this.setUploadState({
            progress, totalBytes, totalBytesSent
          });
        })
        .on("addedfiles", files => {
          this.setUploadState({
            editing: true,
            totalCount: files.length
          });
        })
        .on("transformcompleted", (total) => {
          this.setUploadState({resizedImages: total});
        })
        .on("transformend", () => {
          this.setUploadState({resizing: false, uploading: true});
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
              
              if (this.state.showTaskList){
                this.taskList.refresh();
              }else{
                this.setState({showTaskList: true});
              }
              this.resetUploadState();
              this.refresh();
            }catch(e){
              this.setUploadState({error: `Invalid response from server: ${e.message}`, uploading: false})
            }
          }else{
            this.setUploadState({
              uploading: false,
              error: "Could not upload all files. An error occurred. Please try again."
            });
          }
        })
        .on("reset", () => {
          this.resetUploadState();
        })
        .on("dragenter", () => {
          if (!this.state.upload.uploading && !this.state.upload.resizing){
            this.resetUploadState();
          }
        })
        .on("sending", (file, xhr, formData) => {
          const taskInfo = this.dz._taskInfo;

          if (!formData.has("name")) formData.append("name", taskInfo.name);
          if (!formData.has("options")) formData.append("options", JSON.stringify(taskInfo.options));
          if (!formData.has("processing_node")) formData.append("processing_node", taskInfo.selectedNode.id);
          if (!formData.has("auto_processing_node")) formData.append("auto_processing_node", taskInfo.selectedNode.key == "auto");
        });
    }
  }

  setRef(prop){
    return (domNode) => {
      if (domNode != null) this[prop] = domNode;
    }
  }

  toggleTaskList(){
    const showTaskList = !this.state.showTaskList;

    this.historyNav.toggleQSListItem("project_task_open", this.state.data.id, showTaskList);
    
    this.setState({
      showTaskList: showTaskList
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

  taskDeleted(){
    this.refresh();
  }

  handleDelete(){
    return $.ajax({
          url: `/api/projects/${this.state.data.id}/`,
          type: 'DELETE'
        }).done(() => {
          if (this.props.onDelete) this.props.onDelete(this.state.data.id);
        });
  }

  handleTaskSaved(taskInfo){
    this.dz._taskInfo = taskInfo; // Allow us to access the task info from dz

    // Update dropzone settings
    if (taskInfo.resizeTo !== null){
      this.dz.options.resizeWidth = taskInfo.resizeTo;
      this.dz.options.resizeQuality = 1.0;

      this.setUploadState({resizing: true, editing: false});
    }else{
      this.setUploadState({uploading: true, editing: false});
    }

    this.dz.processQueue();
  }

  handleEditProject(){
    this.editProjectDialog.show();
  }

  updateProject(project){
    return $.ajax({
        url: `/api/projects/${this.state.data.id}/`,
        contentType: 'application/json',
        data: JSON.stringify({
          name: project.name,
          description: project.descr,
        }),
        dataType: 'json',
        type: 'PATCH'
      }).done(() => {
        this.refresh();
      });
  }

  viewMap(){
    location.href = `/map/project/${this.state.data.id}/`;
  }

  render() {
    const { refreshing, data } = this.state;
    const numTasks = data.tasks.length;

    return (
      <li className={"project-list-item list-group-item " + (refreshing ? "refreshing" : "")}
         href="javascript:void(0);"
         ref={this.setRef("dropzone")}
         >

        <EditProjectDialog 
          ref={(domNode) => { this.editProjectDialog = domNode; }}
          title="Edit Project"
          saveLabel="Save Changes"
          savingLabel="Saving changes..."
          saveIcon="fa fa-edit"
          projectName={data.name}
          projectDescr={data.description}
          saveAction={this.updateProject}
          deleteAction={this.hasPermission("delete") ? this.handleDelete : undefined}
        />

        <div className="row no-margin">
          <ErrorMessage bind={[this, 'error']} />
          <div className="btn-group pull-right">
            {this.hasPermission("add") ? 
              <button type="button" 
                      className={"btn btn-primary btn-sm " + (this.state.upload.uploading ? "hide" : "")} 
                      onClick={this.handleUpload} 
                      ref={this.setRef("uploadButton")}>
                <i className="glyphicon glyphicon-upload"></i>
                Upload Images and GCP
              </button>
            : ""}
              
            <button disabled={this.state.upload.error !== ""} 
                    type="button" 
                    className={"btn btn-primary btn-sm " + (!this.state.upload.uploading ? "hide" : "")} 
                    onClick={this.cancelUpload}>
              <i className="glyphicon glyphicon-remove-circle"></i>
              Cancel Upload
            </button> 

            <button type="button" className="btn btn-default btn-sm" onClick={this.viewMap}>
              <i className="fa fa-globe"></i> View Map
            </button>
          </div>

          <span className="project-name">
            {data.name}
          </span>
          <div className="project-description">
            {data.description}
          </div>
          <div className="row project-links">
            {numTasks > 0 ? 
              <span>
                <i className='fa fa-tasks'>
                </i> <a href="javascript:void(0);" onClick={this.toggleTaskList}>
                  {numTasks} Tasks <i className={'fa fa-caret-' + (this.state.showTaskList ? 'down' : 'right')}></i>
                </a>
              </span>
              : ""}

            <i className='fa fa-edit'>
            </i> <a href="javascript:void(0);" onClick={this.handleEditProject}> Edit
            </a>
          </div>
        </div>
        <i className="drag-drop-icon fa fa-inbox"></i>
        <div className="row">
          {this.state.upload.uploading ? <UploadProgressBar {...this.state.upload}/> : ""}
          {this.state.upload.resizing ? 
            <ProgressBar
              current={this.state.upload.resizedImages}
              total={this.state.upload.totalCount}
              template={(info) => `Resized ${info.current} of ${info.total} images. Your browser might slow down during this process.`}
            /> 
          : ""}

          {this.state.upload.uploading || this.state.upload.resizing ? 
            <i className="fa fa-refresh fa-spin fa-fw" />
            : ""}
          
          {this.state.upload.error !== "" ? 
            <div className="alert alert-warning alert-dismissible">
                <button type="button" className="close" aria-label="Close" onClick={this.closeUploadError}><span aria-hidden="true">&times;</span></button>
                {this.state.upload.error}
            </div>
            : ""}

          {this.state.upload.editing ? 
            <NewTaskPanel
              onSave={this.handleTaskSaved}
              filesCount={this.state.upload.totalCount}
              showResize={true}
            />
          : ""}

          {this.state.showTaskList ? 
            <TaskList 
                ref={this.setRef("taskList")} 
                source={`/api/projects/${data.id}/tasks/?ordering=-created_at`}
                onDelete={this.taskDeleted}
                history={this.props.history}
            /> : ""}

        </div>
      </li>
    );
  }
}

export default ProjectListItem;
