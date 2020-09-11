import React from 'react'
import './css/Dashboard.scss'
import ProjectList from './components/ProjectList'
import Utils from './classes/Utils'
import EditProjectDialog from './components/EditProjectDialog';
import {
  BrowserRouter as Router,
  Route
} from 'react-router-dom'
import $ from 'jquery'


class Dashboard extends React.Component {

	refProjectDialog = null

	constructor() {
		super();
		this.state = {
			page: 1
		}
	}

	handleAddProject() {
		if (this.refProjectDialog instanceof EditProjectDialog) {
			this.refProjectDialog.show()
		}
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

	/** -------------- Events -------------- */

	render() {
		const projectList = ({ location, history }) => {
			let q = Utils.queryParams(location)
			let page = parseInt(q.page !== undefined ? q.page : 1)

			return <ProjectList
						source={`/api/projects/?ordering=-created_at&page=${page}`}
						ref={(domNode) => { this.projectList = domNode; }} 
						currentPage={page}
						history={history}
					/>
		};

		return (
		<Router basename="/dashboard">
			<div className="dashboard-content-container">
				{ this.renderControl }
				<EditProjectDialog 
					saveAction={p => this.addNewProject(p)}
					ref={(domNode) => { this.refProjectDialog = domNode; }}
				/>
				<Route path="/" component={projectList} />
			</div>
		</Router>
		);
	}

	/** ------------------ View ------------------- */

	get renderControl() {
		return (
			<div className="w100 action-controller mb-3">
				<div className="d-flex flex-row justify-content-between">
					<div className="all-project align-items-center d-flex">
						All Projects
					</div>
					<div className="action-container">
						<button className="btn primary rounded outlined db-btn" onClick={() => this.handleAddProject()}>
							<span className="btn-label">Add Project</span>
						</button>
					</div>
				</div>
			</div>
		)
	}
}

$(function() {
	window.ReactDOM.render(<Dashboard />, document.querySelector("[data-dashboard]"))

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
        return found ? "Your changes will be lost. Are you sure you want to leave?" : undefined; 
    };
});

export default Dashboard;
