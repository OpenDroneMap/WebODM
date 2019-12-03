import React from 'react';
import PropTypes from 'prop-types';
import '../css/LayersControlPanel.scss';
import LayersControlLayer from './LayersControlLayer';

export default class LayersControlPanel extends React.Component {
  static defaultProps = {
      layers: [],
      overlays: [],
  };
  static propTypes = {
    onClose: PropTypes.func.isRequired,
    layers: PropTypes.array.isRequired,
    overlays: PropTypes.array,
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
        {this.props.overlays.length ? 
            <div className="overlays theme-border-primary">
                {this.props.overlays.map((layer, i) => <LayersControlLayer map={this.props.map} expanded={false} overlay={true} layer={layer} key={i} />)}
            </div>
        : ""}
        {this.props.layers.sort((a, b) => {
            const m_a = a[Symbol.for("meta")] || {};
            const m_b = b[Symbol.for("meta")] || {};
            return m_a.name > m_b.name ? -1 : 1;
        }).map((layer, i) => <LayersControlLayer map={this.props.map} expanded={this.props.layers.length === 1} overlay={false} layer={layer} key={i} />)}
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