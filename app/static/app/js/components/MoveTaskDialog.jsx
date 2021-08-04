import React from 'react';
import FormDialog from './FormDialog';
import PropTypes from 'prop-types';
import { _ } from '../classes/gettext';
import $ from 'jquery';

class MoveTaskDialog extends React.Component {
    static defaultProps = {
        title: _("Move Task"),
        saveLabel: _("Save Changes"),
        savingLabel: _("Moving..."),
        saveIcon: "far fa-edit",
        show: true
    };

    static propTypes = {
        task: PropTypes.object.isRequired,
        saveAction: PropTypes.func.isRequired,
        title: PropTypes.string,
        saveLabel: PropTypes.string,
        savingLabel: PropTypes.string,
        saveIcon: PropTypes.string,
        show: PropTypes.bool
    };

    constructor(props){
        super(props);

        this.state = {
          projectId: props.task.project,
          projects: [],
          loading: true
        };

        this.getFormData = this.getFormData.bind(this);
        this.onShow = this.onShow.bind(this);
    }

    getFormData(){
      return {project: this.state.projectId};
    }

    onShow(){
      this.setState({loading: true, projects: []});

      // Load projects from API
      this.serverRequest = $.getJSON(`/api/projects/?ordering=-created_at`, json => {
        this.setState({
            projects: json.filter(p => p.permissions.indexOf("add") !== -1)
        });
      })
      .fail((jqXHR, textStatus, errorThrown) => {
          this.dialog.setState({ 
              error: interpolate(_("Could not load projects list: %(error)s"), {error: textStatus})
          });
      })
      .always(() => {
          this.setState({loading: false});
          this.serverRequest = null;
      });
    }

    show(){
      this.dialog.show();
    }

    hide(){
      this.dialog.hide();
    }

    componentWillUnmount(){
        if (this.serverRquest) this.serverRquest.abort();
    }

    handleProjectChange = e => {
        this.setState({projectId: e.target.value});
    }

    render(){
        return (
            <FormDialog {...this.props} 
                getFormData={this.getFormData}
                onShow={this.onShow}
                ref={(domNode) => { this.dialog = domNode; }}>
              <div style={{minHeight: '50px'}}>
                {!this.state.loading ? 
                <div className="form-group">
                    <label className="col-sm-2 control-label">{_("Project")}</label>
                    <div className="col-sm-10">
                        <select className="form-control" 
                                value={this.state.projectId}
                                onChange={this.handleProjectChange}>
                            {this.state.projects.map(p => 
                            <option value={p.id} key={p.id}>{p.name}</option>
                            )}
                        </select>
                    </div>
                </div>
                : <i className="fa fa-circle-notch fa-spin fa-fw name-loading"></i>}
              </div>
            </FormDialog>
        );
    }
}

export default MoveTaskDialog;