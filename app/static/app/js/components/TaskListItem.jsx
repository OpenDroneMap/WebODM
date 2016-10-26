import React from 'react';
import '../css/TaskListItem.scss';

class TaskListItem extends React.Component {
  constructor(){
    super();
  }

  componentDidMount(){
  }

  render() {
    return (
      <div className="task-list-item">
        {this.props.name}
      </div>
    );
  }
}

export default TaskList;
