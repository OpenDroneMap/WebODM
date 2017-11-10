import React from 'react';
import '../css/TaskList.scss';
import TaskListItem from './TaskListItem';
import PropTypes from 'prop-types';

class TaskList extends React.Component {
  static propTypes = {
      history: PropTypes.object.isRequired,
      source: PropTypes.string.isRequired, // URL where to load task list
      onDelete: PropTypes.func
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
              error: `Could not load task list: ${textStatus}`,
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

  render() {
    let message = "";
    if (this.state.loading){
      message = (<span>Loading... <i className="fa fa-refresh fa-spin fa-fw"></i></span>);
    }else if (this.state.error){
      message = (<span>Error: {this.state.error}. <a href="javascript:void(0);" onClick={this.retry}>Try again</a></span>);
    }else if (this.state.tasks.length === 0){
      message = (<span>This project has no tasks. Create one by uploading some images!</span>);
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
            history={this.props.history} />
        ))}
      </div>
    );
  }
}

export default TaskList;
