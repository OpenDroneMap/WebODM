import React from 'react';
import ReactDOM from 'ReactDOM';
import L from 'leaflet';
import PropTypes from 'prop-types';
import '../css/LayersControl.scss';
import LayersControlPanel from './LayersControlPanel';

class LayersControlButton extends React.Component {
  static propTypes = {
    layers: PropTypes.array.isRequired,
    overlays: PropTypes.array.isRequired,
    annotations: PropTypes.array.isRequired,
    map: PropTypes.object.isRequired
  }

  constructor(props){
    super(props);

    this.state = {
        showPanel: false
    };
  }

  handleOpen = () => {
    this.setState({showPanel: true});
  }

  handleClose = () => {
    this.setState({showPanel: false});
  }

  render(){
    const { showPanel } = this.state;

    return (<div className={showPanel ? "open" : ""}>
        <a href="javascript:void(0);" 
            title="Layers"
            onClick={this.handleOpen} 
            className="leaflet-control-layers-control-button leaflet-bar-part theme-secondary"></a>
        <LayersControlPanel map={this.props.map} layers={this.props.layers} overlays={this.props.overlays} annotations={this.props.annotations} onClose={this.handleClose} />
    </div>);
  }
}

export default L.Control.extend({
    options: {
        position: 'topright'
    },

    onAdd: function (map) {
        this.container = L.DomUtil.create('div', 'leaflet-control-layers-control leaflet-bar leaflet-control');
        this.map = map;

        L.DomEvent.disableClickPropagation(this.container);
        this.update(this.options.layers, [], []);

        return this.container;
    },

    update: function(layers, overlays, annotations){
        ReactDOM.render(<LayersControlButton ref={r => this.layersControlButton = r} map={this.map} layers={layers} overlays={overlays} annotations={annotations} />, this.container);
    }
});

