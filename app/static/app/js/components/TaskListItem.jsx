import React from 'react';
import '../css/TaskListItem.scss';
import Console from '../Console';
import statusCodes from '../classes/StatusCodes';
import pendingActions from '../classes/PendingActions';
import ErrorMessage from './ErrorMessage';
import EditTaskPanel from './EditTaskPanel';
import AssetDownloadButtons from './AssetDownloadButtons';
import HistoryNav from '../classes/HistoryNav';
import PropTypes from 'prop-types';

class TaskListItem extends React.Component {
  static propTypes = {
      history: PropTypes.object.isRequired,
      data: PropTypes.object.isRequired, // task json
      refreshInterval: PropTypes.number, // how often to refresh info
      onDelete: PropTypes.func
  }

  constructor(props){
    super();

    this.historyNav = new HistoryNav(props.history);

    this.state = {
      expanded: this.historyNav.isValueInQSList("project_task_expanded", props.data.id),
      task: {},
      time: props.data.processing_time,
      actionError: "",
      actionButtonsDisabled: false,
      editing: false,
      memoryError: false
    }

    for (let k in props.data){
      this.state.task[k] = props.data[k];
    }

    this.toggleExpanded = this.toggleExpanded.bind(this);
    this.consoleOutputUrl = this.consoleOutputUrl.bind(this);
    this.stopEditing = this.stopEditing.bind(this);
    this.startEditing = this.startEditing.bind(this);
    this.checkForMemoryError = this.checkForMemoryError.bind(this);
    this.downloadTaskOutput = this.downloadTaskOutput.bind(this);
    this.handleEditTaskSave = this.handleEditTaskSave.bind(this);
  }

  shouldRefresh(){
    if (this.state.task.pending_action !== null) return true;

    // If a task is completed, or failed, etc. we don't expect it to change
    if ([statusCodes.COMPLETED, statusCodes.FAILED, statusCodes.CANCELED].indexOf(this.state.task.status) !== -1) return false;

    return (([statusCodes.QUEUED, statusCodes.RUNNING, null].indexOf(this.state.task.status) !== -1 && this.state.task.processing_node) ||
            (!this.state.task.uuid && this.state.task.processing_node && !this.state.task.last_error));
  }

  loadTimer(startTime){
    if (!this.processingTimeInterval){
      this.setState({time: startTime});

      this.processingTimeInterval = setInterval(() => {
        this.setState({time: this.state.time += 1000});
      }, 1000);
    }
  }

  unloadTimer(){
    if (this.processingTimeInterval) clearInterval(this.processingTimeInterval);
    if (this.state.task.processing_time) this.setState({time: this.state.task.processing_time});
  }

  componentDidMount(){
    if (this.shouldRefresh()) this.refreshTimeout = setTimeout(() => this.refresh(), this.props.refreshInterval || 3000);

    // Load timer if we are in running state
    if (this.state.task.status === statusCodes.RUNNING) this.loadTimer(this.state.task.processing_time);
  }

  refresh(){
    // Fetch
    this.refreshRequest = $.getJSON(`/api/projects/${this.state.task.project}/tasks/${this.state.task.id}/`, json => {
      if (json.id){
        let oldStatus = this.state.task.status;

        this.setState({task: json, actionButtonsDisabled: false});

        // Update timer if we switched to running
        if (oldStatus !== this.state.task.status){
          if (this.state.task.status === statusCodes.RUNNING){
            if (this.console) this.console.clear();
            this.loadTimer(this.state.task.processing_time);
          }else{
            this.setState({time: this.state.task.processing_time});
            this.unloadTimer();
          }

          if (this.state.task.status !== statusCodes.FAILED){
            this.setState({memoryError: false});
          }
        }
      }else{
        console.warn("Cannot refresh task: " + json);
      }
      
      this.setAutoRefresh();
    })
    .fail(( _, __, errorThrown) => {
      if (errorThrown === "Not Found"){ // Don't translate this one
        // Assume this has been deleted
        if (this.props.onDelete) this.props.onDelete(this.state.task.id);
      }else{
        this.setAutoRefresh();
      }
    });
  }

  setAutoRefresh(){
    if (this.shouldRefresh()) this.refreshTimeout = setTimeout(() => this.refresh(), this.props.refreshInterval || 3000);
  }

  componentWillUnmount(){
    this.unloadTimer();
    if (this.refreshRequest) this.refreshRequest.abort();
    if (this.refreshTimeout) clearTimeout(this.refreshTimeout);
  }

  toggleExpanded(){
    const expanded = !this.state.expanded;

    this.historyNav.toggleQSListItem("project_task_expanded", this.props.data.id, expanded);
    
    this.setState({
      expanded: expanded
    });
  }

  consoleOutputUrl(line){
    return `/api/projects/${this.state.task.project}/tasks/${this.state.task.id}/output/?line=${line}`;
  }

  hoursMinutesSecs(t){
    if (t === 0 || t === -1) return "-- : -- : --";

    let ch = 60 * 60 * 1000,
          cm = 60 * 1000,
          h = Math.floor(t / ch),
          m = Math.floor( (t - h * ch) / cm),
          s = Math.round( (t - h * ch - m * cm) / 1000),
          pad = function(n){ return n < 10 ? '0' + n : n; };
    if( s === 60 ){
      m++;
      s = 0;
    }
    if( m === 60 ){
      h++;
      m = 0;
    }
    return [pad(h), pad(m), pad(s)].join(':');
  }

  genActionApiCall(action, options = {}){
    return () => {
      const doAction = () => {
        this.setState({actionButtonsDisabled: true});

        let url = `/api/projects/${this.state.task.project}/tasks/${this.state.task.id}/${action}/`;
        $.post(url,
          {
            uuid: this.state.task.uuid
          }
        ).done(json => {
            if (json.success){
              this.refresh();
              if (options.success !== undefined) options.success();
            }else{
              this.setState({
                actionError: json.error || options.defaultError || "Cannot complete operation.",
                actionButtonsDisabled: false
              });
            }
        })
        .fail(() => {
            this.setState({
              actionError: options.defaultError || "Cannot complete operation.",
              actionButtonsDisabled: false
            });
        });
      }

      if (options.confirm){
        if (window.confirm(options.confirm)){
          doAction();
        }
      }else{
        doAction();
      }
    };
  }

  downloadTaskOutput(){
    this.console.downloadTxt("task_output.txt");
  }

  optionsToList(options){
    if (!Array.isArray(options)) return "";
    else if (options.length === 0) return "Default";
    else {
      return options.map(opt => `${opt.name}: ${opt.value}`).join(", ");
    }
  }

  startEditing(){
    this.setState({expanded: true, editing: true});
  }

  stopEditing(){
    this.setState({editing: false});
  }

  checkForMemoryError(lines){
    for (let line of lines){
      if (line.indexOf("Killed") !== -1 || 
          line.indexOf("MemoryError") !== -1 || 
          line.indexOf("std::bad_alloc") !== -1 ||
          line.indexOf("Child returned 137") !== -1){
        this.setState({memoryError: true});
      }
    }
  }

  isMacOS(){
    return window.navigator.platform === "MacIntel";
  }

  handleEditTaskSave(task){
    this.setState({task, editing: false});
    this.setAutoRefresh();
  }

  render() {
    const task = this.state.task;
    const name = task.name !== null ? task.name : `Task #${task.id}`;

    let status = statusCodes.description(task.status);
    if (status === "") status = "Uploading images";

    if (!task.processing_node) status = "";
    if (task.pending_action !== null) status = pendingActions.description(task.pending_action);

    let expanded = "";
    if (this.state.expanded){
      let showOrthophotoMissingWarning = false,
          showMemoryErrorWarning = this.state.memoryError && task.status == statusCodes.FAILED,
          showExitedWithCodeOneHints = task.last_error === "Process exited with code 1" && !showMemoryErrorWarning && task.status == statusCodes.FAILED,
          memoryErrorLink = this.isMacOS() ? "http://stackoverflow.com/a/39720010" : "https://docs.docker.com/docker-for-windows/#advanced";
      
      let actionButtons = [];
      const addActionButton = (label, className, icon, onClick) => {
        actionButtons.push({
          className, icon, label, onClick
        });
      };
      
      if (task.status === statusCodes.COMPLETED){
        if (task.available_assets.indexOf("orthophoto.tif") !== -1){
          addActionButton(" View Map", "btn-primary", "fa fa-globe", () => {
            location.href = `/map/project/${task.project}/task/${task.id}/`;
          });
        }else{
          showOrthophotoMissingWarning = true;
        }
        
        addActionButton(" View 3D Model", "btn-primary", "fa fa-cube", () => {
          location.href = `/3d/project/${task.project}/task/${task.id}/`;
        });
      }

      // Ability to change options
      if ([statusCodes.FAILED, statusCodes.COMPLETED, statusCodes.CANCELED].indexOf(task.status) !== -1 ||
          (!task.processing_node)){
        addActionButton("Edit", "btn-primary pull-right edit-button", "glyphicon glyphicon-pencil", () => {
          this.startEditing();
        });
      }

      if ([statusCodes.QUEUED, statusCodes.RUNNING, null].indexOf(task.status) !== -1 &&
          task.processing_node){
        addActionButton("Cancel", "btn-primary", "glyphicon glyphicon-remove-circle", this.genActionApiCall("cancel", {defaultError: "Cannot cancel task."}));
      }

      if ([statusCodes.FAILED, statusCodes.COMPLETED, statusCodes.CANCELED].indexOf(task.status) !== -1 &&
            task.processing_node){
          addActionButton("Restart", "btn-primary", "glyphicon glyphicon-remove-circle", this.genActionApiCall("restart", {
              success: () => {
                  if (this.console) this.console.clear();
                  this.setState({time: -1});
              },
              defaultError: "Cannot restart task."
            }
          ));
      }

      addActionButton("Delete", "btn-danger", "glyphicon glyphicon-trash", this.genActionApiCall("remove", {
        confirm: "All information related to this task, including images, maps and models will be deleted. Continue?",
        defaultError: "Cannot delete task."
      }));

      const disabled = this.state.actionButtonsDisabled || !!task.pending_action;

      actionButtons = (<div className="action-buttons">
            {task.status === statusCodes.COMPLETED ? 
              <AssetDownloadButtons task={this.state.task} disabled={disabled} />
            : ""}
            {actionButtons.map(button => {
              return (
                  <button key={button.label} type="button" className={"btn btn-sm " + button.className} onClick={button.onClick} disabled={disabled}>
                    <i className={button.icon}></i>
                    {button.label}
                  </button> 
                )
            })}
          </div>);

      expanded = (
        <div className="expanded-panel">
          <div className="row">
            <div className="col-md-4 no-padding">
              <div className="labels">
                <strong>Created on: </strong> {(new Date(task.created_at)).toLocaleString()}<br/>
              </div>
              {status ? <div className="labels">
                  <strong>Status: </strong> {status}<br/>
                </div>
              : ""}
              {Array.isArray(task.options) ?
                 <div className="labels">
                  <strong>Options: </strong> {this.optionsToList(task.options)}<br/>
                </div>
              : ""}
              {/* TODO: List of images? */}

              {showOrthophotoMissingWarning ? 
              <div className="task-warning"><i className="fa fa-warning"></i> <span>An orthophoto could not be generated. To generate one, make sure GPS information is embedded in the EXIF tags of your images, or use a Ground Control Points (GCP) file.</span></div> : ""}

            </div>
            <div className="col-md-8">
              <Console 
                source={this.consoleOutputUrl} 
                refreshInterval={this.shouldRefresh() ? 3000 : undefined} 
                autoscroll={true}
                height={200} 
                ref={domNode => this.console = domNode}
                onAddLines={this.checkForMemoryError}
                />

              {showMemoryErrorWarning ? 
              <div className="task-warning"><i className="fa fa-support"></i> <span>It looks like your processing node ran out of memory. If you are using docker, make sure that your docker environment has <a href={memoryErrorLink} target="_blank">enough RAM allocated</a>. Alternatively, make sure you have enough physical RAM, reduce the number of images, make your images smaller, or tweak the task's <a href="javascript:void(0);" onClick={this.startEditing}>options</a>.</span></div> : ""}
            
              {showExitedWithCodeOneHints ?
              <div className="task-warning"><i className="fa fa-info-circle"></i> <div className="inline">
                  "Process exited with code 1" means that part of the processing failed. Try tweaking the <a href="javascript:void(0);" onClick={this.startEditing}>Task Options</a> as follows:
                  <ul>
                    <li>Increase the <b>min-num-features</b> option, especially if your images have lots of vegetation</li>
                    <li>Enable the <b>use-pmvs</b> option.</li>
                  </ul>
                  Still not working? Upload your images somewhere like <a href="https://www.dropbox.com/" target="_blank">Dropbox</a> or <a href="https://drive.google.com/drive/u/0/" target="_blank">Google Drive</a> and <a href="http://community.opendronemap.org/c/webodm" target="_blank">open a topic</a> on our community forum, making 
                  sure to include a <a href="javascript:void(0);" onClick={this.downloadTaskOutput}>copy of your task's output</a> (the one you see above <i className="fa fa-arrow-up"></i>, click to <a href="javascript:void(0);" onClick={this.downloadTaskOutput}>download</a> it). Our awesome contributors will try to help you! <i className="fa fa-smile-o"></i>
                </div>
              </div>
              : ""}
            </div>
          </div>
          <div className="row">
            <ErrorMessage bind={[this, 'actionError']} />
            {actionButtons}
          </div>
        </div>
      );

      // If we're editing, the expanded view becomes the edit panel
      if (this.state.editing){
        expanded = <div className="task-list-item">
          <div className="row no-padding">
            <EditTaskPanel
              task={this.state.task}
              onSave={this.handleEditTaskSave}
              onCancel={this.stopEditing}
            />
          </div>
        </div>;
      }
    }

    const getStatusLabel = (text, classes = "") => {
      return (<div className={"status-label " + classes} title={text}>{text}</div>);
    }

    let statusLabel = "";
    let statusIcon = statusCodes.icon(task.status);
    let showEditLink = false;

    if (task.last_error){
      statusLabel = getStatusLabel(task.last_error, "error");
    }else if (!task.processing_node){
      statusLabel = getStatusLabel("Set a processing node");
      statusIcon = "fa fa-hourglass-3";
      showEditLink = true;
    }else{
      statusLabel = getStatusLabel(status, task.status == 40 ? "done" : "");
    }

    return (
      <div className="task-list-item">
        <div className="row">
          <div className="col-md-5 name">
            <i onClick={this.toggleExpanded} className={"clickable fa " + (this.state.expanded ? "fa-minus-square-o" : " fa-plus-square-o")}></i> <a href="javascript:void(0);" onClick={this.toggleExpanded}>{name}</a>
          </div>
          <div className="col-md-1 details">
            <i className="fa fa-image"></i> {task.images_count}
          </div> 
          <div className="col-md-2 details">
            <i className="fa fa-clock-o"></i> {this.hoursMinutesSecs(this.state.time)}
          </div>
          <div className="col-md-3">
            {showEditLink ? 
              <a href="javascript:void(0);" onClick={this.startEditing}>{statusLabel}</a>
              : statusLabel}
          </div>
          <div className="col-md-1 text-right">
            <div className="status-icon">
              <i className={statusIcon}></i>
            </div>
          </div>
        </div>
        {expanded}
      </div>
    );
  }
}

export default TaskListItem;
