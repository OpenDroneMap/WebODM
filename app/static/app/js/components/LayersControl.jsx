import React from 'react';
import ReactDOM from 'react-dom';
import L from 'leaflet';
import PropTypes from 'prop-types';
import '../css/LayersControl.scss';
import LayersControlPanel from './LayersControlPanel';

class LayersControlButton extends React.Component {
  static propTypes = {
    layers: PropTypes.array.isRequired,
    overlays: PropTypes.array.isRequired,
    map: PropTypes.object.isRequired
  }

  constructor(props) {
    super(props);

    this.state = {
      showPanel: false
    };

    this.handleOpen = this.handleOpen.bind(this);
    this.handleClose = this.handleClose.bind(this);

    this.onTogglePopup = this.props.onTogglePopup;
  }

  handleOpen = () => {

    this.setState({ showPanel: true });
    this.onTogglePopup("layers");
  }

  handleClose = () => {
    this.setState({ showPanel: false });
  }

  componentDidUpdate = (prevProps) => {

    if (prevProps.openPopup !== this.props.openPopup) {

      if (this.props.openPopup !== "layers") {
        this.handleClose();
      }
    }
  }

  render() {
    const { showPanel } = this.state;

    return (
      <>
      <a href="javascript:void(0);"
        title="Camadas"
        onClick={this.handleOpen}
        className="leaflet-control-layers-control-button leaflet-bar-part theme-secondary"></a>
        <div className={showPanel ? "open layer-container popright" : "layer-container"}>
       <LayersControlPanel map={this.props.map} layers={this.props.layers} overlays={this.props.overlays} onClose={this.handleClose} />
      
    </div>
      </>
    );
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
    this.update(this.options.layers, [], this.options.openPopup, this.options.onTogglePopup);

    return this.container;
  },

  update: function (layers, overlays, openPopup, onTogglePopup ) {
    ReactDOM.render(<LayersControlButton map={this.map} layers={layers} overlays={overlays} openPopup={openPopup} onTogglePopup={onTogglePopup} />, this.container);
  }
});

