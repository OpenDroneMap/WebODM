import React from 'react';
import '../css/EditProjectDialog.scss';
import FormDialog from './FormDialog';
import PropTypes from 'prop-types';
import ErrorMessage from './ErrorMessage';
import EditPermissionsPanel from './EditPermissionsPanel';
import TagsField from './TagsField';
import { _ } from '../classes/gettext';

class EditProjectDialog extends React.Component {
    static defaultProps = {
        projectName: "",
        projectDescr: "",
        projectId: -1,
        projectTags: [],
        title: _("New Project"),
        saveLabel: _("Create Project"),
        savingLabel: _("Creating project..."),
        saveIcon: "glyphicon glyphicon-plus",
        deleteWarning: "",
        show: false,
        showDuplicate: false,
        showPermissions: false,
        onDuplicated: () => {}
    };

    static propTypes = {
        projectName: PropTypes.string,
        projectDescr: PropTypes.string,
        projectId: PropTypes.number,
        projectTags: PropTypes.array,
        saveAction: PropTypes.func.isRequired,
        onShow: PropTypes.func,
        deleteAction: PropTypes.func,
        title: PropTypes.string,
        saveLabel: PropTypes.string,
        savingLabel: PropTypes.string,
        saveIcon: PropTypes.string,
        deleteWarning: PropTypes.string,
        show: PropTypes.bool,
        showDuplicate: PropTypes.bool,
        showPermissions: PropTypes.bool,
        onDuplicated: PropTypes.func
    };

    constructor(props){
        super(props);

        this.state = {
          name: props.projectName,
          descr: props.projectDescr !== null ? props.projectDescr : "",
          duplicating: false,
          tags: props.projectTags,
          error: "",
          showTagsField: !!props.projectTags.length
        };

        this.reset = this.reset.bind(this);
        this.getFormData = this.getFormData.bind(this);
        this.onShow = this.onShow.bind(this);
        this.handleChange = this.handleChange.bind(this);
    }

    reset(){
      this.setState({
        name: this.props.projectName,
        descr: this.props.projectDescr,
        duplicating: false,
        tags: this.props.projectTags,
        showTagsField: !!this.props.projectTags.length,
        error: ""
      });
    }

    getFormData(){
      const res = {
          name: this.state.name,
          descr: this.state.descr,
          tags: this.state.tags
      };
      
      if (this.editPermissionsPanel){
          res.permissions = this.editPermissionsPanel.getPermissions();
      }

      return res;
    }

    onShow(){

      if (this.editPermissionsPanel) this.editPermissionsPanel.loadPermissions();
      this.nameInput.focus();
    }

    show(){
      this.dialog.show();
    }

    hide(){
      this.dialog.hide();

      if (this.duplicateRequest){
          this.duplicateRequest.abort();
          this.duplicateRequest = null;
      }
    }

    handleChange(field){
      return (e) => {
        let state = {};
        state[field] = e.target.value;
        this.setState(state);
      }
    }

    handleDuplicate = () => {
        this.setState({duplicating: true});
        this.duplicateRequest = $.post(`/api/projects/${this.props.projectId}/duplicate/`)
            .done(json => {
                if (json.success){
                    this.hide();
                    this.props.onDuplicated(json.project);
                }else{
                    this.setState({
                        error: json.error || _("Cannot complete operation.")
                    });
                }
            })
            .fail(() => {
                this.setState({
                    error: _("Cannot complete operation."),
                });
            })
            .always(() => {
                this.setState({duplicating: false});
                this.duplicateRequest = null;
            });
    }

    toggleTagsField = () => {
      if (!this.state.showTagsField){
        setTimeout(() => {
          if (this.tagsField) this.tagsField.focus();
        }, 0);
      }
      this.setState({showTagsField: !this.state.showTagsField});
    }

    render(){
        let tagsField = "";
        if (this.state.showTagsField){
          tagsField = (<div className="form-group">
              <label className="col-sm-2 control-label">{_("Tags")}</label>
                <div className="col-sm-10"> 
                  <TagsField onUpdate={(tags) => this.state.tags = tags } tags={this.state.tags} ref={domNode => this.tagsField = domNode}/>
                </div>
            </div>);
        }

        return (
            <FormDialog {...this.props}
                getFormData={this.getFormData}
                reset={this.reset}
                onShow={this.onShow}
                leftButtons={this.props.showDuplicate ? [<button key="duplicate" disabled={this.duplicating} onClick={this.handleDuplicate} className="btn btn-default"><i className={"fa " + (this.state.duplicating ? "fa-circle-notch fa-spin fa-fw" : "fa-copy")}></i><span className="hidden-xs"> {_("Duplicate")}</span></button>] : undefined}
                ref={(domNode) => { this.dialog = domNode; }}>
              <ErrorMessage bind={[this, "error"]} />
              <div className="form-group edit-project-dialog">
                <label className="col-sm-2 control-label">{_("Name")}</label>
                <div className="col-sm-10 name-fields">
                  <input type="text" className="form-control" ref={(domNode) => { this.nameInput = domNode; }} value={this.state.name} onChange={this.handleChange('name')} onKeyPress={e => this.dialog.handleEnter(e)} />
                  <button type="button" title={_("Add tags")} onClick={this.toggleTagsField} className="btn btn-sm btn-secondary toggle-tags">
                    <i className="fa fa-tag"></i>
                  </button>
                </div>
              </div>
              {tagsField}
              <div className="form-group">
                <label className="col-sm-2 control-label">{_("Description (optional)")}</label>
                <div className="col-sm-10">
                  <textarea className="form-control" rows="3" value={this.state.descr} onChange={this.handleChange('descr')} />
                </div>
              </div>
              {this.props.showPermissions ? 
                <EditPermissionsPanel 
                    projectId={this.props.projectId}
                    lazyLoad={true}
                    ref={(domNode) => { this.editPermissionsPanel = domNode; }} />
              : ""}
            </FormDialog>
        );
    }
}

export default EditProjectDialog;