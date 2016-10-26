import React from 'react';

class ProjectListItemPanel extends React.Component {
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
      <div className="project-list-item-panel">
        TODO
      </div>
    );
  }
}

export default ProjectListItemPanel;
