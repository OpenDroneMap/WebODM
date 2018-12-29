import React from 'react';
import PropTypes from 'prop-types';
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
    return (<div className="plugin-lightning panel">
     Hey YO! { this.props.apiKey }
    </div>);
  }
}