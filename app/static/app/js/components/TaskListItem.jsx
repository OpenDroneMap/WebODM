import React from 'react';
import '../css/TaskListItem.scss';
import Console from '../Console';

class TaskListItem extends React.Component {
  constructor(){
    super();

    this.state = {
      expanded: false
    }

    this.toggleExpanded = this.toggleExpanded.bind(this);
  }

  componentDidMount(){
  }

  toggleExpanded(){
    this.setState({
      expanded: !this.state.expanded
    });
  }

  render() {
    let name = this.props.data.name !== null ? this.props.data.name : `Task #${this.props.data.id}`;
    
    let expanded = "";
    if (this.state.expanded){
      expanded = (
          <div className="row expanded-panel">
            <div className="labels">
              <strong>Status: </strong> Running<br/>
            </div>

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
        );
    }

    return (
      <div className="task-list-item">
        <div className="row">
          <div className="col-md-5 name">
            <i onClick={this.toggleExpanded} className={"clickable fa " + (this.state.expanded ? "fa-minus-square-o" : " fa-plus-square-o")}></i> <a href="javascript:void(0);" onClick={this.toggleExpanded}>{name}</a>
          </div>
          <div className="col-md-6 details">
            <i className="fa fa-clock-o"></i> 00:00:00
            <i className="fa fa-image"></i> {this.props.data.images_count}
          </div> 
          <div className="col-md-1 details text-right">
            <i className="fa fa-gear fa-spin fa-fw"></i>
          </div>
        </div>
        {expanded}
      </div>
    );
  }
}

export default TaskListItem;
