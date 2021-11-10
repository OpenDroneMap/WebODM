import React from 'react';
import PropTypes from 'prop-types';
import './SLControls.scss';
import ErrorMessage from 'webodm/components/ErrorMessage';
import { _, interpolate } from 'webodm/classes/gettext';
import $ from 'jquery';

export default class SLControls extends React.Component{
    static defaultProps = {
        sharePopup: null
    };

    static propTypes = {
        sharePopup: PropTypes.object.isRequired
    };

    constructor(props){
        super(props);

        this.state = {
            error: '',
            loading: false,
            useShortLink: false,
            shortId: '',
            editingShortId: false,
            showEditSuccess: false,
            savingShortId: false
        };
    }

    updateRelShareLink = (res, onSuccess = () => {}) => {
        if (res.shortId){
            const linksTarget = this.props.sharePopup.props.linksTarget;
    
            const {username, shortId} = res;
            const linksTargetChar = linksTarget === '3d' ? '3' : 'm';
    
            const relShareLink = `s${linksTargetChar}/${username}/${shortId}`;
            this.props.sharePopup.setState({relShareLink});
            this.setState({shortId});
            onSuccess();
        }else if (res.error){
            this.setState({error: res.error});
        }else this.setState({error: interpolate(_('Invalid response from server: %(error)s'), { error: JSON.stringify(res)})});
    }

    toggleShortLinks = (e) => {
        e.stopPropagation();
        if (!this.state.useShortLink && !this.state.loading){
            this.setState({loading: true});

            const task = this.props.sharePopup.props.task;
            
            $.ajax({
                type: 'POST',
                url: `/api/plugins/editshortlinks/task/${task.id}/shortlink`,
                contentType: 'application/json'
            }).done(res => {
                this.updateRelShareLink(res);
                this.setState({loading: false, useShortLink: !this.state.useShortLink});
            }).fail(error => {
                this.setState({error: interpolate(_('Invalid response from server: %(error)s'), { error }), loading: false});
            });
        }else{
            this.props.sharePopup.setState({relShareLink: this.props.sharePopup.getRelShareLink()});
            this.setState({useShortLink: !this.state.useShortLink});
        }
    }

    handleEdit = () => {
        this.setState({editingShortId: true});
        setTimeout(() => {
            this.editTextbox.focus();
        }, 0);
    }


    handleSave = () => {
        if (!this.state.savingShortId){
            this.setState({savingShortId: true});
            
            const task = this.props.sharePopup.props.task;

            $.ajax({
                type: 'POST',
                url: `/api/plugins/editshortlinks/task/${task.id}/edit`,
                contentType: 'application/json',
                data: JSON.stringify({
                    shortId: this.state.shortId
                }),
                dataType: 'json',
            }).done(res => {
                this.updateRelShareLink(res, () => {
                    this.setState({editingShortId: false, showEditSuccess: true});
                    setTimeout(() => {
                        this.setState({showEditSuccess: false});
                    }, 2000);
                });
            }).fail(error => {
                this.setState({error: interpolate(_('Invalid response from server: %(error)s'), { error }), loading: false});
            }).always(() => {
                this.setState({savingShortId: false});
            });
        }
    }

    handleEditShortId = e => {
        this.setState({shortId: e.target.value});
    }

    handleDelete = e => {
        if (window.confirm(_("Are you sure?"))){
            this.setState({loading: true});
            const task = this.props.sharePopup.props.task;

            $.ajax({
                type: 'POST',
                url: `/api/plugins/editshortlinks/task/${task.id}/delete`,
                contentType: 'application/json',
                dataType: 'json',
            }).done(res => {
                if (res.success){
                    this.setState({useShortLink: false, shortId: ""});
                    this.props.sharePopup.setState({relShareLink: this.props.sharePopup.getRelShareLink()});
                }else if (res.error){
                    this.setState({error: res.error});
                }else{
                    this.setState({error: interpolate(_('Invalid response from server: %(error)s'), { error: JSON.stringify(res) })});
                }
            }).fail(error => {
                this.setState({error: interpolate(_('Invalid response from server: %(error)s'), { error }), loading: false});
            }).always(() => {
                this.setState({loading: false});
            });
        }
    }

    handleShortIdKeyPress = e => {
        if (e.key === 'Enter'){
            this.handleSave();
        }
    }

    render(){
        const { loading, useShortLink, savingShortId,
                shortId, editingShortId, showEditSuccess } = this.state;

        const controls = [<label className="slcheckbox" >
            <input 
              type="checkbox"
              disabled={loading}
              checked={useShortLink}
              onChange={this.toggleShortLinks}
               /> {_("Short Link")}
          </label>];

        if (useShortLink){
            let editIcon = "fa-edit";
            if (showEditSuccess) editIcon = "fa-check";

            const editButton = (<button className="btn btn-secondary" type="button" 
                                        title={_("Edit")} 
                                        onClick={this.handleEdit}><i className={"fa " + editIcon}></i></button>);
            
            let saveIcon = "fa-save";
            if (savingShortId) saveIcon = "fa-circle-notch fa-spin";

            const saveButton = (<button className="btn btn-secondary" type="button"
                                        disabled={shortId.length === 0 || savingShortId}
                                        title={_("Save")} onClick={this.handleSave}><i className={"fa " + saveIcon}></i></button>);

            controls.push(<div className="input-group">
                    <input
                        className="form-control"
                        readOnly={!editingShortId}
                        value={shortId}
                        type="text"
                        placeholder={_("Suffix")}
                        disabled={loading}
                        onChange={this.handleEditShortId}
                        onKeyPress={this.handleShortIdKeyPress}
                        ref={(ref) => { this.editTextbox = ref; }}
                    ></input>
                    
                    <span className="input-group-btn">
                        {editingShortId ? saveButton : editButton}
                    </span>
                </div>);

            controls.push(<div>
                <a className="sldelete" onClick={this.handleDelete}><i className="fa fa-trash"></i> {_("Delete Short Link")}</a>
            </div>);
        }

        return (<div className="slcontrols">
            {controls}
            <ErrorMessage bind={[this, "error"]} />
        </div>);
    }
}
