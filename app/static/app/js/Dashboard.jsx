import React from 'react';
import './css/Dashboard.scss';
import ProjectList from './components/ProjectList';
import EditProjectDialog from './components/EditProjectDialog';
import $ from 'jquery';

class Dashboard extends React.Component {
  constructor(){
    super();
    
    this.handleAddProject = this.handleAddProject.bind(this);
    this.addNewProject = this.addNewProject.bind(this);
  }

  handleAddProject(){
    this.projectDialog.show();
  }

  addNewProject(project){
    if (!project.name) return (new $.Deferred()).reject("Name field is required");

    return $.ajax({
          url: `/api/projects/`,
          type: 'POST',
          data: {
            name: project.name,
            description: project.descr
          }
      }).done(() => {
        this.projectList.refresh();
      });
  }

  render() {
    return (
        <div>
          <div className="text-right add-button">
            <button type="button" 
                    className="btn btn-primary btn-sm"
                    onClick={this.handleAddProject}>
              <i className="glyphicon glyphicon-plus"></i>
              Add Project
            </button>
          </div>

          <EditProjectDialog 
            saveAction={this.addNewProject}
            ref={(domNode) => { this.projectDialog = domNode; }}
            />
          <ProjectList 
            source="/api/projects/?ordering=-created_at&page=1"
            ref={(domNode) => { this.projectList = domNode; }} />
        </div>
    );
  }
}

export default Dashboard;
