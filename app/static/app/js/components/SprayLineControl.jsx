import React from 'react';
import ReactDOM from 'react-dom';
import L from 'leaflet';
import PropTypes from 'prop-types';
import '../css/SprayLineControl.scss';
import SprayLineControlPanel from './SprayLineControPanel';


class SprayLineControl extends React.Component {
    static propTypes = {
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


    render() {
        
        const { showPanel } = this.state;
        
        return (
            <div className={showPanel ? "open" : ""}>
                <a href="javascript:void(0);" 
                title="Pulverizar"
                onClick={this.handleOpen} 
                className="leaflet-control-sprayline-control-button leaflet-bar-part theme-secondary"></a>
                <SprayLineControlPanel
                    onClose={this.handleClose}
                    selectedLayers={this.props.selectedLayers}
                    overlays={this.props.overlays}/>
            </div>);
        
    }
}


export default L.Control.extend({
    options: {
        position: 'topright'
    },

    onAdd: function (map) {
        this.container = L.DomUtil.create('div', 'leaflet-control-sprayline-control leaflet-bar leaflet-control');
        this.map = map;

        L.DomEvent.disableClickPropagation(this.container);

        this.update(this.options.selectedLayers, 
                    this.options.removeGeoJsonDetections, 
                    this.options.loadGeoJsonDetections,
                    this.options.tiles,
                    this.options.overlays);

        return this.container;
    },

    update: function(selectedLayers, removeGeoJsonDetections, loadGeoJsonDetections, tiles, overlays){
        
        ReactDOM.render(<SprayLineControl 
                            map={this.map} 
                            selectedLayers={selectedLayers} 
                            removeGeoJsonDetections={removeGeoJsonDetections}
                            loadGeoJsonDetections={loadGeoJsonDetections}
                            tiles={tiles}
                            overlays={overlays}/>, 
                            this.container);
    },

    updateSelectedLayers: function(selectedLayers, overlays) {
        this.update(selectedLayers,
                    this.options.removeGeoJsonDetections, 
                    this.options.loadGeoJsonDetections,
                    this.options.tiles,
                    overlays)
    },

    updateOverlays: function(overlays, selectedLayers) {
        this.update(selectedLayers,
                    this.options.removeGeoJsonDetections, 
                    this.options.loadGeoJsonDetections,
                    this.options.tiles,
                    overlays)
    }
});