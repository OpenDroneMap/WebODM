import React from 'react';
import $ from 'jquery';
import '../css/ProjectList.scss';

import ProjectListItem from './ProjectListItem';
import Paginated from './Paginated';
import Paginator from './Paginator';
import ErrorMessage from './ErrorMessage';
import { _, interpolate } from '../classes/gettext';
import PropTypes from 'prop-types';

class ProjectList extends Paginated {
    static propTypes = {
        history: PropTypes.object.isRequired,
    }

    constructor(props){
        super(props);

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

    componentDidUpdate(prevProps){
        if (prevProps.source !== this.props.source){
            this.refresh();
        }
    }

    refresh(){
        this.setState({refreshing: true});

        // Load projects from API
        this.serverRequest = 
            $.getJSON(this.props.source, json => {
                if (json.results){
                    this.setState({
                        projects: json.results,
                        loading: false
                    });
                    this.updatePagination(this.PROJECTS_PER_PAGE, json.count);
                }else{
                    this.setState({ 
                        error: interpolate(_("Invalid JSON response: %(error)s"), {error: JSON.stringify(json)}),
                        loading: false
                    });
                }
            })
            .fail((jqXHR, textStatus, errorThrown) => {
                this.setState({ 
                    error: interpolate(_("Could not load projects list: %(error)s"), {error: textStatus}),
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

    handleTaskMoved = (task) => {
        if (this["projectListItem_" + task.project]){
            this["projectListItem_" + task.project].newTaskAdded();
        }
    }

    handleProjectDuplicated = () => {
        this.refresh();
    }

    render() {
        if (this.state.loading){
            return (<div className="project-list text-center"><i className="fa fa-sync fa-spin fa-2x fa-fw"></i></div>);
        }else{
            return (<div className="project-list">
                <ErrorMessage bind={[this, 'error']} />
                <Paginator className="text-right" {...this.state.pagination} {...this.props}>
                    <ul className={"list-group project-list " + (this.state.refreshing ? "refreshing" : "")}>
                        {this.state.projects.map(p => (
                            <ProjectListItem 
                                ref={(domNode) => { this["projectListItem_" + p.id] = domNode }}
                                key={p.id} 
                                data={p} 
                                onDelete={this.handleDelete}
                                onTaskMoved={this.handleTaskMoved}
                                onProjectDuplicated={this.handleProjectDuplicated}
                                history={this.props.history} /> 
                        ))}
                    </ul>
                </Paginator>
            </div>);
        }
    }
}

export default ProjectList;
