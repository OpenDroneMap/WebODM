import React from 'react';
import ReactDOM from 'react-dom';
import L from 'leaflet';
import PropTypes from 'prop-types';
import '../css/OverviewControl.scss';
import OverviewControlPanel from './OverviewControlPanel';


class OverviewControl extends React.Component {
    static propTypes = {
        selectedLayers: PropTypes.array.isRequired,
        removeGeoJsonDetections: PropTypes.func,
        loadGeoJsonDetections: PropTypes.func
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

    updateSelectedLayers(selectedLayers) {
        this.options.selectedLayers = selectedLayers;
        this.update(selectedLayers);
    }


    render() {
        
        const { showPanel } = this.state;
        
        return (
            <div className={showPanel ? "open" : ""}>
                <a href="javascript:void(0);" 
                title="Overview"
                onClick={this.handleOpen} 
                className="leaflet-control-overview-control-button leaflet-bar-part theme-secondary"></a>
                <OverviewControlPanel 
                    tiles={this.props.tiles}
                    onClose={this.handleClose} 
                    selectedLayers={this.props.selectedLayers} 
                    removeGeoJsonDetections={this.props.removeGeoJsonDetections}
                    loadGeoJsonDetections={this.props.loadGeoJsonDetections}/>
            </div>);
        
    }
}


export default L.Control.extend({
    options: {
        position: 'topright'
    },

    onAdd: function (map) {
        this.container = L.DomUtil.create('div', 'leaflet-control-overview-control leaflet-bar leaflet-control');
        this.map = map;

        L.DomEvent.disableClickPropagation(this.container);

        this.update(this.options.selectedLayers, 
                    this.options.removeGeoJsonDetections, 
                    this.options.loadGeoJsonDetections,
                    this.options.tiles);

        return this.container;
    },

    update: function(selectedLayers, removeGeoJsonDetections, loadGeoJsonDetections, tiles ){
        ReactDOM.render(<OverviewControl 
                            map={this.map} 
                            selectedLayers={selectedLayers} 
                            removeGeoJsonDetections={removeGeoJsonDetections}
                            loadGeoJsonDetections={loadGeoJsonDetections}
                            tiles={tiles}/>, 
                            this.container);
    }
});