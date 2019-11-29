import React from 'react';
import PropTypes from 'prop-types';
import '../css/LayersControlPanel.scss';
import LayersControlLayer from './LayersControlLayer';

export default class LayersControlPanel extends React.Component {
  static defaultProps = {
      layers: []
  };
  static propTypes = {
    onClose: PropTypes.func.isRequired,
    layers: PropTypes.array.isRequired,
    map: PropTypes.object.isRequired
  }

  constructor(props){
    super(props);

  }

  render(){
    let content = "";
    if (!this.props.layers.length) content = (<span><i className="loading fa fa-circle-notch fa-spin"></i> Loading...</span>);
    else{
      content = (<div>
        {this.props.layers.map((layer, i) => <LayersControlLayer expanded={this.props.layers.length == 1} layer={layer} key={i} />)}
      </div>);
    }

    return (<div className="layers-control-panel">
      <span className="close-button" onClick={this.props.onClose}/>
      <div className="title">Layers</div>
      <hr/>
      {content}
    </div>);
  }
}