import L from 'leaflet';
import ReactDOM from 'ReactDOM';
import React from 'React';
import PropTypes from 'prop-types';
import './ChangeDetection.scss';
import ChangeDetectionPanel from './ChangeDetectionPanel';

class ChangeDetectionButton extends React.Component {
  static propTypes = {
    tasks: PropTypes.object.isRequired,
    map: PropTypes.object.isRequired,
    alignSupported: PropTypes.bool.isRequired,
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
            className="leaflet-control-changedetection-button leaflet-bar-part theme-secondary"></a>
        <ChangeDetectionPanel map={this.props.map} isShowed={showPanel} alignSupported={this.props.alignSupported} tasks={this.props.tasks} onClose={this.handleClose} />
    </div>);
  }
}

export default L.Control.extend({
    options: {
        position: 'topright'
    },

    onAdd: function (map) {
        var container = L.DomUtil.create('div', 'leaflet-control-changedetection leaflet-bar leaflet-control');
        L.DomEvent.disableClickPropagation(container);
        ReactDOM.render(<ChangeDetectionButton map={this.options.map} alignSupported={this.options.alignSupported} tasks={this.options.tasks} />, container);

        return container;
    }
});
