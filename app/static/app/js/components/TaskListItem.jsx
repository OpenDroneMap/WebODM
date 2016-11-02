import React from 'react';
import '../css/TaskListItem.scss';
import Console from '../Console';
import statusCodes from '../classes/StatusCodes';

class TaskListItem extends React.Component {
  constructor(props){
    super();

    this.state = {
      expanded: false,
      task: {},
      time: props.data.processing_time
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
    let interval = 3000;

    const refresh = () => {
      // Fetch
      this.refreshRequest = $.getJSON(`/api/projects/${this.state.task.project}/tasks/${this.state.task.id}/`, json => {
        if (json.id){
          let oldStatus = this.state.task.status;

          this.setState({task: json});

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
          if (this.shouldRefresh()) this.refreshTimeout = setTimeout(refresh, interval);
        }
      });
    };

    if (this.shouldRefresh()) this.refreshTimeout = setTimeout(refresh, interval);

    // Load timer if we are in running state
    if (this.state.task.status === statusCodes.RUNNING) this.loadTimer(this.state.task.processing_time);
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
    
    let expanded = "";
    if (this.state.expanded){

      let actionButtons = "";
      actionButtons = (<div>
            <button type="button" className="btn btn-primary btn-sm">
              <i className="glyphicon glyphicon-remove-circle"></i>
              Restart
            </button> <button type="button" className="btn btn-primary btn-sm">
              <i className="glyphicon glyphicon-pencil"></i>
              Edit
            </button> <button type="button" className="btn btn-danger btn-sm">
              <i className="glyphicon glyphicon-trash"></i>
              Delete
            </button>
          </div>);

      expanded = (
        <div className="expanded-panel">
          <div className="row">
            <div className="col-md-4 no-padding">
              <div className="labels">
                <strong>Created at: </strong> {(new Date(this.state.task.created_at)).toLocaleString()}<br/>
              </div>
              <div className="labels">
                <strong>Status: </strong> {statusCodes.description(this.state.task.status) || "Preprocessing"}<br/>
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
      let descr = statusCodes.description(this.state.task.status);
      if (descr === "") descr = "Preprocessing";
      statusLabel = getStatusLabel(descr, this.state.task.status == 40 ? "done" : "");
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
