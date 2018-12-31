import React from 'react';
import './CostEstimateItem.scss';
import PropTypes from 'prop-types';
import $ from 'jquery';

export default class CostEstimateItem extends React.Component {
  static defaultProps = {
  };
  static propTypes = {
  }

  constructor(props){
    super(props);

    this.state = {
    }
  }

  render(){
    return (
        <div className="lightning-cost-estimate-item">
            <label className="col-sm-2 control-label">Credits Required</label>
            <div className="col-sm-10 num-credits">
            {this.props.taskInfo.name}
            </div>
        </div>
    );
  }
}