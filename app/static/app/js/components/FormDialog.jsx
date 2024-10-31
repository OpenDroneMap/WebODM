import React from 'react';
import ErrorMessage from './ErrorMessage';
import '../css/FormDialog.scss';
import PropTypes from 'prop-types';
import $ from 'jquery';
import { _ } from '../classes/gettext';

class FormDialog extends React.Component {
    static defaultProps = {
        title: _("Title"),
        saveLabel: _("Save"),
        savingLabel: _("Saving…"),
        saveIcon: "glyphicon glyphicon-plus",
        deleteWarning: _("Are you sure?"),
        show: false
    };

    static propTypes = {
        getFormData: PropTypes.func.isRequired,
        reset: PropTypes.func,
        saveAction: PropTypes.func.isRequired,
        handleSaveFunction: PropTypes.func,
        onShow: PropTypes.func,
        onHide: PropTypes.func,
        deleteAction: PropTypes.func,
        title: PropTypes.string,
        saveLabel: PropTypes.string,
        savingLabel: PropTypes.string,
        saveIcon: PropTypes.string,
        deleteWarning: PropTypes.oneOfType([
            PropTypes.string,
            PropTypes.bool
        ]),
        show: PropTypes.bool
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
        this._mounted = true;

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
        this._mounted = false;

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
        if (this.props.reset) this.props.reset();
        this.setState({showModal: true, saving: false, error: ""});
    }

    hide(){
        this.setState({showModal: false});
        if (this.props.onHide) this.props.onHide();
        if (this.serverRequest){
            this.serverRequest.abort();
            this.serverRequest = null;
        }
    }

    handleEnter = e => {
        if (e.key === 'Enter' || e.keyCode === 13){
          this.handleSave(e);
        }
    }

    handleSave(e){
        e.preventDefault();

        this.setState({saving: true, error: ""});

        if (this.props.handleSaveFunction){
            this.props.handleSaveFunction(err => {
                if (!err) this.hide();
                else{
                    this.setState({saving: false, error: err.message});
                }
            });
        }else{
            let formData = {};
            if (this.props.getFormData) formData = this.props.getFormData();
    
            this.serverRequest = this.props.saveAction(formData);
            if (this.serverRequest){
                this.serverRequest.fail(e => {
                    this.setState({error: e.message || (e.responseJSON || {}).detail || (e.responseJSON || {}).error || e.responseText || _("Could not apply changes")});
                }).always(() => {
                    this.setState({saving: false});
                    this.serverRequest = null;
                }).done(() => {
                    this.hide();
                });
            }else{
                this.setState({saving: false});
                this.hide();
            }
        }

    }

    handleDelete(){
        if (this.props.deleteAction){
            if (!this.props.deleteWarning || window.confirm(this.props.deleteWarning)){
                this.setState({deleting: true});
                this.props.deleteAction()
                    .fail(e => {
                        if (this._mounted) this.setState({error: e.message || (e.responseJSON || {}).detail || e.responseText || _("Could not delete item")});
                    }).always(() => {
                        if (this._mounted) this.setState({deleting: false});
                    });
            }
        }
    }

    render(){
        let leftButtons = [];
        if (this.props.deleteAction){
            leftButtons.push(<button 
                disabled={this.state.deleting}
                className="btn btn-danger btn-delete-editProject"
                key="delete" 
                onClick={this.handleDelete}>
                {this.state.deleting ? 
                    <span>
                        <i className="fa fa-circle-notch fa-spin"></i> {_("Deletando...")}
                    </span>
                :   <span>
                        <i className="fa fa-trash"></i> {_("Deletar")}
                    </span>}
            </button>);
        }
        if (this.props.leftButtons){
            leftButtons = leftButtons.concat(this.props.leftButtons);
        } 

        return (
            <div ref={this.setModal}
                className="modal fade form-dialog" tabIndex="-1"
                data-backdrop="static"
            >
              <div className="modal-dialog">
                <div className="modal-content rounded-corners">
                  <div className="modal-header no-border">
                    {/* <button type="button" className="close" onClick={this.hide}><span className="x-close">&times;</span></button> EXCLUIDO POR FALTA DE ULTILIDADE, POIS JA EXISTE UM BOTAO CANCELAR */}
                    <h4 className="modal-title text-center force-montserrat-bold">{this.props.title === "Edit Project" ? "Editar Projeto" : this.props.title }</h4>
                  </div>
                  <div id="edit-project-popup" >
                    <ErrorMessage bind={[this, "error"]} />
                    <div className="" onSubmit={this.handleSave}>
                      {this.props.children}
                    </div>
                  </div>
                  <div className="btn">
                        <button type="button" className="btn save font-12" onClick={this.handleSave} disabled={this.state.saving}>
                            {this.state.saving ? 
                                <span>
                                    Salvar Mudanças
                                </span>
                            :   <span>
                                   Salvar Mudanças
                                </span>}
                        </button>
                        <button type="button" className="btn btn-cancel font-12" onClick={this.hide} disabled={this.state.saving}>{_("Cancelar")}</button>
                    
                    {leftButtons.length > 0 ?
                        <div className="text-left">
                            {leftButtons}
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
