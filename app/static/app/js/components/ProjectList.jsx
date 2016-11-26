import React from 'react';
import $ from 'jquery';
import '../css/ProjectList.scss';

import ProjectListItem from './ProjectListItem';
import Paginated from './Paginated';
import Paginator from './Paginator';
import ErrorMessage from './ErrorMessage';

class ProjectList extends Paginated {
    constructor(){
        super();

        this.state = {
            loading: true,
            refreshing: false,
            error: "",
            projects: []
        }

        this.PROJECTS_PER_PAGE = 10;

        this.handleDelete = this.handleDelete.bind(this);
    }

    componentDidMount(){
        this.refresh();
    }

    refresh(){
        this.setState({refreshing: true});

        // Load projects from API
        this.serverRequest = 
            $.getJSON(this.getPaginatedUrl(this.props.source), json => {
                if (json.results){
                    this.setState({
                        projects: json.results,
                        loading: false
                    });
                    this.updatePagination(this.PROJECTS_PER_PAGE, json.count);
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
            })
            .always(() => {
                this.setState({refreshing: false});
            });
    }

    onPageChanged(pageNum){
        this.refresh();
    }

    componentWillUnmount(){
        this.serverRequest.abort();
    }

    handleDelete(projectId){
        let projects = this.state.projects.filter(p => p.id !== projectId);
        this.setState({projects: projects});
        this.handlePageItemsNumChange(-1, () => {
            this.refresh();
        });
    }

    render() {
        if (this.state.loading){
            return (<div className="project-list">Loading projects... <i className="fa fa-refresh fa-spin fa-fw"></i></div>);
        }else{
            return (<div className="project-list">
                  <ErrorMessage bind={[this, 'error']} />
                  <Paginator className="text-right" {...this.state.pagination} handlePageChange={this.handlePageChange.bind(this)}>
                    <ul className={"list-group project-list " + (this.state.refreshing ? "refreshing" : "")}>
                        {this.state.projects.map(p => (
                            <ProjectListItem key={p.id} data={p} onDelete={this.handleDelete} /> 
                        ))}
                    </ul>
                </Paginator>
            </div>);
        }
    }
}

export default ProjectList;
