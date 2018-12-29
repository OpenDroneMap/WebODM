import React from 'react';
import PropTypes from 'prop-types';
import Login from './Login';
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

  }

  render(){
    return (<div className="plugin-lightning">
    <h4><i className="fa fa-bolt"/> Lightning Network</h4>

    Lightning is a service that allows you to quickly process small and large datasets using high performance servers in the cloud. 
    Below you can enter your <a href="https://webodm.net" target="_blank">webodm.net</a> credentials to sync your account and automatically setup a new processing node. If you don't have an account, you can <a href="https://webodm.net/register" target="_blank">register</a> for free.

     <Login />
    </div>);
  }
}