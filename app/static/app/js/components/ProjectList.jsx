import React from 'react';
import $ from 'jquery';

import ProjectListItem from './ProjectListItem';

class ProjectList extends React.Component {
    constructor(){
        super();

        this.state = {
            loading: true,
            error: "",
            projects: null
        }
    }

    componentDidMount(){
        // Load projects from API
        this.serverRequest = 
            $.getJSON(this.props.source, json => {
                if (json.results){
                    this.setState({
                        projects: json.results,
                        loading: false
                    });
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

    render() {
        if (this.state.loading){
            return (<div>Loading projects... <i className="fa fa-refresh fa-spin fa-fw"></i></div>);
        }
        else if (this.state.projects){
            return (<ul className="list-group">
                    {this.state.projects.map(p => (
                        <ProjectListItem key={p.id} data={p} /> 
                    ))}
                </ul>);
        }else if (this.state.error){
            return (<div>An error occurred: {this.state.error}</div>);
        }else{
            return (<div></div>); // should never happen
        }
    }
}

export default ProjectList;
