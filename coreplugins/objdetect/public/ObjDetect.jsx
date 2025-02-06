import L from 'leaflet';
import ReactDOM from 'ReactDOM';
import React from 'React';
import PropTypes from 'prop-types';
import './ObjDetect.scss';
import ObjDetectPanel from './ObjDetectPanel';

class ObjDetectButton extends React.Component {
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
  }

  handleClose = () => {
    this.setState({showPanel: false});
  }

  render(){
    const { showPanel } = this.state;

    return (<div className={showPanel ? "open" : ""}>
        <a href="javascript:void(0);" 
            onClick={this.handleOpen} 
            className="leaflet-control-objdetect-button leaflet-bar-part theme-secondary"></a>
        <ObjDetectPanel map={this.props.map} isShowed={showPanel} tasks={this.props.tasks} onClose={this.handleClose} />
    </div>);
  }
}

export default L.Control.extend({
    options: {
        position: 'topright'
    },

    onAdd: function (map) {
        var container = L.DomUtil.create('div', 'leaflet-control-objdetect leaflet-bar leaflet-control');
        L.DomEvent.disableClickPropagation(container);
        ReactDOM.render(<ObjDetectButton map={this.options.map} tasks={this.options.tasks} />, container);

        return container;
    }
});

