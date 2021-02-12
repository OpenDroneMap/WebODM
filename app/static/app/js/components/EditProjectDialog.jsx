import React from 'react';
import FormDialog from './FormDialog';
import PropTypes from 'prop-types';
import { _ } from '../classes/gettext';

class EditProjectDialog extends React.Component {
    static defaultProps = {
        projectName: "",
        projectDescr: "",
        title: _("New Project"),
        saveLabel: _("Create Project"),
        savingLabel: _("Creating project..."),
        saveIcon: "glyphicon glyphicon-plus",
        deleteWarning: _("All tasks, images and models associated with this project will be permanently deleted. Are you sure you want to continue?"),
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
        return (
            <FormDialog {...this.props} 
                getFormData={this.getFormData} 
                reset={this.reset}
                onShow={this.onShow}
                ref={(domNode) => { this.dialog = domNode; }}>
              <div className="form-group">
                <label className="col-sm-2 control-label">{_("Name")}</label>
                <div className="col-sm-10">
                  <input type="text" className="form-control" ref={(domNode) => { this.nameInput = domNode; }} value={this.state.name} onChange={this.handleChange('name')} />
                </div>
              </div>
              <div className="form-group">
                <label className="col-sm-2 control-label">{_("Description (optional)")}</label>
                <div className="col-sm-10">
                  <textarea className="form-control" rows="3" value={this.state.descr} onChange={this.handleChange('descr')} />
                </div>
              </div>
            </FormDialog>
        );
    }
}

export default EditProjectDialog;