import React from 'react';
import PropTypes from 'prop-types';
import '../css/LayersControlPanel.scss';
import LayersControlLayer from './LayersControlLayer';
import LayersControlAnnotations from './LayersControlAnnotations';
import { _ } from '../classes/gettext';
import L from 'leaflet';

export default class LayersControlPanel extends React.Component {
  static defaultProps = {
      layers: [],
      overlays: [],
      annotations: [],
  };
  static propTypes = {
    onClose: PropTypes.func.isRequired,
    layers: PropTypes.array.isRequired,
    overlays: PropTypes.array,
    annotations: PropTypes.array,
    map: PropTypes.object.isRequired
  }

  constructor(props){
    super(props);
  }

  componentDidMount(){
    L.DomEvent.on(this.domNode, 'mousewheel', L.DomEvent.stopPropagation);
  }

  componentWillUnmount(){
    L.DomEvent.off(this.domNode, 'mousewheel', L.DomEvent.stopPropagation);
  }

  render(){
    let content = "";

    if (!this.props.layers.length) content = (<span><i className="loading fa fa-circle-notch fa-spin"></i> {_("Loading…")}</span>);
    else{
      // Check for grouping
      const groups = {};
      const main = {
        overlays: [],
        layers: [],
        annotations: []
      };
      const zIndexGroupMap = {};

      const scanGroup = destination => {
        return l => {
          const meta = l[Symbol.for("meta")];
          if (meta.task && meta.task.id) zIndexGroupMap[meta.task.id] = meta.zIndexGroup || 1;

          const group = meta.group;
          if (group){
            groups[group.id] = groups[group.id] || {
              overlays: [],
              layers: [],
              annotations: [],
              name: group.name
            };
            groups[group.id][destination].push(l);
          }else{
            main[destination].push(l);
          }
        };
      };
      this.props.overlays.forEach(scanGroup('overlays'));
      this.props.layers.forEach(scanGroup('layers'));
      this.props.annotations.forEach(scanGroup('annotations'));

      const getGroupContent = group => {
        return (<div>

          {group.annotations.length ? 
            <div className="annotations theme-border-primary">
               <LayersControlAnnotations layers={group.annotations} />
            </div>
          : ""}

          {group.overlays.length ? 
              <div className="overlays theme-border-primary">
                  {group.overlays.map((layer, i) => <LayersControlLayer map={this.props.map} expanded={false} overlay={true} layer={layer} key={i} />)}
              </div>
          : ""}
          {group.layers.sort((a, b) => {
              const m_a = a[Symbol.for("meta")] || {};
              const m_b = b[Symbol.for("meta")] || {};
              return m_a.type > m_b.type ? -1 : 1;
          }).map((layer, i) => <LayersControlLayer map={this.props.map} 
                                                  expanded={(layer[Symbol.for("meta")] || {}).autoExpand || false} 
                                                  overlay={false} 
                                                  layer={layer} 
                                                  key={`${i}-${(layer[Symbol.for("meta")] || {}).type}`} 
                                                  separator={i < group.layers.length - 1} 
                                                />)}
        </div>);
      };

      content = (<div>{getGroupContent(main)}
        {Object.keys(groups).sort((a, b) => {
          const za = zIndexGroupMap[a] || 1;
          const zb = zIndexGroupMap[b] || 1;
          return za > zb ? -1 : 1;
        }).map(id => {
          return (<div key={id}>
            <div className="layer-group-title" title={groups[id].name}>{groups[id].name}</div>
            {getGroupContent(groups[id])}
          </div>)
        })}
      </div>);
    }

    return (<div className="layers-control-panel" ref={(domNode) => this.domNode = domNode}>
      <span className="close-button" onClick={this.props.onClose}/>
      <div className="title">{_("Layers")}</div>
      <hr/>
      {content}
    </div>);
  }
}
