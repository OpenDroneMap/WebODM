import React from 'react';
import './css/Dashboard.scss';
import ProjectList from './components/ProjectList';
import EditProjectDialog from './components/EditProjectDialog';
import Utils from './classes/Utils';
import {
  BrowserRouter as Router,
  Route
} from 'react-router-dom';
import $ from 'jquery';
import { _ } from './classes/gettext';
import { useState } from 'react/cjs/react.production.min';

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
    if (!project.name) return (new $.Deferred()).reject(_("O campo Nome é obrigatório"));

    return $.ajax({
          url: `/api/projects/`,
          type: 'POST',
          contentType: 'application/json',
          data: JSON.stringify({
            name: project.name,
            description: project.descr,
            tags: project.tags
          })
      }).done(() => {
        this.projectList.refresh();
      });
    }
    
  render() {
    const projectList = ({ location, history }) => {
      let q = Utils.queryParams(location);
      if (q.page === undefined) q.page = 1;
      else q.page = parseInt(q.page);

      return <ProjectList
                source={`/api/projects/${Utils.toSearchQuery(q)}`}
                ref={(domNode) => { this.projectList = domNode; }} 
                currentPage={q.page}
                currentSearch={q.search}
                history={history}
                />;
    };



    return (
      <Router basename="/dashboard">
        <div>
          <div className="text-right add-button">
            <button type="button"
                    className="btn"
                    id="btn-add"
                    onClick={this.handleAddProject}>
              <i className="glyphicon glyphicon-plus"></i>
            </button>
            <button type="button" 
                    id="btn-text"
                    className="btn rounded-corners font-12"
                    onClick={this.handleAddProject}>
              {_("Adicionar Projeto")}
            </button>
          </div>

          <EditProjectDialog 
            saveAction={this.addNewProject}
            ref={(domNode) => { this.projectDialog = domNode; }}
            />
          <Route path="/" component={projectList} />
        </div>
      </Router>
    );
  }
}

$(function(){
    $("[data-dashboard]").each(function(){
        window.ReactDOM.render(<Dashboard/>, $(this).get(0));
    });


    // Warn users if there's any sort of work in progress before
    // they press the back button on the browser
    // Yes it's a hack. No we're not going to track state in React just
    // for this.
    window.onbeforeunload = function() {
        let found = false; 
        $(".progress-bar:visible").each(function(){ 
            try{
                let value = parseFloat($(this).text());
                if (!isNaN(value) && value > 0 && value < 100) found = true;
            }catch(e){
                // Do nothing
            }
        });
        return found ? _("Suas alterações serão perdidas. Tem certeza de que deseja sair?") : undefined; 
    };

    const btn_add_default = 'btn';
    const btn_add_hovering = 'btn hovering';

    const btn_text_default = "btn rounded-corners font-12";
    const btn_text_hovering = "btn rounded-corners font-12 hovering";

    $("#btn-add").each(function (id, el) {
        el.addEventListener('mouseover', () => {
          el.classList = btn_add_hovering;
          $("#btn-text").get(0).classList = btn_text_hovering;
        });
        el.addEventListener('mouseout', () => {
          el.classList = btn_add_default;
          $("#btn-text").get(0).classList = btn_text_default;        
        });
    });
    $("#btn-text").each(function (id, el) {
      el.addEventListener('mouseover', () => {
        el.classList = btn_text_hovering;
        $("#btn-add").get(0).classList = btn_add_hovering;
      });
      el.addEventListener('mouseout', () => {
        el.classList = btn_text_default;
        $("#btn-add").get(0).classList = btn_add_default;        
      });
  });
});

export default Dashboard;
