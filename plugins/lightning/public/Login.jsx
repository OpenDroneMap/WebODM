import React from 'react';
import './Login.scss';
import PropTypes from 'prop-types';
import $ from 'jquery';

export default class Login extends React.Component {
  static defaultProps = {
  };
  static propTypes = {
  }

  constructor(props){
    super(props);

  }

  render(){
    return (<div className="lightning-login">
        <div className="row">
            <div className="col-md-6 col-md-offset-3 col-sm-12">
                <div className="form-group text-left">
                    <input id="next" name="next" type="hidden" value="" />
                    <p>
                        <label htmlFor="email">Email Address</label> <input className="form-control" id="email" name="email" required="" type="text" value="" />
                    </p>
                    <p>
                        <label htmlFor="password">Password</label> <input className="form-control" id="password" name="password" required="" type="password" value="" />
                    </p>
                    <div style={{float: 'right'}} >
                        <a href="https://webodm.net/register" target="_blank">Don't have an account?</a><br/>
                        <a href="https://webodm.net/reset" target="_blank">Forgot password?</a>
                    </div>
                    <p><button className="btn btn-primary"><i className="fa fa-lock"></i> Login and Sync</button></p>
                </div>
            </div>
        </div>
    </div>);
  }
}