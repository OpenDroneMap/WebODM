import React from 'react';
import ReactDOM from 'react-dom';
import L from 'leaflet';
import PropTypes from 'prop-types';
import '../css/SprayLineControl.scss';
import SprayLineControlPanel from './SprayLineControPanel';


class SprayLineControl extends React.Component {
    static propTypes = {
    }

    constructor(props) {
        super(props);


        this.state = {
            showPanel: false
        };
    }

    handleOpen = () => {
        this.setState({ showPanel: true });
        this.props.onTogglePopup("sprayline");
    }

    handleClose = () => {
        this.setState({ showPanel: false });
    }

    componentDidUpdate = (prevProps) => {

        if (prevProps.openPopup !== this.props.openPopup) {

            if (this.props.openPopup !== "sprayline") {
                this.handleClose();
            }
        }
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
                    overlays={this.props.overlays}
                    tiles={this.props.tiles} />
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

    update: function (selectedLayers, removeGeoJsonDetections, loadGeoJsonDetections, tiles, overlays, openPopup, onTogglePopup) {

        ReactDOM.render(<SprayLineControl
            map={this.map}
            selectedLayers={selectedLayers}
            removeGeoJsonDetections={removeGeoJsonDetections}
            loadGeoJsonDetections={loadGeoJsonDetections}
            tiles={tiles}
            overlays={overlays}
            openPopup={openPopup}
            onTogglePopup={onTogglePopup} />,
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
            this.options.onTogglePopup)
    },

    updateOpenPopup: function (openPopup, onTogglePopup) {
        this.update(this.options.selectedLayers,
            this.options.removeGeoJsonDetections,
            this.options.loadGeoJsonDetections,
            this.options.tiles,
            this.options.overlays,
            openPopup,
            onTogglePopup
        )
    }
});