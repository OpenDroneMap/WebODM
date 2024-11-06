import React from 'react';
import PropTypes from 'prop-types';
import '../css/MarkFieldsPanel.scss';
import '../components/Map.jsx';
import { _ } from '../classes/gettext';
import 'leaflet/dist/leaflet.css';
import 'leaflet-draw/dist/leaflet.draw.css';
import L from 'leaflet';
import 'leaflet-draw';


export default class LayersControlPanel extends React.Component {

    static propTypes = {
        onClose: PropTypes.func.isRequired,
        map: PropTypes.object.isRequired,
        task_id: PropTypes.string.isRequired,
        project_id: PropTypes.number.isRequired
    }

    constructor(props) {
        super(props);
        this.drawControl = null;
        this.drawnItems = new L.FeatureGroup();
        this.polygonIdCounter = 1;
        this.state = {
          isDrawing: false
        };
    }

    componentDidMount() {
        const { map } = this.props;
    
        map.addLayer(this.drawnItems);

        this.drawControl = new L.Control.Draw({
            draw: {
                polygon: true,  
                polyline: false,
                circle: false,
                rectangle: false,
                marker: false,
                circlemarker: false
            },
            edit: {
                featureGroup: this.drawnItems, 
                edit: true,
                remove: true
            }
        });

        map.addControl(this.drawControl);

        // Assign a unique "Field_id" property to each created polygon
        map.on(L.Draw.Event.CREATED, (e) => {
          const layer = e.layer;
          layer.feature = layer.feature || {}; // Ensure feature object exists
          layer.feature.type = "Feature"; // Set type to Feature for GeoJSON
          layer.feature.properties = layer.feature.properties || {}; // Ensure properties object exists
          layer.feature.properties.field_id = this.polygonIdCounter++; // Assign unique field_id
          this.drawnItems.addLayer(layer);
          
      });
      

        // Optionally hide certain controls
        document.querySelector('.leaflet-draw-toolbar').style.display = 'none';
        document.querySelector('.leaflet-draw-toolbar a.leaflet-draw-edit-edit').style.display = 'none';
        document.querySelector('.leaflet-draw-toolbar a.leaflet-draw-edit-remove').style.display = 'none';
    }

    componentWillUnmount() {
        const { map } = this.props;
        if (this.drawControl) {
            map.removeControl(this.drawControl);
        }
        map.removeLayer(this.drawnItems);
    }

    editPolygon = () => {
        this.drawControl._toolbars.edit._modes.edit.handler.enable();
    };

    deletePolygon = () => {
        this.drawControl._toolbars.edit._modes.remove.handler.enable();
    };

    drawPolygon = () => {
        this.props.map.fire('draw:drawstart', { layerType: 'polygon' });
        this.drawControl._toolbars.draw._modes.polygon.handler.enable();    
    };

    exportPolygons = () => {
        const geojsonData = this.drawnItems.toGeoJSON();
        const formattedGeoJSON = JSON.stringify(geojsonData, null, 2);
        const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(formattedGeoJSON);
        const downloadAnchor = document.createElement('a');
        downloadAnchor.setAttribute("href", dataStr);
        downloadAnchor.setAttribute("download", "talhoes.geojson");
        document.body.appendChild(downloadAnchor);
        downloadAnchor.click();
        downloadAnchor.remove();
    };
    
    savePolygon = () => {
        const task_id = this.props.task_id;
        const project_id = this.props.project_id;

        
    }

    render() {
        return (
            <div className="markFields-control-panel">
                <span className="close-button" onClick={this.props.onClose}/>
                <div className="title">{_("Mark Fields")}</div>
                <hr/>
                algum conteudo ?
                <hr/>
                <button id="draw-polygon" onClick={this.drawPolygon}>Marcar Talhões</button>
                <button id="edit-polygon" onClick={this.editPolygon}>Editar Talhões</button>
                <button id="delete-polygon" onClick={this.deletePolygon}>Deletar Talhões</button>
                <button id="export-polygon" onClick={this.exportPolygons}>Exportar</button>
                <button id="save-polygon" onClick={this.savePolygon}>Salvar</button>
            </div>
        );
    }
}
