import React from 'react';
import ProjectListItemPanel from './ProjectListItemPanel';

class ProjectListItem extends React.Component {
  constructor(props){
    super(props);

    this.state = {
      showPanel: false
    };

    this.togglePanel = this.togglePanel.bind(this);
  }

  togglePanel(){
    this.setState({
      showPanel: !this.state.showPanel
    });
  }

  render() {
    return (
      <li className="project-list-item list-group-item"
         href="javascript:void(0);">
        <div className="btn-group pull-right">
          <button type="button" className="btn btn-primary btn-sm">
            <i className="glyphicon glyphicon-upload"></i>
            Upload Images
          </button>
          <button type="button" className="btn btn-default btn-sm">
            <i className="fa fa-globe"></i> Map View
          </button>
          <button type="button" className="btn btn-default btn-sm dropdown-toggle" data-toggle="dropdown">
            <span className="caret"></span>
          </button>
          <ul className="dropdown-menu">
            <li><a href="javascript:alert('TODO!');"><i className="fa fa-cube"></i> 3D View</a></li>
          </ul>
        </div>

        <i style={{width: 14}} className={'fa ' + (this.state.showPanel ? 'fa-caret-down' : 'fa-caret-right')}>
        </i> <a href="javascript:void(0);" onClick={this.togglePanel}>
          {this.props.data.name}
        </a>

        {this.state.showPanel ? <ProjectListItemPanel /> : ""}
      </li>
    );
  }
}

export default ProjectListItem;
