import React from 'react';
import '../css/TaskList.scss';

class TaskList extends React.Component {
  constructor(){
    super();

    this.state = {
      tasks: []
    };
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
                if (json.results){
                    this.setState({
                        projects: json.results,
                        loading: false
                    });
                }else{
                    this.setState({ 
                        error: `Invalid JSON response: ${JSON.stringify(json)}`,
                        loading: false
                    });
                }
            })
            .fail((jqXHR, textStatus, errorThrown) => {
                this.setState({ 
                    error: `Could not load projects list: ${textStatus}`,
                    loading: false
                });
            });
  }

  componentWillUnmount(){
    this.taskListRequest.abort();
  }

  render() {
    return (
      <div className="task-list">
        <span>Loading... <i className="fa fa-refresh fa-spin fa-fw"></i></span>
      </div>
    );
  }
}

export default TaskList;
