import React from 'react';
import ErrorMessage from './ErrorMessage';
import FormDialog from './FormDialog';
import PropTypes from 'prop-types';
import $ from 'jquery';

class EditProjectDialog extends React.Component {
    static defaultProps = {
        projectName: "",
        projectDescr: "",
        title: "New Project",
        saveLabel: "Create Project",
        savingLabel: "Creating project...",
        saveIcon: "glyphicon glyphicon-plus",
        deleteWarning: "All tasks, images and models associated with this project will be permanently deleted. Are you sure you want to continue?",
        show: false
    };

    static propTypes = {
        projectName: PropTypes.string,
        projectDescr: PropTypes.string,
        saveAction: PropTypes.func.isRequired,
        onShow: PropTypes.func,
        deleteAction: PropTypes.func,
        title: PropTypes.string,
        saveLabel: PropTypes.string,
        savingLabel: PropTypes.string,
        saveIcon: PropTypes.string,
        deleteWarning: PropTypes.string,
        show: PropTypes.bool
    };

    constructor(props){
        super(props);

        this.state = {
          name: props.projectName,
          descr: props.projectDescr !== null ? props.projectDescr : ""
        };

        this.reset = this.reset.bind(this);
        this.getFormData = this.getFormData.bind(this);
        this.onShow = this.onShow.bind(this);
        this.handleChange = this.handleChange.bind(this);
    }

    reset(){
      this.setState({
        name: this.props.projectName,
        descr: this.props.projectDescr
      });
    }

    getFormData(){
      return this.state;
    }

    onShow(){
      this.nameInput.focus();
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

    render(){
        const formId = Math.random().toString(36).substring(2, 15)
        return (
            <FormDialog {...this.props} 
                getFormData={this.getFormData} 
                reset={this.reset}
                onShow={this.onShow}
                ref={(domNode) => { this.dialog = domNode; }}>
              <div className="form-group">
                <label className="control-label" htmlFor={`form-${formId}-project-name-input`}>Name</label>
                <input
                    id={`form-${formId}-project-name-input`}
                    type="text"
                    className="form-control db-input"
                    ref={(domNode) => { this.nameInput = domNode; }}
                    autoComplete="off"
                    value={this.state.name}
                    onChange={this.handleChange('name')} />
              </div>
              <div className="form-group">
                <label className="control-label" htmlFor={`form-${formId}-project-desc-input`}>Description&nbsp;<small>(Optional)</small></label>
                <textarea
                  id={`form-${formId}-project-desc-input`}
                  className="form-control db-input none-resize"
                  rows="3"
                  value={this.state.descr}
                  onChange={this.handleChange('descr')} />
              </div>
            </FormDialog>
        );
    }
}

export default EditProjectDialog;