import React from 'react';
import ErrorMessage from './ErrorMessage';
import FormDialog from './FormDialog';
import EditTaskForm from './EditTaskForm';
import $ from 'jquery';

class EditTaskDialog extends React.Component {
    static defaultProps = {
      show: false
    };

    static propTypes = {
        show: React.PropTypes.bool,
        task: React.PropTypes.object.isRequired,
        onHide: React.PropTypes.func,
        onShow: React.PropTypes.func,
        saveAction: React.PropTypes.func.isRequired
    };

    constructor(props){
        super(props);

        this.state = {
          name: props.task.name,
          editTaskFormLoaded: false
        };

        this.reset = this.reset.bind(this);
        this.getFormData = this.getFormData.bind(this);
        this.handleChange = this.handleChange.bind(this);
        this.save = this.save.bind(this);
        this.handleFormTaskLoaded = this.handleFormTaskLoaded.bind(this);
    }

    reset(){
      this.setState({});
    }

    getFormData(){
      return this.taskForm.getTaskInfo();
    }

    show(){
      this.dialog.show();
    }

    hide(){
      this.dialog.hide();
    }

    handleChange(field){
      return (e) => {
        let state = {};
        state[field] = e.target.value;
        this.setState(state);
      }
    }

    handleFormTaskLoaded(){
      this.setState({editTaskFormLoaded: true});
    }

    save(taskInfo){
      if (this.state.editTaskFormLoaded){
        return this.props.saveAction(taskInfo);
      }else{
        return $.Deferred().reject(new Error("The form has not loaded, please wait."));
      }
    }

    render(){
        return (
            <FormDialog {...this.props} 
                getFormData={this.getFormData}
                reset={this.reset}
                onShow={this.props.onShow}
                onHide={this.props.onHide}
                title={"Edit Task"}
                saveIcon={"fa fa-edit"}
                ref={(domNode) => { this.dialog = domNode; }}
                saveAction={this.save}
                >
              <EditTaskForm 
                ref={(domNode) => { if (domNode) this.taskForm = domNode; }}
                onFormLoaded={this.handleFormTaskLoaded}
                task={this.props.task}
              />
            </FormDialog>
        );
    }
}

export default EditTaskDialog;