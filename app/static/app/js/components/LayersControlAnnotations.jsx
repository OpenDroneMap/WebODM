import React from 'react';
import PropTypes from 'prop-types';
import '../css/LayersControlAnnotations.scss';
import PluginsAPI from '../classes/plugins/API';
import { Checkbox, ExpandButton } from './Toggle';
import { _ } from '../classes/gettext';

class AnnotationLayer extends React.Component{
  static propTypes = {
    parent: PropTypes.object,
    layer: PropTypes.object
  }

  constructor(props){
    super(props);

    this.state = {
      visible: true // !!props.layer._map
    }
  }

  componentDidUpdate(prevProps, prevState){
    if (prevState.visible !== this.state.visible && this.props.parent.state.visible){
      PluginsAPI.Map.toggleAnnotation(this.props.layer, this.state.visible);
    }
  }

  componentDidMount(){
    PluginsAPI.Map.onUpdateAnnotation(this.handleUpdate);
  }

  componentWillUnmount(){
    PluginsAPI.Map.offUpdateAnnotation(this.handleUpdate);
  }

  handleUpdate = (layer, name) => {
    if (this.props.layer === layer){
      const meta = layer[Symbol.for("meta")];
      meta.name = name;
      this.forceUpdate();
    }
  }

  handleFocus = () => {
    const { layer } = this.props;
    if (!layer._map) return;

    if (layer.options.bounds || layer.getBounds){
      const bounds = layer.options.bounds !== undefined ? 
                     layer.options.bounds :
                     layer.getBounds();
      layer._map.fitBounds(bounds);
    }else if (layer._latlng){
      layer._map.setView(layer._latlng, 22);
    }

    // if (layer.getPopup()) layer.openPopup();
  }

  handleDelete = () => {
    if (window.confirm(_('Are you sure you want to delete this?'))){
      PluginsAPI.Map.deleteAnnotation(this.props.layer);
    }
  }

  render(){
    const { layer } = this.props;
    const meta = layer[Symbol.for("meta")];

    return (<div className="layers-control-layer layers-control-annotations">
      <div className="layer-control-title">
        <Checkbox bind={[this, 'visible']}/> <a className="layer-label" href="javascript:void(0)" onClick={this.handleFocus}><div className="annotation-name">{meta.name}</div></a> 
        <a className="layer-action" href="javascript:void(0)" onClick={this.handleDelete} title={_("Delete")}><i className="fa fa-trash"></i></a>
      </div>
    </div>);
  }
}

export default class LayersControlAnnotations extends React.Component {
  static defaultProps = {
    expanded: true,
    visible: true,
    layers: []
  };
  
  static propTypes = {
    expanded: PropTypes.bool,
    visible: PropTypes.bool,
    layers: PropTypes.array
  }

  constructor(props){
    super(props);

    let visible = false;
    for (let i = 0; i < props.layers.length; i++){
      if (props.layers[i]._map){
        visible = true;
        break;
      }
    }

    this.state = {
        visible,
        expanded: props.expanded
    };

    this.annRefs = new Array(props.layers.length);
  }

  handleAnnotationsClick = () => {
    this.setState({expanded: !this.state.expanded});
  }

  componentDidUpdate(prevProps, prevState){
    if (prevState.visible !== this.state.visible){
      this.annRefs.forEach(ann => {
        if (ann){
          let visible = this.state.visible ? ann.state.visible : false;
          PluginsAPI.Map.toggleAnnotation(ann.props.layer, visible);
        }
      });
    }
  }

  handleExportGeoJSON = e => {
    if (PluginsAPI.Map.downloadAnnotations("geojson")) return;
    else{
      // TODO?
    }
  }

  handleDelete = () => {
    if (window.confirm(_('Are you sure you want to delete this?'))){
      this.props.layers.forEach(layer => {
        PluginsAPI.Map.deleteAnnotation(layer);
      });
    }
  }


  render(){
    const { layers } = this.props;

    
    return (<div className="layers-control-layer">
        <div className="layer-control-title">
          <ExpandButton bind={[this, 'expanded']} /><Checkbox bind={[this, 'visible']} className="annotation-toggle" />
          <a title={_("Annotations")} className="layer-label" href="javascript:void(0);" onClick={this.handleAnnotationsClick}><div className="layer-title"><i className="layer-icon fa fa-sticky-note fa-fw"></i> {_("Annotations")}</div></a> 
          <a className="layer-action" href="javascript:void(0)" onClick={this.handleExportGeoJSON}><i title={_("Export to GeoJSON")} className="fa fa-download"></i></a>
          <a className="layer-action" href="javascript:void(0)" onClick={this.handleDelete}><i title={_("Delete")} className="fa fa-trash"></i></a>
        </div>

        <div className={"layer-expanded " + (!this.state.expanded ? "hide" : "")}>
          {layers.map((layer, i) => <AnnotationLayer parent={this} ref={domNode => this.annRefs[i] = domNode} key={i} layer={layer} />)}
        </div>
    </div>);

   }
}