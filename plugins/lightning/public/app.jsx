import React from 'react';
import PropTypes from 'prop-types';
import Login from './Login';
import Dashboard from './Dashboard';
import $ from 'jquery';

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
            <h4><i className="fa fa-bolt"/> Lightning Network</h4>
            Lightning is a service that allows you to quickly process small and large datasets using high performance servers in the cloud. 
            Below you can enter your <a href="https://webodm.net" target="_blank">webodm.net</a> credentials to sync your account and automatically setup a new processing node. If you don't have an account, you can <a href="https://webodm.net/register" target="_blank">register</a> for free.
            <Login onLogin={this.handleLogin} />
        </div> : 
        <div>
            <Dashboard apiKey={apiKey} onLogout={this.handleLogout} />
        </div>}
    </div>);
  }
}