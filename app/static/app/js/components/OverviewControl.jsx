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
        loadGeoJsonDetections: PropTypes.func,
        overlays: PropTypes.array.isRequired,
        tiles: PropTypes.array
    }

    constructor(props) {
        super(props);

        this.state = {
            showPanel: false
        };
    }

    handleOpen = () => {
        this.setState({ showPanel: true });
        this.props.onTogglePopup("overview");
    }

    handleClose = () => {
        this.setState({ showPanel: false });
    }

    componentDidUpdate = (prevProps) => {
        if (prevProps.openPopup !== this.props.openPopup) {

            if (this.props.openPopup !== "overview") {
                this.handleClose();
            }
        }
    }


    render() {

        const { showPanel } = this.state;

        return (
            <div className={showPanel ? "open" : ""}>
                <a href="javascript:void(0);"
                    title="Visão geral"
                    onClick={this.handleOpen}
                    className="leaflet-control-overview-control-button leaflet-bar-part theme-secondary"></a>
                <OverviewControlPanel
                    tiles={this.props.tiles}
                    onClose={this.handleClose}
                    selectedLayers={this.props.selectedLayers}
                    removeGeoJsonDetections={this.props.removeGeoJsonDetections}
                    loadGeoJsonDetections={this.props.loadGeoJsonDetections}
                    overlays={this.props.overlays} />
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
            this.options.tiles,
            this.options.overlays,
            this.options.openPopup,
            this.options.onTogglePopup);

        return this.container;
    },

    update: function (selectedLayers, removeGeoJsonDetections, loadGeoJsonDetections, tiles, overlays, openPopup, onTogglePopup) {
        ReactDOM.render(<OverviewControl
            map={this.map}
            selectedLayers={selectedLayers}
            removeGeoJsonDetections={removeGeoJsonDetections}
            loadGeoJsonDetections={loadGeoJsonDetections}
            tiles={tiles}
            overlays={overlays} 
            openPopup={openPopup}
            onTogglePopup={onTogglePopup}/>,
            this.container);
    },

    updateSelectedLayers: function (selectedLayers, overlays) {
        this.update(selectedLayers,
            this.options.removeGeoJsonDetections,
            this.options.loadGeoJsonDetections,
            this.options.tiles,
            overlays,
            this.options.openPopup,
            this.options.onTogglePopup);
    },

    updateOverlays: function (overlays, selectedLayers) {
        this.update(selectedLayers,
            this.options.removeGeoJsonDetections,
            this.options.loadGeoJsonDetections,
            this.options.tiles,
            overlays,
            this.options.openPopup,
            this.options.onTogglePopup);
    },

    updateOpenPopup: function (openPopup, onTogglePopup, overlays, selectedLayers) {
        this.update(selectedLayers,
            this.options.removeGeoJsonDetections,
            this.options.loadGeoJsonDetections,
            this.options.tiles,
            overlays,
            openPopup,
            onTogglePopup
        )
    }
});