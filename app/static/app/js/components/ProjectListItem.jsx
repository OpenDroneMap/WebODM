import '../css/ProjectListItem.scss';
import React from 'react';
import update from 'immutability-helper';
import TaskList from './TaskList';
import NewTaskPanel from './NewTaskPanel';
import ImportTaskPanel from './ImportTaskPanel';
import UploadProgressBar from './UploadProgressBar';
import ErrorMessage from './ErrorMessage';
import EditProjectDialog from './EditProjectDialog';
import Dropzone from '../vendor/dropzone';
import csrf from '../django/csrf';
import HistoryNav from '../classes/HistoryNav';
import PropTypes from 'prop-types';
import ResizeModes from '../classes/ResizeModes';
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
      refreshing: false,
      importing: false,
      buttons: []
    };

    this.toggleTaskList = this.toggleTaskList.bind(this);
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
      error: "",
      progress: 0,
      files: [],
      totalCount: 0,
      uploadedCount: 0,
      totalBytes: 0,
      totalBytesSent: 0,
      lastUpdated: 0
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
          url : 'TO_BE_CHANGED',
          parallelUploads: 6,
          uploadMultiple: false,
          acceptedFiles: "image/*,text/*",
          autoProcessQueue: false,
          createImageThumbnails: false,
          clickable: this.uploadButton,
          chunkSize: 2147483647,
          timeout: 2147483647,
          
          headers: {
            [csrf.header]: csrf.token
          }
      });

      this.dz.on("addedfiles", files => {
          let totalBytes = 0;
          for (let i = 0; i < files.length; i++){
              totalBytes += files[i].size;
              files[i].deltaBytesSent = 0;
              files[i].trackedBytesSent = 0;
              files[i].retries = 0;
          }

          this.setUploadState({
            editing: true,
            totalCount: this.state.upload.totalCount + files.length,
            files,
            totalBytes: this.state.upload.totalBytes + totalBytes
          });
        })
        .on("uploadprogress", (file, progress, bytesSent) => {
            const now = new Date().getTime();

            if (bytesSent > file.size) bytesSent = file.size;
            
            if (progress === 100 || now - this.state.upload.lastUpdated > 500){
                const deltaBytesSent = bytesSent - file.deltaBytesSent;
                file.trackedBytesSent += deltaBytesSent;

                const totalBytesSent = this.state.upload.totalBytesSent + deltaBytesSent;
                const progress = totalBytesSent / this.state.upload.totalBytes * 100;

                this.setUploadState({
                    progress,
                    totalBytesSent,
                    lastUpdated: now
                });

                file.deltaBytesSent = bytesSent;
            }
        })
        .on("complete", (file) => {
            // Retry
            const retry = () => {
                const MAX_RETRIES = 10;

                if (file.retries < MAX_RETRIES){
                    // Update progress
                    const totalBytesSent = this.state.upload.totalBytesSent - file.trackedBytesSent;
                    const progress = totalBytesSent / this.state.upload.totalBytes * 100;
        
                    this.setUploadState({
                        progress,
                        totalBytesSent,
                    });
        
                    file.status = Dropzone.QUEUED;
                    file.deltaBytesSent = 0;
                    file.trackedBytesSent = 0;
                    file.retries++;
                    this.dz.processQueue();
                }else{
                    throw new Error(`Cannot upload ${file.name}, exceeded max retries (${MAX_RETRIES})`);
                }
            };

            try{
                if (file.status === "error"){
                    retry();
                }else{
                    // Check response
                    let response = JSON.parse(file.xhr.response);
                    if (response.success){
                        // Update progress by removing the tracked progress and 
                        // use the file size as the true number of bytes
                        let totalBytesSent = this.state.upload.totalBytesSent + file.size;
                        if (file.trackedBytesSent) totalBytesSent -= file.trackedBytesSent;
        
                        const progress = totalBytesSent / this.state.upload.totalBytes * 100;
        
                        this.setUploadState({
                            progress,
                            totalBytesSent,
                            uploadedCount: this.state.upload.uploadedCount + 1
                        });

                        this.dz.processQueue();
                    }else{
                        retry();
                    }
                }
            }catch(e){
                this.setUploadState({error: `${e.message}`, uploading: false});
                this.dz.cancelUpload();
            }
        })
        .on("queuecomplete", () => {
            const remainingFilesCount = this.state.upload.totalCount - this.state.upload.uploadedCount;
            if (remainingFilesCount === 0){
                // All files have uploaded!
                this.setUploadState({uploading: false});

                $.ajax({
                    url: `/api/projects/${this.state.data.id}/tasks/${this.dz._taskInfo.id}/commit/`,
                    contentType: 'application/json',
                    dataType: 'json',
                    type: 'POST'
                  }).done((task) => {
                    if (task && task.id){
                        this.newTaskAdded();
                    }else{
                        this.setUploadState({error: `Cannot create new task. Invalid response from server: ${JSON.stringify(task)}`});
                    }
                  }).fail(() => {
                    this.setUploadState({error: "Cannot create new task. Please try again later."});
                  });
            }else if (this.dz.getQueuedFiles() === 0){
                // Done but didn't upload all?
                this.setUploadState({
                    totalCount: this.state.upload.totalCount - remainingFilesCount,
                    uploading: false,
                    error: `${remainingFilesCount} files cannot be uploaded. As a reminder, only images (.jpg, .tif, .png) and GCP files (.txt) can be uploaded. Try again.`
                });
            }
        })
        .on("reset", () => {
          this.resetUploadState();
        })
        .on("dragenter", () => {
          if (!this.state.upload.editing){
            this.resetUploadState();
          }
        });
    }
    
    PluginsAPI.Dashboard.triggerAddNewTaskButton({projectId: this.state.data.id, onNewTaskAdded: this.newTaskAdded}, (button) => {
        if (!button) return;
        this.setState(update(this.state, {
            buttons: {$push: [button]}
        }));
    });
  }

  newTaskAdded = () => {
    this.setState({importing: false});
    
    if (this.state.showTaskList){
      this.taskList.refresh();
    }else{
      this.setState({showTaskList: true});
    }
    this.resetUploadState();
    this.refresh();
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

    this.setUploadState({uploading: true, editing: false});

    // Create task
    const formData = {
        name: taskInfo.name,
        options: taskInfo.options,
        processing_node:  taskInfo.selectedNode.id,
        auto_processing_node: taskInfo.selectedNode.key == "auto",
        partial: true
    };

    if (taskInfo.resizeMode === ResizeModes.YES){
        formData.resize_to = taskInfo.resizeSize;
    }

    $.ajax({
        url: `/api/projects/${this.state.data.id}/tasks/`,
        contentType: 'application/json',
        data: JSON.stringify(formData),
        dataType: 'json',
        type: 'POST'
      }).done((task) => {
        if (task && task.id){
            this.dz._taskInfo.id = task.id;
            this.dz.options.url = `/api/projects/${this.state.data.id}/tasks/${task.id}/upload/`;
            this.dz.processQueue();
        }else{
            this.setState({error: `Cannot create new task. Invalid response from server: ${JSON.stringify(task)}`});
            this.handleTaskCanceled();
        }
      }).fail(() => {
        this.setState({error: "Cannot create new task. Please try again later."});
        this.handleTaskCanceled();
      });
  }

  handleTaskCanceled = () => {
    this.dz.removeAllFiles(true);
    this.resetUploadState();
  }

  handleUpload = () => {
    // Not a second click for adding more files?
    if (!this.state.upload.editing){
      this.handleTaskCanceled();
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

  handleImportTask = () => {
    this.setState({importing: true});
  }

  handleCancelImportTask = () => {
    this.setState({importing: false});
  }

  render() {
    const { refreshing, data } = this.state;
    const numTasks = data.tasks.length;

    return (
      <div className={"project-list-item project-card" + (refreshing ? "refreshing" : "")} ref={this.setRef("dropzone")} >

        <div className="d-flex flex-row">
          <div className="flex-grow-1 d-flex flex-row">
            <div className="project-info">
              <div className="project-name">{data.name}</div>
              { data.description && <div className="project-description">{data.description}</div> }
            </div>
            <div className="action-section ml-3">
              <button type="button" class="edit-project-btn btn btn-link btn-sm" onClick={this.handleEditProject}>
              <i className='far fa-edit'></i>&nbsp;Edit
              </button>
            </div>
          </div>
          { this.renderActionButtons }
        </div>

        <hr/>

        <EditProjectDialog 
          ref={(domNode) => { this.editProjectDialog = domNode; }}
          title="Edit Project"
          saveLabel="Save Changes"
          savingLabel="Saving changes..."
          saveIcon="far fa-edit"
          projectName={data.name}
          projectDescr={data.description}
          saveAction={this.updateProject}
          deleteAction={this.hasPermission("delete") ? this.handleDelete : undefined}
        />

        <div className="row no-margin">
          <ErrorMessage bind={[this, 'error']} />
          

          <div className="row project-links">
              <div className="task-toggle d-flex flex-row align-items-center">
                <i className='fa fa-tasks'></i> 
                <div onClick={this.toggleTaskList}>
                 <span>Tasks ({numTasks})</span>&nbsp;<i className={'fa fa-caret-' + (this.state.showTaskList ? 'down' : 'right')}></i>
                </div>
              </div>
          </div>
        </div>
        <i className="drag-drop-icon fa fa-inbox"></i>
        <div className="row">
          {this.state.upload.uploading ? <UploadProgressBar {...this.state.upload}/> : ""}
          
          {
            this.state.upload.error !== "" &&
            <div className="alert alert-warning alert-dismissible">
                <button type="button" className="close flat" aria-label="Close" onClick={this.closeUploadError}><span aria-hidden="true">&times;</span></button>
                {this.state.upload.error}
            </div>
          }

          {this.state.upload.editing ? 
            <NewTaskPanel
              onSave={this.handleTaskSaved}
              onCancel={this.handleTaskCanceled}
              filesCount={this.state.upload.totalCount}
              showResize={true}
              getFiles={() => this.state.upload.files }
            />
          : ""}

          {this.state.importing ? 
            <ImportTaskPanel
              onImported={this.newTaskAdded}
              onCancel={this.handleCancelImportTask}
              projectId={this.state.data.id}
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
      </div>
    );
  }

  get renderActionButtons() {
    return (
      <div className="action-btn-container d-flex flex-row align-items-center">
        {
          this.hasPermission("add") &&
          <div className="add-btn-group">
              <button ref={this.setRef("uploadButton")} onClick={this.handleUpload} type="button" className="btn btn-sm db-btn primary rounded">
                  <i className="fas fa-arrow-circle-up"></i>&nbsp;Select Images and GCP
              </button>

              <button onClick={this.handleImportTask} type="button" className="btn btn-sm db-btn primary rounded outlined ml-2">
                  <i className="fas fa-download"></i>&nbsp;Import
              </button>
              {this.state.buttons.map((button, i) => <React.Fragment key={i}>{button}</React.Fragment>)}
          </div>
        }
  
        {
          this.state.upload.uploading && 
          <button
            onClick={this.cancelUpload}
            disabled={this.state.upload.error !== ""}
            type="button"
            className={"btn btn-sm db-btn rounded btn-danger ml-2 "}>
            Cancel
          </button>
        }

        <button onClick={this.viewMap} type="button" className="btn btn-sm db-btn primary rounded outlined ml-2">
            <i className="fas fa-map-marked-alt"></i>&nbsp;View Map
        </button>
        
      </div>
    )
  }
}

export default ProjectListItem;
