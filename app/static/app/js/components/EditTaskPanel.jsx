import '../css/EditTaskPanel.scss';
import React from 'react';
import ErrorMessage from './ErrorMessage';
import EditTaskForm from './EditTaskForm';
import PropTypes from 'prop-types';
import $ from 'jquery';
import { _ } from '../classes/gettext';

class EditTaskPanel extends React.Component {
    static defaultProps = {
    };

    static propTypes = {
        task: PropTypes.object.isRequired,
        onSave: PropTypes.func.isRequired,
        onCancel: PropTypes.func.isRequired
    };

    constructor(props){
        super(props);

        this.state = {
          editTaskFormLoaded: false,
          saving: false,
          error: ''
        };

        this.handleSave = this.handleSave.bind(this);
        this.handleCancel = this.handleCancel.bind(this);
        this.handleFormTaskLoaded = this.handleFormTaskLoaded.bind(this);
    }

    handleFormTaskLoaded(){
      this.setState({editTaskFormLoaded: true});
    }

    handleSave(){
      this.setState({saving: true});

      let taskInfo = this.taskForm.getTaskInfo();

      taskInfo.processing_node = taskInfo.selectedNode.id;
      taskInfo.auto_processing_node = taskInfo.selectedNode.key == "auto";
      delete(taskInfo.selectedNode);

      $.ajax({
          url: `/api/projects/${this.props.task.project}/tasks/${this.props.task.id}/`,
          contentType: 'application/json',
          data: JSON.stringify(taskInfo),
          dataType: 'json',
          type: 'PATCH'
        }).done((json) => {
          this.setState({saving: false});
          this.props.onSave(json);
        }).fail(() => {
          this.setState({saving: false, error: _("Could not update task information. Plese try again.")});
        });     
    }

    handleCancel(){
      this.props.onCancel();
    }

    render(){
        return (
            <div className="edit-task-panel">
              <ErrorMessage bind={[this, "error"]} />
              <div className="form-horizontal">
                <EditTaskForm 
                  ref={(domNode) => { if (domNode) this.taskForm = domNode; }}
                  onFormLoaded={this.handleFormTaskLoaded}
                  task={this.props.task}
                />
                <div className="actions">
                    <button type="button" className="btn btn-sm btn-default" onClick={this.handleCancel} disabled={this.state.saving}>{_("Cancel")}</button>
                    <button type="button" className="btn btn-sm btn-primary save" onClick={this.handleSave} disabled={this.state.saving || !this.state.editTaskFormLoaded}>
                        {this.state.saving ? 
                            <span>
                                <i className="fa fa-circle-notch fa-spin"></i> {_("Saving...")}
                            </span>
                        :   <span>
                                <i className="fa fa-edit"></i> {_("Save")}
                            </span>}
                    </button>
                </div>
              </div>
            </div>
        );
    }
}

export default EditTaskPanel;