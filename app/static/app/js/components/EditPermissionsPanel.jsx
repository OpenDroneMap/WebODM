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
      validGroupnames: {},
      validatingUser: false,
      validationUnavailable: false
    };

    this.backgroundFailedColor = Css.getValue('btn-danger', 'backgroundColor');
    this.autocompleteBorderColor = Css.getValue('btn-default', 'backgroundColor');
    this.backgroundColor = Css.getValue('theme-secondary', 'backgroundColor');
    this.highlightColor = Css.getValue('theme-background-highlight', 'backgroundColor');
  }

  loadPermissions = () => {
    this.setState({loading: true, permissions: []});

    this.permsRequest = 
      $.getJSON(`/api/projects/${this.props.projectId}/permissions/`, json => {
        let validUsernames = {};
        let validGroupnames = {};
        const permissions = [];
        json.forEach(p => {
          if (p.groupname !== undefined) {
            validGroupnames[p.groupname] = true;
            permissions.push({ ...p, kind: 'group' });
          } else {
            validUsernames[p.username] = true;
            permissions.push({ ...p, kind: 'user' });
          }
        });
        this.setState({ validUsernames, validGroupnames, permissions });
      })
      .fail(() => {
        this.setState({error: _("Cannot load permissions.")});
      })
      .always(() => {
          this.setState({loading: false});
      });
  }

  getPermissions = () => {
      // Cleanup temporary objects then return
      this.state.permissions.forEach(perm => delete(perm.autocomplete));
      return this.state.permissions.map(perm => {
        if (perm.kind === 'group') {
          return { groupname: perm.groupname, permissions: perm.permissions };
        }
        const row = { username: perm.username, permissions: perm.permissions };
        if (perm.owner) row.owner = true;
        return row;
      });
  }

  autocomplete = (perm) => {
      if (this.validateReq){
        this.validateReq.abort();
        this.validateReq = null;  
      }

      if (this.validateTimeout){
          clearTimeout(this.validateTimeout);
          this.validateTimeout = null;
      }

      const isGroup = perm.kind === 'group';
      const principal = isGroup ? perm.groupname : perm.username;

      if (principal === ""){
          delete(perm.autocomplete);
          this.setState({permissions: this.state.permissions});
          return;
      }

      this.setState({validatingUser: true});
      const url = isGroup
        ? `/api/groups/?limit=30&search=${encodeURIComponent(principal)}`
        : `/api/users/?limit=30&search=${encodeURIComponent(principal)}`;
      this.validateTimeout = setTimeout(() => {
        this.validateReq = $.getJSON(url)
          .done((json) => {
            if (isGroup) {
              json.forEach(g => {
                this.state.validGroupnames[g.name] = true;
              });
            } else {
              json.forEach(u => {
                this.state.validUsernames[u.username] = true;
              });
            }

            this.state.permissions.forEach(p => delete(p.autocomplete));

            if (isGroup) {
              if (this.textFocused) perm.autocomplete = json.map(g => ({ username: g.name, email: '' }));
            } else {
              if (this.textFocused) perm.autocomplete = json;
            }

            this.setState({
              validUsernames: this.state.validUsernames,
              validGroupnames: this.state.validGroupnames,
              permissions: this.state.permissions
            });
          }).fail(jqXHR => {
            // Perhaps the user API is not enabled
            if (jqXHR.statusText !== "abort"){
                this.setState({validationUnavailable: true});
            }
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

  handleChangePermissionRole = perm => {
    return e => {
        perm.permissions = this.extendedPermissions(e.target.value);
        this.setState({permissions: this.state.permissions});
    }
  }

  handleChangePermissionUser = perm => {
    return e => {
        perm.username = e.target.value;
        this.autocomplete(perm);
        this.setState({permissions: this.state.permissions});
    };
  }

  handleChangePermissionGroup = perm => {
    return e => {
        perm.groupname = e.target.value;
        this.autocomplete(perm);
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

  extendedPermissions = simPerm => {
      if (simPerm == "rw"){
          return ["add", "change", "delete", "view"];
      }else if (simPerm == "r"){
          return ["view"];
      }else return [];
  }

  permissionLabel = simPerm => {
      if (simPerm === "rw") return _("Read/Write");
      else if (simPerm === "r") return _("Read");
      else if (simPerm === "") return _("No Access");
  }

  allPermissions = () => {
      return ["rw", "r"].map(opt => { return {key: opt, label: this.permissionLabel(opt)}});
  }

  getColorFor = (perm) => {
    const isGroup = perm.kind === 'group';
    const name = isGroup ? perm.groupname : perm.username;
    const valid = isGroup ? this.state.validGroupnames[name] : this.state.validUsernames[name];
    if (this.state.validationUnavailable || this.state.validatingUser || valid) return "";
    else return this.backgroundFailedColor;
  }

  addNewPermission = () => {
    this.setState(update(this.state, {
        permissions: {$push: [{kind: 'user', username: "", permissions: ["view"]}]}
    }));

    setTimeout(() => {
        if (this.lastTextbox) this.lastTextbox.focus();
    }, 0);
  }

  addNewGroupPermission = () => {
    this.setState(update(this.state, {
        permissions: {$push: [{kind: 'group', groupname: "", permissions: ["view"]}]}
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

  acOnMouseEnter = e => {
    e.target.style.backgroundColor = this.highlightColor;
  }

  acOnMouseLeave = e => {
    e.target.style.backgroundColor = "";
  }

  acOnClick = (perm, acEntry) => {
    return e => {
        if (perm.kind === 'group') {
          perm.groupname = acEntry.username;
        } else {
          perm.username = acEntry.username;
        }
        delete(perm.autocomplete);
        this.setState({permissions: this.state.permissions});
    }
  }

  onFocus = e => {
    this.textFocused = true;
  }

  onBlur = perm => {
    return e => {
        delete(perm.autocomplete);
        this.setState({permissions: this.state.permissions});
        this.textFocused = false;
    }
  }

  render() {
    const permissions = this.state.permissions.map((p, i) => {
      const isGroup = p.kind === 'group';
      const inputProps = isGroup ? {
        style: {color: this.getColorFor(p)},
        onChange: this.handleChangePermissionGroup(p),
        value: p.groupname,
        placeholder: _("Group name")
      } : {
        style: {color: this.getColorFor(p)},
        onChange: this.handleChangePermissionUser(p),
        value: p.username,
        placeholder: _("Username")
      };
      return (<form autoComplete="off" key={i}>
        <div className="permission">
            <div className="username-container">
                <i className={"fa user-indicator " + (isGroup ? "fa-users" : "fa-user")}/>
                <input
                    {...inputProps}
                    type="text"
                    autoComplete="off"
                    onFocus={this.onFocus}
                    onBlur={this.onBlur(p)}
                    disabled={p.owner}
                    className="form-control username"
                    ref={(domNode) => this.lastTextbox = domNode} />
                {p.autocomplete && p.autocomplete.length > 0 ? <div className="autocomplete" style={{borderColor: this.autocompleteBorderColor, backgroundColor: this.backgroundColor}}>
                    {p.autocomplete.map(ac => <div key={ac.username} onMouseDown={this.acOnClick(p, ac)} className="ac-entry" onMouseEnter={this.acOnMouseEnter} onMouseLeave={this.acOnMouseLeave} style={{borderColor: this.autocompleteBorderColor}}>
                        <div className="ac-user">{ac.username}</div>
                        {!isGroup ? <div className="ac-email">{ac.email}</div> : ""}
                    </div>)}
                </div> : ""}
            </div>
            <div className="remove">
                {!p.owner ? <a onClick={this.handleDeletePermission(p)}><i className="fa fa-times"></i></a> : ""}
            </div>
            <div className="role-container">
                <select disabled={p.owner} className="form-control" value={this.simplifiedPermission(p.permissions)} onChange={this.handleChangePermissionRole(p)}>
                    {this.allPermissions().map(opt => <option key={opt.key} value={opt.key}>{opt.label}</option>)}
                </select>
            </div>
        </div>
    </form>);
    });

    return (
      <div className="edit-permissions-panel">
        <div className="form-group">
          <label className="col-sm-2 control-label">{_("Permissions")}</label>
          <div className="col-sm-10">
            <ErrorMessage bind={[this, 'error']} />

            {this.state.loading ?
            <i className="fa fa-circle-notch fa-spin fa-fw perms-loading"></i>
            : [permissions, <div key="add-new" className="add-perm-buttons">
                <button type="button" title={_("Add user")} onClick={this.addNewPermission} className="btn btn-default btn-sm add-new"><i className="fa fa-user-plus"></i></button>
                <button type="button" title={_("Add group")} onClick={this.addNewGroupPermission} className="btn btn-default btn-sm add-new"><i className="fa fa-users"></i></button>
            </div>]}
          </div>
        </div>
      </div>
    );
  }
}

export default EditPermissionsPanel;
