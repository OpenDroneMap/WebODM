import '../css/EditPermissionsPanel.scss';
import React from 'react';
import ErrorMessage from './ErrorMessage';
import PropTypes from 'prop-types';
import $ from 'jquery';
import { _, interpolate } from '../classes/gettext';
import update from 'immutability-helper';
import Css from '../classes/Css';

class EditPermissionsPanel extends React.Component {
  static defaultProps = {
    projectId: -1,
    lazyLoad: true
  };

  static propTypes = {
    projectId: PropTypes.number.isRequired,
    lazyLoad: PropTypes.bool
  };

  constructor(props){
    super(props);

    this.state = {
      error: "",
      loading: false,
      permissions: [],
      validUsernames: {},
      validatingUser: false
    };

    this.backgroundFailedColor = Css.getValue('btn-danger', 'backgroundColor');
  }

  loadPermissions = () => {
    this.setState({loading: true, permissions: []});

    this.permsRequest = 
      $.getJSON(`/api/projects/${this.props.projectId}/permissions/`, json => {
        let validUsernames = {};
        json.forEach(p => validUsernames[p.username] = true);
        this.setState({validUsernames, permissions: json});
      })
      .fail(() => {
        this.setState({error: _("Cannot load permissions.")});
      })
      .always(() => {
          this.setState({loading: false});
      });
  }

  validateUsername = (username) => {
      if (this.validateReq){
        this.validateReq.abort();
        this.validateReq = null;  
      }

      if (this.validateTimeout){
          clearTimeout(this.validateTimeout);
          this.validateTimeout = null;
      }

      this.setState({validatingUser: true});

      this.validateTimeout = setTimeout(() => {
        this.validateReq = $.getJSON(`/api/users/?limit=30&search=${encodeURIComponent(username)}`)
          .done((json) => {
            json.forEach(u => {
                this.state.validUsernames[u.username] = true;
            });

            this.setState({validUsernames: this.state.validUsernames});
          }).fail(() => {

          }).always(() => {
            this.setState({validatingUser: false});
          });
      }, 300);
  }

  componentDidMount(){
      if (!this.props.lazyLoad) this.loadPermissions();
  }

  componentWillUnmount(){
      if (this.permsRequest) this.permsRequest.abort();
      if (this.validateReq) this.validateReq.abort();
      if (this.validateTimeout) clearTimeout(this.validateTimeout);
  }

  handleChangePermissionRole = e => {

  }

  handleChangePermissionUser = perm => {
    return e => {
        perm.username = e.target.value;

        this.validateUsername(perm.username);
        
        // Update
        this.setState({permissions: this.state.permissions});
    };
  }

  simplifiedPermission = perms => {
      // We simplify WebODM's internal permission model into
      // a simpler read or read/write model.
      if (perms.indexOf("change") !== -1) return "rw";
      else if (perms.indexOf("view") !== -1) return "r";
      else return "";
  }

  permissionLabel = simPerm => {
      if (simPerm === "rw") return _("Read/Write");
      else if (simPerm === "r") return _("Read");
      else if (simPerm === "") return _("No Access");
  }

  allPermissions = () => {
      return ["rw", "r"].map(p => { return {key: p, label: this.permissionLabel(p)}});
  }

  getColorFor = (username) => {
    if (this.state.validatingUser || this.state.validUsernames[username]) return "";
    else return this.backgroundFailedColor;
  }

  addNewPermission = () => {
    this.setState(update(this.state, {
        permissions: {$push: [{username: "", permissions: ["view"]}]}
    }));

    setTimeout(() => {
        if (this.lastTextbox) this.lastTextbox.focus();
    }, 0);
  }

  handleDeletePermission = perm => {
      return () => {
        this.setState(update(this.state, {
            permissions: arr => arr.filter(p => p !== perm)
        }));
      }
  }

  render() {
    const permissions = this.state.permissions.map((p, i) => <form autoComplete="off" key={i}>
        <div className="permission">
            <div className="username-container">
                <i className="fa fa-user user-indicator"/>
                <input 
                    style={{color: this.getColorFor(p.username)}}
                    onChange={this.handleChangePermissionUser(p)} 
                    type="text"
                    autoComplete="off"
                    disabled={p.owner} 
                    value={p.username} 
                    className="form-control username" 
                    placeholder={_("Username")}
                    ref={(domNode) => this.lastTextbox = domNode} />
            </div>
            <div className="remove">
                {!p.owner ? <a onClick={this.handleDeletePermission(p)}><i className="fa fa-times"></i></a> : ""}
            </div>
            <div className="role-container">
                <select disabled={p.owner} className="form-control" value={this.simplifiedPermission(p.permissions)} onChange={this.handleChangePermissionRole}>
                    {this.allPermissions().map(p => <option key={p.key} value={p.key}>{p.label}</option>)}
                </select>
            </div>
        </div>
    </form>);

    return (
      <div className="edit-permissions-panel">
        <div className="form-group">
          <label className="col-sm-2 control-label">{_("Permissions")}</label>
          <div className="col-sm-10">
            <ErrorMessage bind={[this, 'error']} />

            {this.state.loading ? 
            <i className="fa fa-circle-notch fa-spin fa-fw perms-loading"></i>
            : [permissions, <div key="add-new">
                <button onClick={this.addNewPermission} className="btn btn-default btn-sm add-new"><i className="fa fa-user-plus"></i></button>
            </div>]}
          </div>
        </div>
      </div>
    );
  }
}

export default EditPermissionsPanel;
