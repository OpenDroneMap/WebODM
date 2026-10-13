import React from 'react';
import ReactDOM from 'ReactDOM';
import PropTypes from 'prop-types';
import $ from 'jquery';
import csrf from './django/csrf';
import ErrorMessage from './components/ErrorMessage';
import './css/PluginBrowser.scss';
import { _, interpolate } from './classes/gettext';

const REPO_URL = "https://plugins.webodm.org";

function versionToInt(v){
    const p = String(v || "0").split(".");
    return (parseInt(p[0]) || 0) * 10000 + (parseInt(p[1]) || 0) * 100 + (parseInt(p[2]) || 0);
}

function absUrl(u){
    if (/^https?:\/\//i.test(u)) return u;
    return REPO_URL + (u.charAt(0) === "/" ? "" : "/") + u;
}

class PluginBrowserItem extends React.Component {
    static propTypes = {
        plugin: PropTypes.object.isRequired,
        installed: PropTypes.bool.isRequired,
        upToDate: PropTypes.bool.isRequired,
        compatible: PropTypes.bool.isRequired,
        installing: PropTypes.bool.isRequired,
        installingLabel: PropTypes.string,
        disabled: PropTypes.bool.isRequired,
        error: PropTypes.string,
        onInstall: PropTypes.func.isRequired
    };

    constructor(props){
        super(props);
        this.state = { error: props.error || "" };
    }

    componentDidUpdate(prevProps){
        if (prevProps.error !== this.props.error) this.setState({error: this.props.error || ""});
    }

    handleInstall = () => {
        this.props.onInstall(this.props.plugin, this.props.installed);
    }

    renderButton(){
        const { plugin, installed, upToDate, compatible, installing, installingLabel, disabled } = this.props;

        if (installing){
            return (<button type="button" className="btn btn-primary" disabled>
                <i className="fa fa-circle-notch fa-spin"></i> {installingLabel}
            </button>);
        }else if (installed && upToDate){
            return (<button type="button" className="btn btn-default" disabled>
                <i className="glyphicon glyphicon-ok"></i> {_("Installed")}
            </button>);
        }else if (!compatible){
            return (<button type="button" className="btn btn-default" disabled>
                {interpolate(_("Requires WebODM %(version)s"), { version: plugin.webodmMinVersion })}
            </button>);
        }else if (installed){
            return (<button type="button" className="btn btn-primary" disabled={disabled} onClick={this.handleInstall}>
                <i className="glyphicon glyphicon-refresh"></i> {_("Update")}
            </button>);
        }else{
            return (<button type="button" className="btn btn-primary" disabled={disabled} onClick={this.handleInstall}>
                <i className="glyphicon glyphicon-download-alt"></i> {_("Install")}
            </button>);
        }
    }

    render(){
        const { plugin } = this.props;

        return (<div className="plugin-browser-item theme-border">
            <div className="plugin-info">
                <span className="plugin-name">{plugin.name || plugin.id}</span>
                {plugin.experimental === true ? <span className="plugin-tag plugin-badge theme-color-button-primary">{_("Experimental")}</span> : ""}
                {plugin.deprecated === true ? <span className="plugin-tag theme-color-button-danger">{_("Deprecated")}</span> : ""}
                {plugin.author ? <p className="plugin-author">{interpolate(_("by %(author)s"), { author: plugin.author })}</p> : ""}
                <p className="plugin-desc">{plugin.description || ""}</p>
                <ErrorMessage bind={[this, 'error']} className="plugin-error" />
            </div>
            <div className="plugin-action">
                {this.renderButton()}
            </div>
        </div>);
    }
}

class PluginBrowserDialog extends React.Component {
    static propTypes = {
        installed: PropTypes.object.isRequired,
        webodmVersion: PropTypes.string.isRequired,
        canBuild: PropTypes.bool.isRequired,
        uploadUrl: PropTypes.string.isRequired,
        onHide: PropTypes.func.isRequired
    };

    constructor(props){
        super(props);

        this.state = {
            plugins: null,
            loadError: "",
            search: "",
            installed: Object.assign({}, props.installed),
            installing: null,
            installingLabel: "",
            errors: {},
            success: "",
            changed: false
        };
    }

    componentDidMount(){
        this._mounted = true;
        $(this.modal).on('hidden.bs.modal', this.handleHidden)
                     .modal('show');
        this.load();
    }

    componentWillUnmount(){
        this._mounted = false;
        $(this.modal).off('hidden.bs.modal')
                     .modal('hide');
    }

    setModal = (domNode) => {
        this.modal = domNode;
    }

    setBody = (domNode) => {
        this.body = domNode;
    }

    handleHidden = () => {
        if (this.state.changed) location.reload();
        else this.props.onHide();
    }

    hide = () => {
        $(this.modal).modal('hide');
    }

    downloadUrl(p){
        return this.props.canBuild ? p.url : p.prebuilt_url;
    }

    downloadSha256(p){
        return this.props.canBuild ? p.sha256 : p.prebuilt_sha256;
    }

    load(){
        fetch(REPO_URL + "/index.json", { cache: "no-cache" })
            .then(r => {
                if (!r.ok) throw new Error(_("The plugin repository returned an error:") + " " + r.status + " " + r.statusText);
                return r.json().catch(() => {
                    throw new Error(_("The plugin repository returned an invalid response. Please try again later."));
                });
            }, () => {
                throw new Error(_("Cannot connect to the plugin repository. Check that this server has internet access and that the connection is not blocked by a firewall or proxy."));
            })
            .then(data => {
                if (!data || !Array.isArray(data.plugins)) throw new Error(_("The plugin repository returned an invalid response. Please try again later."));
                const plugins = data.plugins
                    .filter(p => p.id && this.downloadUrl(p))
                    .sort((a, b) => (a.name || "").localeCompare(b.name || ""));
                if (this._mounted) this.setState({plugins});
            })
            .catch(e => {
                if (this._mounted) this.setState({loadError: e.message});
            });
    }

    setStatus(label){
        if (this._mounted) this.setState({installingLabel: label});
    }

    handleInstall = (p, upgrade) => {
        if (this.state.installing) return;

        const errors = Object.assign({}, this.state.errors);
        delete errors[p.id];
        this.setState({installing: p.id, installingLabel: _("Downloading..."), errors, success: ""});

        fetch(absUrl(this.downloadUrl(p)))
            .then(r => {
                if (!r.ok) throw new Error(_("The plugin repository returned an error while downloading the plugin:") + " " + r.status + " " + r.statusText);
                return r.blob().catch(() => {
                    throw new Error(_("Cannot download the plugin. The connection to the plugin repository failed or was interrupted."));
                });
            }, () => {
                throw new Error(_("Cannot download the plugin. The connection to the plugin repository failed or was interrupted."));
            })
            .then(blob => {
                this.setStatus(_("Installing..."));

                const fd = new FormData();
                fd.append("file", blob, p.id + ".zip");
                const sha256 = this.downloadSha256(p);
                if (sha256) fd.append("sha256", sha256);
                if (upgrade) fd.append("upgrade", "1");
                fd.append("json", "1");

                return fetch(this.props.uploadUrl, {
                    method: "POST",
                    body: fd,
                    headers: { [csrf.header]: csrf.token },
                    credentials: "same-origin",
                    redirect: "manual"
                }).then(r => {
                    if (!r.ok) throw new Error(_("WebODM could not install the plugin:") + " " + r.status + " " + r.statusText);
                    return r.json().catch(() => {
                        throw new Error(_("WebODM could not install the plugin:") + " " + r.status + " " + r.statusText);
                    });
                }, () => {
                    throw new Error(_("Cannot send the plugin to WebODM. The connection was interrupted or the server is not responding."));
                });
            })
            .then(res => {
                if (!res.success) throw new Error(res.message);
                if (!this._mounted) return;

                const installed = Object.assign({}, this.state.installed);
                installed[p.id] = p.version;
                this.setState({installing: null, installed, changed: true, success: res.message});
                if (this.body) this.body.scrollTop = 0;
            })
            .catch(e => {
                if (!this._mounted) return;

                const errors = Object.assign({}, this.state.errors);
                errors[p.id] = e.message;
                this.setState({installing: null, errors});
            });
    }

    handleSearch = (e) => {
        this.setState({search: e.target.value});
    }

    renderList(){
        const { plugins, loadError, search, installed, installing, installingLabel, errors } = this.state;

        if (loadError) return (<ErrorMessage bind={[this, 'loadError']} closeable={false} />);
        if (!plugins) return (<div className="plugin-browser-message"><i className="fa fa-circle-notch fa-spin"></i></div>);

        const q = search.trim().toLowerCase();
        const shown = plugins.filter(p => !q || [p.name, p.description, p.author, p.id].join(" ").toLowerCase().indexOf(q) !== -1);
        if (!shown.length) return (<div className="plugin-browser-message text-muted">{_("No plugins found.")}</div>);

        return shown.map(p => {
            const isInstalled = installed[p.id] !== undefined;
            return (<PluginBrowserItem key={p.id}
                plugin={p}
                installed={isInstalled}
                upToDate={isInstalled && installed[p.id] === p.version}
                compatible={!p.webodmMinVersion || versionToInt(p.webodmMinVersion) <= versionToInt(this.props.webodmVersion)}
                installing={installing === p.id}
                installingLabel={installingLabel}
                disabled={installing !== null}
                error={errors[p.id]}
                onInstall={this.handleInstall} />);
        });
    }

    render(){
        return (
            <div ref={this.setModal} className="modal plugin-browser-dialog" tabIndex="-1" role="dialog">
              <div className="modal-dialog modal-lg" role="document">
                <div className="modal-content">
                  <div className="modal-header">
                    <button type="button" className="close" onClick={this.hide} aria-label={_("Close")}><span aria-hidden="true">&times;</span></button>
                    <h4 className="modal-title">{_("Install Plugins")}</h4>
                  </div>
                  <div className="modal-body" ref={this.setBody}>
                    {this.state.success ?
                        <div className="alert alert-success alert-dismissible">
                            <button type="button" className="close" onClick={() => this.setState({success: ""})}><span aria-hidden="true">&times;</span></button>
                            {this.state.success}
                        </div>
                    : ""}
                    {/* {this.state.plugins ?
                        <input type="search" className="form-control plugin-browser-search" placeholder={_("Search plugins")} value={this.state.search} onChange={this.handleSearch} />
                    : ""} */}
                    {this.renderList()}
                  </div>
                </div>
              </div>
            </div>
        );
    }
}

class PluginBrowser extends React.Component {
    static propTypes = {
        installed: PropTypes.object.isRequired,
        webodmVersion: PropTypes.string.isRequired,
        canBuild: PropTypes.bool.isRequired,
        uploadUrl: PropTypes.string.isRequired
    };

    constructor(props){
        super(props);

        this.state = {
            showDialog: false
        };
    }

    show = () => {
        this.setState({showDialog: true});
    }

    hide = () => {
        this.setState({showDialog: false});
    }

    render(){
        return [
            <button key="button" type="button" className="btn btn-sm btn-primary" onClick={this.show}>
                <i className="glyphicon glyphicon-download-alt"></i> {_("Install Plugins")}
            </button>,
            this.state.showDialog ?
                ReactDOM.createPortal(<PluginBrowserDialog key="dialog"
                    installed={this.props.installed}
                    webodmVersion={this.props.webodmVersion}
                    canBuild={this.props.canBuild}
                    uploadUrl={this.props.uploadUrl}
                    onHide={this.hide} />, document.body)
            : null
        ];
    }
}

$(function(){
    $("[data-plugin-browser]").each(function(){
        let props = $(this).data();
        delete(props.pluginBrowser);
        props.webodmVersion = String(props.webodmVersion);
        window.ReactDOM.render(<PluginBrowser {...props}/>, $(this).get(0));
    });
});

export default PluginBrowser;
