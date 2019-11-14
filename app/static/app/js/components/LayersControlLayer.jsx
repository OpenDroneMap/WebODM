import React from 'react';
import PropTypes from 'prop-types';
import '../css/LayersControlLayer.scss';
import Histogram from './Histogram';
import { Checkbox, ExpandButton } from './Toggle';

export default class LayersControlLayer extends React.Component {
  static defaultProps = {
      layer: null
  };
  static propTypes = {
    layer: PropTypes.object.isRequired
  }

  constructor(props){
    super(props);

    this.state = {
        visible: true,
        expanded: false
    };
  }

  render(){
    const { layer } = this.props;

    const tmeta = layer[Symbol.for("tile-meta")];
    const meta = layer[Symbol.for("meta")];
            
    return (<div className="layers-control-layer">
        <ExpandButton bind={[this, 'expanded']} /><Checkbox bind={[this, 'visible']}/> <a className="layer-label" href="javascript:void(0);" onClick={this.handleLayerClick}>{meta.name}</a>
        {JSON.stringify(tmeta)}

        {this.state.expanded ? 
            <Histogram />
        : ""}
    </div>);
                
  }
}