import React from 'react';
import ErrorMessage from './ErrorMessage';
import '../css/FormDialog.scss';
import $ from 'jquery';

class FormDialog extends React.Component {
    static defaultProps = {
        title: "Title",
        saveLabel: "Save",
        savingLabel: "Saving...",
        saveIcon: "glyphicon glyphicon-plus",
        deleteWarning: "Are you sure?",
        show: false
    };

    static propTypes = {
        getFormData: React.PropTypes.func.isRequired,
        reset: React.PropTypes.func.isRequired,
        saveAction: React.PropTypes.func.isRequired,
        onShow: React.PropTypes.func,
        onHide: React.PropTypes.func,
        deleteAction: React.PropTypes.func,
        title: React.PropTypes.string,
        saveLabel: React.PropTypes.string,
        savingLabel: React.PropTypes.string,
        saveIcon: React.PropTypes.string,
        deleteWarning: React.PropTypes.string,
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

        this.setModal = this.setModal.bind(this);
        this.show = this.show.bind(this);
        this.hide = this.hide.bind(this);
        this.handleSave = this.handleSave.bind(this);
        this.handleDelete = this.handleDelete.bind(this);
    }

    setModal(domNode){
        this.modal = domNode;
    }

    componentDidMount(){
        $(this.modal)
            // Ensure state is kept up to date when
            // the user presses the escape key
            .on('hidden.bs.modal', (e) => {
                this.hide();
            })

            // Autofocus
            .on('shown.bs.modal', (e) => {
                if (this.props.onShow) this.props.onShow();
            });

        this.componentDidUpdate();
    }

    componentWillUnmount(){
        $(this.modal).off('hidden.bs.modal hidden.bs.modal')
                     .modal('hide');
    }

    componentDidUpdate(){
        if (this.state.showModal){
            $(this.modal).modal('show');
        }else{
            $(this.modal).modal('hide');
        }
    }

    show(){
        this.props.reset();
        this.setState({showModal: true, saving: false, error: ""});
    }

    hide(){
        this.setState({showModal: false});
        if (this.props.onHide) this.props.onHide();
    }

    handleSave(e){
        e.preventDefault();

        this.setState({saving: true});

        let formData = {};
        if (this.props.getFormData) formData = this.props.getFormData();

        this.props.saveAction(formData).fail(e => {
            this.setState({error: e.message || (e.responseJSON || {}).detail || e.responseText || "Could not apply changes"});
        }).always(() => {
            this.setState({saving: false});
        }).done(() => {
            this.hide();
        });
    }

    handleDelete(){
        if (this.props.deleteAction){
            if (window.confirm(this.props.deleteWarning)){
                this.setState({deleting: true});
                this.props.deleteAction()
                    .fail(e => {
                        this.setState({error: e.message || (e.responseJSON || {}).detail || e.responseText || "Could not delete item", deleting: false});
                    });
            }
        }
    }

    render(){
        return (
            <div ref={this.setModal}
                className="modal form-dialog" tabIndex="-1"
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
                      {this.props.children}
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

export default FormDialog;