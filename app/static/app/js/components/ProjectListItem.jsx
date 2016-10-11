import React from 'react';
import ProjectListItemPanel from './ProjectListItemPanel';

class ProjectListItem extends React.Component {
  constructor(){
    super();
    this.state = {
      collapsed: true
    };

    this.handleClick = this.handleClick.bind(this);
  }

  handleClick(){
    this.state.collapsed = !this.state.collapsed;
  }

  render() {
    return (
      <div onClick={this.handleClick}>
        {this.props.data.name} {this.props.data.created_at}

        {this.props.collapsed ? "" : <ProjectListItemPanel />}
      </div>
    );
  }
}

export default ProjectListItem;
