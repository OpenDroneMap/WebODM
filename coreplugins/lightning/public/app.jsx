import React from 'react';
import PropTypes from 'prop-types';
import Login from './Login';
import Dashboard from './Dashboard';
import { _ } from 'webodm/classes/gettext';
import Trans from 'webodm/components/Trans';

export default class LightningPanel extends React.Component {
  static defaultProps = {
    apiKey: "", 
  };
  static propTypes = {
    apiKey: PropTypes.string
  }

  constructor(props){
    super(props);


    this.state = {
      apiKey: props.apiKey
    }
  }

  handleLogin = (apiKey) => {
    this.setState({ apiKey });
  }

  handleLogout = () => {
      this.setState({ apiKey: ""});
  }

  render(){
    const { apiKey } = this.state;

    return (<div className="plugin-lightning">
        { !apiKey ? 
        <div>
            <h4><i className="fa fa-bolt"/> {_("Lightning Network")}</h4>
            {_("Lightning is a service that allows you to quickly process small and large datasets using high performance servers in the cloud.")}
            <Trans params={{ link: '<a href="https://webodm.net" target="_blank">webodm.net</a>', register: `<a href="https://webodm.net/register" target="_blank">${_("register")}</a>`}}>
            {_("Below you can enter your %(link)s credentials to sync your account and automatically setup a new processing node. If you don't have an account, you can %(register)s for free.")}</Trans>
            <Login onLogin={this.handleLogin} />
        </div> : 
        <div>
            <Dashboard apiKey={apiKey} onLogout={this.handleLogout} />
        </div>}
    </div>);
  }
}