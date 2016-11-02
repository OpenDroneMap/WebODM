import React from 'react';
import '../css/TaskListItem.scss';
import Console from '../Console';
import statusCodes from '../classes/StatusCodes';

class TaskListItem extends React.Component {
  constructor(){
    super();

    this.state = {
      expanded: false
    }

    this.toggleExpanded = this.toggleExpanded.bind(this);
    this.consoleOutputUrl = this.consoleOutputUrl.bind(this);
  }

  componentDidMount(){

  }

  toggleExpanded(){
    this.setState({
      expanded: !this.state.expanded
    });
  }

  consoleOutputUrl(line){
    return `/api/projects/${this.props.data.project}/tasks/${this.props.data.id}/?output_only=true&line=${line}`;
  }

  render() {
    let name = this.props.data.name !== null ? this.props.data.name : `Task #${this.props.data.id}`;
    
    let expanded = "";
    if (this.state.expanded){
      expanded = (
        <div className="expanded-panel">
          <div className="row">
            <div className="col-md-4 no-padding">
              <div className="labels">
                <strong>Status: </strong> {statusCodes.description(this.props.data.status)}<br/>
              </div>
            </div>
            <div className="col-md-8">
              <Console 
                source={this.consoleOutputUrl} 
                refreshInterval={3000} 
                autoscroll={true}
                height={200} />
            </div>
          </div>
          <div className="row">
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
          </div>
        </div>
      );
    }

    let statusLabel = "";
    if (this.props.data.last_error){
      statusLabel = (<div className="status-label error" title={this.props.data.last_error}>{this.props.data.last_error}</div>);
    }else{
      statusLabel = (<div className={"status-label " + (this.props.data.status == 40 ? "done" : "")} title={statusCodes.description(this.props.data.status)}>{statusCodes.description(this.props.data.status)}</div>);
    }

    return (
      <div className="task-list-item">
        <div className="row">
          <div className="col-md-5 name">
            <i onClick={this.toggleExpanded} className={"clickable fa " + (this.state.expanded ? "fa-minus-square-o" : " fa-plus-square-o")}></i> <a href="javascript:void(0);" onClick={this.toggleExpanded}>{name}</a>
          </div>
          <div className="col-md-3 details">
            <i className="fa fa-clock-o"></i> 00:00:00
            <i className="fa fa-image"></i> {this.props.data.images_count}
          </div> 
          <div className="col-md-3">
            {statusLabel}
          </div>
          <div className="col-md-1 text-right">
            <i className={statusCodes.icon(this.props.data.status)}></i>
          </div>
        </div>
        {expanded}
      </div>
    );
  }
}

export default TaskListItem;
