import React from 'react';
import '../css/TaskListItem.scss';
import Console from '../Console';
import statusCodes from '../classes/StatusCodes';
import pendingActions from '../classes/PendingActions';
import ErrorMessage from './ErrorMessage';

class TaskListItem extends React.Component {
  constructor(props){
    super();

    this.state = {
      expanded: false,
      task: {},
      time: props.data.processing_time,
      actionError: "",
      actionButtonsDisabled: false
    }

    for (let k in props.data){
      this.state.task[k] = props.data[k];
    }

    this.toggleExpanded = this.toggleExpanded.bind(this);
    this.consoleOutputUrl = this.consoleOutputUrl.bind(this);
  }

  shouldRefresh(){
    // If a task is completed, or failed, etc. we don't expect it to change
    return (this.state.task.status === statusCodes.QUEUED || 
            this.state.task.status === statusCodes.RUNNING ||
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
            this.loadTimer(this.state.task.processing_time);
          }else{
            this.setState({time: this.state.task.processing_time});
            this.unloadTimer();
          }
        }
      }else{
        console.warn("Cannot refresh task: " + json);
      }
    })
    .always((_, textStatus) => {
      if (textStatus !== "abort"){
        if (this.shouldRefresh()) this.refreshTimeout = setTimeout(() => this.refresh(), this.props.refreshInterval || 3000);
      }
    });
  }

  componentWillUnmount(){
    this.unloadTimer();
    if (this.refreshTimeout) clearTimeout(this.refreshTimeout);
    if (this.refreshRequest) this.refreshRequest.abort();
  }

  toggleExpanded(){
    this.setState({
      expanded: !this.state.expanded
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

  render() {
    let name = this.state.task.name !== null ? this.state.task.name : `Task #${this.state.task.id}`;
    
    let status = statusCodes.description(this.state.task.status);
    if (status === "") status = "Uploading images";
    if (this.state.task.pending_action !== null) status = pendingActions.description(this.state.task.pending_action);

    let expanded = "";
    if (this.state.expanded){
      let actionButtons = [];
      const addActionButton = (label, className, icon, onClick) => {
        actionButtons.push({
          className, icon, label, onClick
        });
      };
      const genActionApiCall = (action) => {
        return () => {
          this.setState({actionButtonsDisabled: true});

          $.post(`/api/projects/${this.state.task.project}/tasks/${this.state.task.id}/${action}/`,
            {
              uuid: this.state.task.uuid
            }
          ).done(json => {
              if (json.success){
                this.refresh();
              }else{
                this.setState({
                  actionError: json.error,
                  actionButtonsDisabled: false
                });
              }
          })
          .fail(() => {
              this.setState({
                error: url + " is unreachable.",
                actionButtonsDisabled: false
              });
          });
        };
      };

      
      if ([statusCodes.QUEUED, statusCodes.RUNNING, null].indexOf(this.state.task.status) !== -1){
        addActionButton("Cancel", "btn-primary", "glyphicon glyphicon-remove-circle", genActionApiCall("cancel"));
      }

      // addActionButton("Restart", "btn-primary", "glyphicon glyphicon-play", genActionApiCall("cancel"));

      // addActionButton("Edit", "btn-primary", "glyphicon glyphicon-pencil", () => {
      //   console.log("edit call");
      // });

      // addActionButton("Delete", "btn-danger", "glyphicon glyphicon-trash", () => {
      //   console.log("Delete call");
      // });

      actionButtons = (<div className="action-buttons">
            {actionButtons.map(button => {
              return (
                  <button key={button.label} type="button" className={"btn btn-sm " + button.className} onClick={button.onClick} disabled={this.state.actionButtonsDisabled || !!this.state.task.pending_action}>
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
                <strong>Created on: </strong> {(new Date(this.state.task.created_at)).toLocaleString()}<br/>
              </div>
              <div className="labels">
                <strong>Status: </strong> {status}<br/>
              </div>
              {/* TODO: List of images? */}
            </div>
            <div className="col-md-8">
              <Console 
                source={this.consoleOutputUrl} 
                refreshInterval={this.shouldRefresh() ? 3000 : undefined} 
                autoscroll={true}
                height={200} />
            </div>
          </div>
          <div className="row">
            <ErrorMessage message={this.state.actionError} />
            {actionButtons}
          </div>
        </div>
      );
    }

    const getStatusLabel = (text, classes = "") => {
      return (<div className={"status-label " + classes} title={text}>{text}</div>);
    }

    let statusLabel = "";
    let statusIcon = statusCodes.icon(this.state.task.status);

    if (this.state.task.last_error){
      statusLabel = getStatusLabel(this.state.task.last_error, "error");
    }else if (!this.state.task.processing_node){
      statusLabel = getStatusLabel("Processing node not set");
      statusIcon = "fa fa-hourglass-3";
    }else{
      statusLabel = getStatusLabel(status, this.state.task.status == 40 ? "done" : "");
    }

    return (
      <div className="task-list-item">
        <div className="row">
          <div className="col-md-5 name">
            <i onClick={this.toggleExpanded} className={"clickable fa " + (this.state.expanded ? "fa-minus-square-o" : " fa-plus-square-o")}></i> <a href="javascript:void(0);" onClick={this.toggleExpanded}>{name}</a>
          </div>
          <div className="col-md-1 details">
            <i className="fa fa-image"></i> {this.state.task.images_count}
          </div> 
          <div className="col-md-2 details">
            <i className="fa fa-clock-o"></i> {this.hoursMinutesSecs(this.state.time)}
          </div>
          <div className="col-md-3">
            {statusLabel}
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
