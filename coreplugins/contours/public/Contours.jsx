import L from 'leaflet';
import ReactDOM from 'ReactDOM';
import React from 'React';
import PropTypes from 'prop-types';
import './Contours.scss';
import ContoursPanel from './ContoursPanel';

class ContoursButton extends React.Component {
  static propTypes = {
    tasks: PropTypes.object.isRequired,
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
    this.props.onTogglePopup("contours");
  }

  handleClose = () => {
    this.setState({showPanel: false});
  }

  componentDidUpdate = (prevProps) => {

    if (prevProps.openPopup !== this.props.openPopup) {

        if (this.props.openPopup !== "contours") {
            this.handleClose();
        }
    }
}

  render(){
    const { showPanel } = this.state;

    return (<div className={showPanel ? "open" : ""}>
        <a href="javascript:void(0);" 
            onClick={this.handleOpen} 
            className="leaflet-control-contours-button leaflet-bar-part theme-secondary"
            title="Contornos"></a>
        <ContoursPanel map={this.props.map} isShowed={showPanel} tasks={this.props.tasks} onClose={this.handleClose} />
    </div>);
  }
}

export default L.Control.extend({
    options: {
        position: 'topright'
    },

    onAdd: function (map) {

        this.container = L.DomUtil.create('div', 'leaflet-control-contours leaflet-bar leaflet-control');
        L.DomEvent.disableClickPropagation(this.container);

        this.map = map;

        this.update(this.options.openPopup, this.options.onTogglePopup)
        

        return this.container;
    },

    update: function( openPopup, onTogglePopup ) {
      ReactDOM.render(<ContoursButton map={this.options.map} tasks={this.options.tasks} openPopup={openPopup} onTogglePopup={onTogglePopup} />, this.container);
  }
});

