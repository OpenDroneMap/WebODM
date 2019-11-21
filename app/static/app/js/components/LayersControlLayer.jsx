import React from 'react';
import PropTypes from 'prop-types';
import '../css/LayersControlLayer.scss';
import Histogram from './Histogram';
import { Checkbox, ExpandButton } from './Toggle';

export default class LayersControlLayer extends React.Component {
  static defaultProps = {
      layer: null,
      expanded: false
  };
  static propTypes = {
    layer: PropTypes.object.isRequired,
    expanded: PropTypes.bool
  }

  constructor(props){
    super(props);

    this.state = {
        visible: true,
        expanded: props.expanded
    };

    this.map = props.layer._map;
  }

  componentDidUpdate(prevProps, prevState){
    const { layer } = this.props;

    if (prevState.visible !== this.state.visible){
        if (this.state.visible){
            layer.addTo(this.map);
        }else{
            this.map.removeLayer(layer);
        }
    }
  }

  handleLayerClick = () => {
    this.map.fitBounds(this.props.layer.options.bounds);
    this.props.layer.openPopup();
  }

  render(){
    const { layer } = this.props;

    const tmeta = layer[Symbol.for("tile-meta")];
    const meta = layer[Symbol.for("meta")];
    console.log(tmeta);
            
    return (<div className="layers-control-layer">
        <ExpandButton bind={[this, 'expanded']} /><Checkbox bind={[this, 'visible']}/> 
        <a className="layer-label" href="javascript:void(0);" onClick={this.handleLayerClick}>{meta.name}</a>

        {this.state.expanded ? 
        <div className="layer-expanded">
            <Histogram width={280} statistics={tmeta.statistics} colorMap={tmeta.color_map}/>
        </div>
        : ""}
    </div>);
                
  }
}