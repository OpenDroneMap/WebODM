import React from 'react';
import '../css/TaskList.scss';
import TaskListItem from './TaskListItem';

class TaskList extends React.Component {
  constructor(){
    super();

    this.state = {
      tasks: [],
      error: "",
      loading: true
    };

    this.refresh = this.refresh.bind(this);
  }

  componentDidMount(){
    this.loadTaskList(); 
  }

  refresh(){
    this.loadTaskList();
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
              error: `Could not load projects list: ${textStatus}`,
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

  render() {
    return (
      <div className="task-list">
        {this.state.loading ? 
          <span>Loading... <i className="fa fa-refresh fa-spin fa-fw"></i></span>
        : ""}
        {this.state.error ? 
          <span>Could not get tasks: {this.state.error}. <a href="javascript:void(0);" onClick={this.refresh}>Try again</a></span>
        : ""}

        {this.state.tasks.map(task => (
          <TaskListItem data={task} key={task.id} />
        ))}
      </div>
    );
  }
}

export default TaskList;
