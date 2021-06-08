import React from 'react';
import './Login.scss';
import ErrorMessage from 'webodm/components/ErrorMessage';
import PropTypes from 'prop-types';
import $ from 'jquery';
import { _ } from 'webodm/classes/gettext';

export default class Login extends React.Component {
  static defaultProps = {
  };
  static propTypes = {
    onLogin: PropTypes.func.isRequired
  }

  constructor(props){
    super(props);

    this.state = {
        error: "",
        loggingIn: false,
        email: "",
        password: ""
    }
  }

  handleEmailChange = (e) => {
    this.setState({email: e.target.value});
  }

  handlePasswordChange = (e) => {
      this.setState({password: e.target.value});
  }

  handleLogin = () => {
      this.setState({loggingIn: true});

      $.post("https://webodm.net/r/auth/login",
        {
          username: this.state.email,
          password: this.state.password
        }
      ).done(json => {
          if (json.api_key){
              this.saveApiKey(json.api_key, (err) => {
                this.setState({loggingIn: false});

                if (!err){
                    this.props.onLogin(json.api_key);
                }else{
                    this.setState({ error: err.message });
                }
              });
          }else if (json.message){
              this.setState({ loggingIn: false, error: json.message });
          }else{
              this.setState({ loggingIn: false, error: _("Cannot login. Invalid response:") + " " + JSON.stringify(json)});
          }
      })
      .fail(() => {
          this.setState({loggingIn: false, error: _("Cannot login. Please make sure you are connected to the internet, or try again in an hour.")});
      });
  }

  handleKeyPress = (e) => {
    if (e.key === 'Enter'){
        this.handleLogin();
    }
  }

  saveApiKey = (api_key, cb) => {
      $.post("save_api_key", {
          api_key: api_key
      }).done(json => {
        if (!json.success){
            cb(new Error(`Cannot save API key: ${JSON.stringify(json)}`));
        }else cb();
      }).fail(e => {
        cb(new Error(`Cannot save API key: ${JSON.stringify(e)}`));
      });
  }

  render(){
    return (<div className="lightning-login">
        <div className="row">
            <div className="col-md-6 col-md-offset-3 col-sm-12">
                <ErrorMessage bind={[this, "error"]} />
                <div className="form-group text-left">
                    <input id="next" name="next" type="hidden" value="" />
                    <p>
                        <label htmlFor="email">{_("E-mail Address")}</label> 
                        <input className="form-control" id="email" name="email" required="" 
                            type="text" value={this.state.email} 
                            onChange={this.handleEmailChange} 
                            onKeyPress={this.handleKeyPress} />
                    </p>
                    <p>
                        <label htmlFor="password">{_("Password")}</label> 
                        <input className="form-control" id="password" name="password" required="" 
                            type="password" value={this.state.password} 
                            onChange={this.handlePasswordChange} 
                            onKeyPress={this.handleKeyPress} />
                    </p>
                    <div style={{float: 'right'}} >
                        <a href="https://webodm.net/register" target="_blank">{_("Don't have an account?")}</a><br/>
                        <a href="https://webodm.net/reset" target="_blank">{_("Forgot password?")}</a>
                    </div>
                    <p><button className="btn btn-primary" onClick={this.handleLogin} disabled={this.state.loggingIn}>
                        {this.state.loggingIn ? 
                        <span><i className="fa fa-spin fa-circle-notch"></i></span> : 
                        <span><i className="fa fa-lock"></i> {_("Login and Sync")}</span>}
                    </button></p>
                </div>
            </div>
        </div>
    </div>);
  }
}