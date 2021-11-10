import React from 'react';
import '../css/TaskList.scss';
import TaskListItem from './TaskListItem';
import PropTypes from 'prop-types';
import $ from 'jquery';
import { _, interpolate } from '../classes/gettext';

class TaskList extends React.Component {
  static propTypes = {
      history: PropTypes.object.isRequired,
      source: PropTypes.string.isRequired, // URL where to load task list
      onDelete: PropTypes.func,
      onTaskMoved: PropTypes.func,
      hasPermission: PropTypes.func.isRequired
  }

  constructor(props){
    super(props);

    this.state = {
      tasks: [],
      error: "",
      loading: true
    };

    this.refresh = this.refresh.bind(this);
    this.retry = this.retry.bind(this);
    this.deleteTask = this.deleteTask.bind(this);
  }

  componentDidMount(){
    this.loadTaskList(); 
  }

  refresh(){
    this.loadTaskList();
  }

  retry(){
    this.setState({error: "", loading: true});
    this.refresh();
  }

  loadTaskList(){
    this.taskListRequest = 
      $.getJSON(this.props.source, json => {
          this.setState({
              tasks: json
          });
        })
        .fail((jqXHR, textStatus, errorThrown) => {
          this.setState({ 
              error: interpolate(_("Could not load task list: %(error)s"), { error: textStatus} ),
          });
        })
        .always(() => {
          this.setState({
            loading: false
          })
        });
  }

  componentWillUnmount(){
    this.taskListRequest.abort();
  }

  deleteTask(id){
    this.setState({
      tasks: this.state.tasks.filter(t => t.id !== id)
    });
    if (this.props.onDelete) this.props.onDelete(id);
  }

  moveTask = (task) => {
    this.refresh();
    if (this.props.onTaskMoved) this.props.onTaskMoved(task);
  }

  render() {
    let message = "";
    if (this.state.loading){
      message = (<span>{_("Loading...")} <i className="fa fa-sync fa-spin fa-fw"></i></span>);
    }else if (this.state.error){
      message = (<span>{interpolate(_("Error: %(error)s"), {error: this.state.error})} <a href="javascript:void(0);" onClick={this.retry}>{_("Try again")}</a></span>);
    }else if (this.state.tasks.length === 0){
      message = (<span></span>);
    }

    return (
      <div className="task-list">
        {message}

        {this.state.tasks.map(task => (
          <TaskListItem 
            data={task} 
            key={task.id} 
            refreshInterval={3000} 
            onDelete={this.deleteTask}
            onMove={this.moveTask}
            onDuplicate={this.refresh}
            hasPermission={this.props.hasPermission}
            history={this.props.history} />
        ))}
      </div>
    );
  }
}

export default TaskList;
