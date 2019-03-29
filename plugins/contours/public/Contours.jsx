import L from 'leaflet';
import ReactDOM from 'ReactDOM';
import React from 'react';
import './Contours.scss';
import ContoursPanel from './ContoursPanel';

class ContoursButton extends React.Component {
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
            className="leaflet-control-contours-button leaflet-bar-part theme-secondary"></a>
        <ContoursPanel onClose={this.handleClose} />
    </div>);
  }
}

export default L.Control.extend({
    options: {
        position: 'topright'
    },

    onAdd: function (map) {
        var container = L.DomUtil.create('div', 'leaflet-control-contours leaflet-bar leaflet-control');
        L.DomEvent.disableClickPropagation(container);
        ReactDOM.render(<ContoursButton />, container);

        // this._map = map;
        return container;
    }
});

