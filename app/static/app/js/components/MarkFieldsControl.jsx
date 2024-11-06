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
    console.log(this.props.task_id);

    return (<div className={showPanel ? "open" : ""}>
              <a href="javascript:void(0);" 
                  title="Mark Fields"
                  onClick={this.handleOpen} 
                  className="leaflet-control-markFields-control-button leaflet-bar-part theme-secondary">
              </a>
              <MarkFieldsPanel map={this.props.map} task_id={this.props.task_id}  project_id={this.props.project_id} onClose={this.handleClose} />
            </div>);
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
        this.update();

        return this.container;
    },

    update: function(){
        ReactDOM.render(<MarkFieldslButton map={this.map} project_id={this.options.project_id} task_id={this.options.task_id}/>, this.container);
    }
});

