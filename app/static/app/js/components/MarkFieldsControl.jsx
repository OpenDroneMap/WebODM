import React from 'react';
import ReactDOM from 'react-dom';
import L from 'leaflet';

import PropTypes from 'prop-types';
import '../css/MarkFieldsControl.scss';
import MarkFieldsPanel from './MarkFieldsPanel';


class MarkFieldslButton extends React.Component {
  static propTypes = {
    map: PropTypes.object.isRequired,
    task_id: PropTypes.string.isRequired,
    project_id: PropTypes.number.isRequired
  }

  constructor(props) {
    super(props);

    this.state = {
      showPanel: false
    };
    this.onTogglePopup = this.props.onTogglePopup;
  }

  handleOpen = () => {
    this.setState({ showPanel: true });
    this.onTogglePopup("markfields");
  }

  handleClose = () => {
    this.setState({ showPanel: false });
  }

  componentDidUpdate = (prevProps) => {
    if (prevProps.openPopup !== this.props.openPopup) {
      if (this.props.openPopup !== "markfields") {
        this.handleClose();
      }
    }
  }

  render() {
    const { showPanel } = this.state;

    return (
      <><a href="javascript:void(0);"
          title="Marcar talhões"
          onClick={this.handleOpen}
          className="leaflet-control-markFields-control-button leaflet-bar-part theme-secondary">
          <i class="fas fa-draw-polygon fixIcon" ></i>
        </a>
        <div className={showPanel ? "open popright" : ""}>
        
        <MarkFieldsPanel map={this.props.map} task_id={this.props.task_id} showPanel={this.state.showPanel} project_id={this.props.project_id} onOpen={this.handleOpen} onClose={this.handleClose} />
      </div>
      </>
    );
  }
}

export default L.Control.extend({
  options: {
    position: 'topright',
    task_id: 'erro',
    project_id: -1
  },

  onAdd: function (map) {
    this.container = L.DomUtil.create('div', 'leaflet-control-markFields-control leaflet-bar leaflet-control');
    this.map = map;

    L.DomEvent.disableClickPropagation(this.container);
    this.update(this.options.openPopup);

    return this.container;
  },

  update: function (openPopup) {
    ReactDOM.render(<MarkFieldslButton
      map={this.map}
      project_id={this.options.project_id}
      task_id={this.options.task_id}
      openPopup={openPopup}
      onTogglePopup={this.options.onTogglePopup} />, this.container);
  }
});

