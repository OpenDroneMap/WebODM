import React from 'react';
import PropTypes from 'prop-types';
import '../css/LayersControlAnnotations.scss';
import { Checkbox, ExpandButton } from './Toggle';
import { _ } from '../classes/gettext';

class AnnotationLayer extends React.Component{
  static propTypes = {
    layer: PropTypes.object
  }

  constructor(props){
    super(props);

    this.state = {
      visible: true
    }
  }

  handleFocus = () => {
    const { layer } = this.props;
    if (layer.options.bounds || layer.getBounds){
      const bounds = layer.options.bounds !== undefined ? 
                     layer.options.bounds :
                     layer.getBounds();
      layer._map.fitBounds(bounds);
    }else if (layer._latlng){
      layer._map.setView(layer._latlng, 22);
    }

    if (layer.getPopup()) layer.openPopup();
  }

  handleDelete = () => {

  }

  render(){
    const { layer } = this.props;
    const meta = layer[Symbol.for("meta")];

    return (<div className="layers-control-layer layers-control-annotations">
      <div className="layer-control-title">
        <Checkbox bind={[this, 'visible']}/> <a className="layer-label" href="javascript:void(0)" onClick={this.handleFocus}><div className="annotation-name">{meta.name}</div></a> <a href="javascript:void(0)" onClick={this.handleDelete}><i className="fa fa-trash"></i></a>
      </div>
    </div>);
  }
}

export default class LayersControlAnnotations extends React.Component {
  static defaultProps = {
    expanded: true,
    visible: true

};
  static propTypes = {
    expanded: PropTypes.bool,
    visible: PropTypes.bool,
    layers: PropTypes.array
}

  constructor(props){
    super(props);

    this.state = {
        visible: props.visible,
        expanded: props.expanded
    };
  }


  handleLayerClick = () => {
    console.log("TODO")
  }


  render(){
    const { layers } = this.props;

    
    return (<div className="layers-control-layer">
        <div className="layer-control-title">
          <ExpandButton bind={[this, 'expanded']} /><Checkbox bind={[this, 'visible']}/>
          <a title={_("Annotations")} className="layer-label" href="javascript:void(0);" onClick={this.handleLayerClick}><div className="layer-title"><i className="layer-icon fa fa-sticky-note fa-fw"></i> {_("Annotations")}</div></a>
        </div>

        {this.state.expanded ? 
        <div className="layer-expanded">
          {layers.map((layer, i) => <AnnotationLayer key={i} layer={layer} />)}
        </div> : ""}
    </div>);

   }
}