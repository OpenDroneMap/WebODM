import '../css/ProjectListItem.scss';
import React from 'react';
import update from 'immutability-helper';
import TaskList from './TaskList';
import EditTaskPanel from './EditTaskPanel';
import UploadProgressBar from './UploadProgressBar';
import ErrorMessage from './ErrorMessage';
import EditProjectDialog from './EditProjectDialog';
import Dropzone from '../vendor/dropzone';
import csrf from '../django/csrf';
import HistoryNav from '../classes/HistoryNav';
import $ from 'jquery';

class ProjectListItem extends React.Component {
  constructor(props){
    super(props);

    this.historyNav = new HistoryNav(props.history);

    this.state = {
      showTaskList: this.historyNav.isValueInQSList("project_task_open", props.data.id),
      updatingTask: false,
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
    if (this.updateTaskRequest) this.updateTaskRequest.abort();
    if (this.deleteProjectRequest) this.deleteProjectRequest.abort();
    if (this.refreshRequest) this.refreshRequest.abort();
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

  hasPermission(perm){
    return this.state.data.permissions.indexOf(perm) !== -1;
  }

  componentDidMount(){
    Dropzone.autoDiscover = false;

    if (this.hasPermission("add")){
      this.dz = new Dropzone(this.dropzone, {
          paramName: "images",
          url : `/api/projects/${this.state.data.id}/tasks/`,
          parallelUploads: 9999999,
          uploadMultiple: true,
          acceptedFiles: "image/*, .txt",
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
        })
        .on("dragenter", () => {
          this.resetUploadState();
        })
        .on("sending", (file, xhr, formData) => {
          if (!formData.has("auto_processing_node")){
            formData.append('auto_processing_node', "false");
          }
        });
    }
  }

  updateTaskInfo(taskId, taskInfo){
    if (!taskId) throw new Error("taskId is not set");
    if (!taskInfo) throw new Error("taskId is not set");
    
    this.setUploadState({showEditTask: false});
    this.setState({updatingTask: true});

    this.updateTaskRequest = 
      $.ajax({
        url: `/api/projects/${this.state.data.id}/tasks/${this.state.upload.taskId}/`,
        contentType: 'application/json',
        data: JSON.stringify({
          name: taskInfo.name,
          options: taskInfo.options,
          processing_node: taskInfo.selectedNode.id,
          auto_processing_node: taskInfo.selectedNode.key == "auto"
        }),
        dataType: 'json',
        type: 'PATCH'
      }).done((json) => {
        if (this.state.showTaskList){
          this.taskList.refresh();
        }else{
          this.setState({showTaskList: true});
        }
        this.refresh();
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
    this.setUploadState({savedTaskInfo: true});

    // Has the upload finished?
    if (!this.state.upload.uploading && this.state.upload.taskId !== null){
      this.updateTaskInfo(this.state.upload.taskId, taskInfo);
    }
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
