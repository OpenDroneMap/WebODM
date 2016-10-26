import React from 'react';
import '../css/TaskList.scss';

class TaskList extends React.Component {
  constructor(){
    super();
  }

  componentDidMount(){
    console.log("DISPLAY");
  }

  refresh(){
    console.log("REFRESH");
  }

  render() {
    return (
      <div className="task-list">
        <span>Updating task list... <i className="fa fa-refresh fa-spin fa-fw"></i></span>
      </div>
    );
  }
}

export default TaskList;
