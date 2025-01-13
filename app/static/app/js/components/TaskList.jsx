import React from 'react';
import '../css/TaskList.scss';
import TaskListItem from './TaskListItem';
import PropTypes from 'prop-types';
import $ from 'jquery';
import HistoryNav from '../classes/HistoryNav';
import { _, interpolate } from '../classes/gettext';

class TaskList extends React.Component {
  static propTypes = {
      history: PropTypes.object.isRequired,
      source: PropTypes.string.isRequired, // URL where to load task list
      onDelete: PropTypes.func,
      onTaskMoved: PropTypes.func,
      hasPermission: PropTypes.func.isRequired,
      onTagsChanged: PropTypes.func,
      onTagClicked: PropTypes.func
  }

  constructor(props){
    super(props);

    this.historyNav = new HistoryNav(props.history);

    this.state = {
      tasks: [],
      error: "",
      loading: true,
      filterText: "",
      filterTags: []
    };

    this.refresh = this.refresh.bind(this);
    this.retry = this.retry.bind(this);
    this.deleteTask = this.deleteTask.bind(this);
  }

  componentDidMount(){
    this.loadTaskList(); 
  }

  refresh(){
    this.loadTaskList();
  }

  retry(){
    this.setState({error: "", loading: true});
    this.refresh();
  }

  applyFilter(text, tags){
    this.setState({filterText: text, filterTags: tags});
  }

  loadTaskList(){
    this.setState({loading: true});

    this.taskListRequest = 
      $.getJSON(this.props.source, json => {
          if (json.length === 1){
            this.historyNav.addToQSList("project_task_expanded", json[0].id);
          }

          this.setState({
              tasks: json
          });
          setTimeout(() => this.notifyTagsChanged(), 0);
        })
        .fail((jqXHR, textStatus, errorThrown) => {
          this.setState({ 
              error: interpolate(_("Could not load task list: %(error)s"), { error: textStatus} ),
          });
        })
        .always(() => {
          this.setState({
            loading: false
          });
        });
  }

  componentWillUnmount(){
    this.taskListRequest.abort();
  }

  deleteTask(id){
    this.setState({
      tasks: this.state.tasks.filter(t => t.id !== id)
    });
    if (this.props.onDelete) this.props.onDelete(id);
  }

  moveTask = (task) => {
    this.refresh();
    if (this.props.onTaskMoved) this.props.onTaskMoved(task);
  }

  notifyTagsChanged = () => {
    const { tasks } = this.state;
    const tags = [];
    if (tasks){
      tasks.forEach(t => {
        if (t.tags){
          t.tags.forEach(x => {
            if (tags.indexOf(x) === -1) tags.push(x);
          });
        }
      });
    }
    tags.sort();

    if (this.props.onTagsChanged) this.props.onTagsChanged(tags);
  }

  taskEdited = (task) => {
    // Update
    const { tasks } = this.state;
    for (let i = 0; i < tasks.length; i++){
      if (tasks[i].id === task.id){
        tasks[i] = task;
        break;
      }
    }
    this.setState({tasks});

    // Tags might have changed
    setTimeout(() => this.notifyTagsChanged(), 0);
  }

  arrayContainsAll = (a, b) => {
    let miss = false;
    for (let i = 0; i < b.length; i++){
      if (a.indexOf(b[i]) === -1){
        miss = true;
        break;
      }
    }
    return !miss;
  }

  render() {
    let message = "";
    if (this.state.loading){
      message = (<span>{_("Loading...")} <i className="fa fa-circle-notch fa-spin fa-fw"></i></span>);
    }else if (this.state.error){
      message = (<span>{interpolate(_("Error: %(error)s"), {error: this.state.error})} <a href="javascript:void(0);" onClick={this.retry}>{_("Try again")}</a></span>);
    }else if (this.state.tasks.length === 0){
      message = (<span></span>);
    }

    return (
      <div className="task-list">
        {this.state.tasks.filter(t => {
          const name = t.name !== null ? t.name : interpolate(_("Task #%(number)s"), { number: t.id });
          return name.toLocaleLowerCase().indexOf(this.state.filterText.toLocaleLowerCase()) !== -1 &&
                  this.arrayContainsAll(t.tags, this.state.filterTags);
        }).map(task => (
          <TaskListItem 
            data={task} 
            key={task.id} 
            refreshInterval={3000} 
            onDelete={this.deleteTask}
            onMove={this.moveTask}
            onDuplicate={this.refresh}
            onEdited={this.taskEdited}
            onTagClicked={this.props.onTagClicked}
            hasPermission={this.props.hasPermission}
            history={this.props.history} />
        ))}

        {message}
      </div>
    );
  }
}

export default TaskList;
