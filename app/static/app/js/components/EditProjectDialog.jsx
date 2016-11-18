import React from 'react';
import '../vendor/bootstrap.min';
import ErrorMessage from './ErrorMessage';
import '../css/EditProjectDialog.scss';
import $ from 'jquery';

class EditProjectDialog extends React.Component {
    static defaultProps = {
        title: "New Project",
        saveLabel: "Create Project",
        savingLabel: "Creating project...",
        saveIcon: "glyphicon glyphicon-plus",
        projectName: "",
        projectDescr: "",
        show: false
    };

    static propTypes = {
        saveAction: React.PropTypes.func.isRequired,
        deleteAction: React.PropTypes.func,
        title: React.PropTypes.string,
        saveLabel: React.PropTypes.string,
        savingLabel: React.PropTypes.string,
        saveIcon: React.PropTypes.string,
        projectName: React.PropTypes.string,
        projectDescr: React.PropTypes.string,
        show: React.PropTypes.bool
    };

    constructor(props){
        super(props);

        this.state = {
            showModal: props.show,
            saving: false,
            deleting: false,
            error: ""
        };

        this.show = this.show.bind(this);
        this.hide = this.hide.bind(this);
        this.handleSave = this.handleSave.bind(this);
        this.handleDelete = this.handleDelete.bind(this);
    }

    componentDidMount(){
        $(this.modal)
            // Ensure state is kept up to date when
            // the user presses the escape key
            .on('hidden.bs.modal', (e) => {
                this.setState({showModal: false});
            })

            // Autofocus
            .on('shown.bs.modal', (e) => {
                this.nameInput.focus();
            });

        this.componentDidUpdate();
    }

    componentWillUnmount(){
        $(this.modal).off('hidden.bs.modal hidden.bs.modal');
    }

    componentDidUpdate(){
        if (this.state.showModal){

            $(this.modal).modal('show');

            // Reset to original values
            this.nameInput.value = this.props.projectName;
            this.descrInput.value = this.props.projectDescr;
        }else{
            $(this.modal).modal('hide');
        }
    }

    show(){
        this.setState({showModal: true, saving: false, error: ""});
    }

    hide(){
        this.setState({showModal: false});
    }

    handleSave(e){
        e.preventDefault();

        this.setState({saving: true});

        this.props.saveAction({
            name: this.nameInput.value,
            descr: this.descrInput.value
        }).fail(e => {
            this.setState({error: e.message || e.responseText || "Could not apply changes"});
        }).always(() => {
            this.setState({saving: false});
        }).done(() => {
            this.hide();
        });
    }

    handleDelete(){
        if (this.props.deleteAction){
            if (window.confirm("All tasks, images and models associated with this project will be permanently deleted. Are you sure you want to continue?")){
                this.setState({deleting: true});
                this.props.deleteAction()
                    .fail(e => {
                        this.setState({error: e.message || e.responseText || "Could not delete project", deleting: false});
                    });
            }
        }
    }

    render(){
        return (
            <div ref={(domNode) => { this.modal = domNode; }}
                className="modal fade edit-project-dialog" tabIndex="-1"
                data-backdrop="static"
            >
              <div className="modal-dialog">
                <div className="modal-content">
                  <div className="modal-header">
                    <button type="button" className="close" onClick={this.hide}><span>&times;</span></button>
                    <h4 className="modal-title">{this.props.title}</h4>
                  </div>
                  <div className="modal-body">
                    <ErrorMessage bind={[this, "error"]} />
                    <form className="form-horizontal" onSubmit={this.handleSave}>
                      <div className="form-group">
                        <label className="col-sm-2 control-label">Name</label>
                        <div className="col-sm-10">
                          <input type="text" className="form-control" ref={(domNode) => { this.nameInput = domNode; }} />
                        </div>
                      </div>
                      <div className="form-group">
                        <label className="col-sm-2 control-label">Description (optional)</label>
                        <div className="col-sm-10">
                          <textarea className="form-control" rows="3" ref={(domNode) => { this.descrInput = domNode; }} />
                        </div>
                      </div>
                    </form>
                  </div>
                  <div className="modal-footer">
                    <div className="pull-right">
                        <button type="button" className="btn btn-default" onClick={this.hide} disabled={this.state.saving}>Cancel</button>
                        <button type="button" className="btn btn-primary save" onClick={this.handleSave} disabled={this.state.saving}>
                            {this.state.saving ? 
                                <span>
                                    <i className="fa fa-circle-o-notch fa-spin"></i> {this.props.savingLabel}
                                </span>
                            :   <span>
                                    <i className={this.props.saveIcon}></i> {this.props.saveLabel}
                                </span>}
                        </button>
                    </div>
                    {this.props.deleteAction ?
                        <div className="text-left">
                            <button 
                                disabled={this.state.deleting}
                                className="btn btn-danger" 
                                onClick={this.handleDelete}>
                                {this.state.deleting ? 
                                    <span>
                                        <i className="fa fa-circle-o-notch fa-spin"></i> Deleting...
                                    </span>
                                :   <span>
                                        <i className="glyphicon glyphicon-trash"></i> Delete
                                    </span>}
                            </button>
                        </div>
                    : ""}
                  </div>
                </div>
              </div>
            </div>
        );
    }
}

export default EditProjectDialog;