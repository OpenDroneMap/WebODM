import React from 'react';
import './css/ModelView.scss';

class ModelView extends React.Component {
  static defaultProps = {
    test: 0
  };

  static propTypes = {
      test: React.PropTypes.number
  };

  constructor(props){
    super(props);

    this.state = {
    };
  }

  render(){

    return (<div className="model-view">
      SUP
      </div>);
  }
}

export default ModelView;
