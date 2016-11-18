import React from 'react';
import $ from 'jquery';

import ProjectListItem from './ProjectListItem';
import Paginated from './Paginated';
import Paginator from './Paginator';

class ProjectList extends Paginated {
    constructor(){
        super();

        this.state = {
            loading: true,
            error: "",
            projects: null
        }

        this.handleDelete = this.handleDelete.bind(this);
    }

    componentDidMount(){
        this.refresh();
    }

    refresh(){
        // Load projects from API
        this.serverRequest = 
            $.getJSON(this.props.source, json => {
                if (json.results){
                    this.setState({
                        projects: json.results,
                        loading: false
                    });
                    this.setupPagination(10, json.count);
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
        this.serverRequest.abort();
    }

    handleDelete(projectId){
        let projects = this.state.projects.filter(p => p.id !== projectId);
        this.setState({projects: projects});
    }

    render() {
        if (this.state.loading){
            return (<div>Loading projects... <i className="fa fa-refresh fa-spin fa-fw"></i></div>);
        }
        else if (this.state.projects){
            return (
              <Paginator className="text-right" {...this.state.pagination}>
                <ul className="list-group">
                    {this.state.projects.map(p => (
                        <ProjectListItem key={p.id} data={p} onDelete={this.handleDelete} /> 
                    ))}
                </ul>
            </Paginator>);
        }else if (this.state.error){
            return (<div>An error occurred: {this.state.error}</div>);
        }else{
            return (<div></div>); // should never happen
        }
    }
}

export default ProjectList;
