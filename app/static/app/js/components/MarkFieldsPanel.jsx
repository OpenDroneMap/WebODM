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
        onOpen: PropTypes.func.isRequired,
        map: PropTypes.object.isRequired,
        task_id: PropTypes.string.isRequired,
        project_id: PropTypes.number.isRequired,
        showPanel: PropTypes.bool.isRequired
    }

    constructor(props) {
        super(props);
        this.drawControl = null;
        this.drawnItems = new L.FeatureGroup();
        this.polygonIdCounter = 1;
        this.state = {
          isDrawing: false,
          showPanel: false,
          isObstacle: false,
          polygonStyle: [{color: '#3388ff', fillColor: '#3388ff', fillOpacity: 0.2, },{ color: 'red', fillColor: 'red', fillOpacity: 0.2, weight: 3, opacity: 1 }]
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
          const type = this.state.isObstacle;
          layer.feature = layer.feature || {}; // Ensure feature object exists
          layer.feature.type = "Feature"; // Set type to Feature for GeoJSON
          layer.feature.properties = layer.feature.properties || {}; // Ensure properties object exists
          layer.feature.properties.field_id = this.polygonIdCounter++; // Assign unique field_id
          layer.feature.properties.obstacle = type;

          const style = type === false 
        ? this.state.polygonStyle[0]
        : this.state.polygonStyle[1]

        if (layer.setStyle) {
          layer.setStyle(style);
        }
        this.drawnItems.addLayer(layer);
      });
      

        // Optionally hide certain controls
        document.querySelector('.leaflet-draw-toolbar').style.display = 'none';
        document.querySelector('.leaflet-draw-toolbar a.leaflet-draw-edit-edit').style.display = 'none';
        document.querySelector('.leaflet-draw-toolbar a.leaflet-draw-edit-remove').style.display = 'none';

        fetch('/api/projects/' + this.props.project_id + '/tasks/'+ this.props.task_id +'/ai/detections/field').then((value) => {
            if (value.status == 404) {
              let err = {};
              err.message = interpolate(_("Detecção em %(url)s não encontrada!"), { url: api });
              cb(err);
              return;
            }
            value.json().then((geojson) =>{
                L.geoJSON(geojson, {
                    onEachFeature: (feature, layer) => {
                        feature.properties.field_id = this.polygonIdCounter++;
                        if(feature.properties.obstacle === true){
                            layer.options.color = "red";
                            layer.options.fillColor = "red";
                        }
                        this.drawnItems.addLayer(layer);
                    }
                });

            })
        })
        const getReload = localStorage.getItem('reloadMarkField');
        if(getReload == "false"){
            map.removeLayer(this.drawnItems);
        }else{
            this.props.onOpen();
            localStorage.setItem('reloadMarkField', false);
        }
    }

    componentWillUnmount() {
        const { map } = this.props;
        if (this.drawControl) {
            map.removeControl(this.drawControl);
        }
        map.removeLayer(this.drawnItems);
    }

    componentDidUpdate(prevProps, prevState){
        if(this.props.showPanel === true){
            this.props.map.addLayer(this.drawnItems);
        }else {
            this.props.map.removeLayer(this.drawnItems);
        }
    }

    editPolygon = () => {
        this.drawControl._toolbars.edit._modes.edit.handler.enable();
    };

    deletePolygon = () => {
        this.drawControl._toolbars.edit._modes.remove.handler.enable();
    };

    drawPolygon = () => {
        this.state.isObstacle = false;   
        this.props.map.fire('draw:drawstart', { layerType: 'polygon'});
        this.drawControl._toolbars.draw._modes.polygon.handler.enable(); 
    };
    drawObstacle = () => {
        this.state.isObstacle = true;   
        this.props.map.fire('draw:drawstart', { layerType: 'polygon'});
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
        const geojsonData = this.drawnItems.toGeoJSON();
        const url = "/api/projects/"+ project_id + "/tasks/"+ task_id +"/save/field";
        const csrfToken = getCsrfToken(); 

        const body = {
            payload: geojsonData,
            required: ["payload"]
        }
    
        fetch(url, {
            method: 'POST',
            headers: { 
                'content-type': 'application/json',
                'X-CSRFToken': csrfToken,
            },
            body: JSON.stringify(body,null,2)
        }).then(() => {
            localStorage.setItem('reloadMarkField', true);
            location.reload(true);
        });
        
    };

    render() {
        return (
            <div className="markFields-control-panel">
                <span className="close-button fas fa-times" onClick={this.props.onClose}></span>
                <div className="title">{_("MARCAR TALHÕES")}</div>
                <span className="panel-button" onClick={this.drawPolygon}> <i className="corIcons fas fa-thumbtack"></i> Marcar Talhões</span>
                <hr />
                <span className="panel-button" onClick={this.drawObstacle}> <i className="corIcons fas fa-mountain"></i> Marcar Obstáculos</span>
                <hr />
                <span className="panel-button" onClick={this.editPolygon}><i className="corIcons fas fa-edit"></i> Editar Talhões</span>
                <hr />
                <span className="panel-button" onClick={this.savePolygon}><i className="corIcons fas fa-save"></i> Salvar</span>
                <hr />
                <span className="panel-button" onClick={this.exportPolygons}><i className="corIcons fas fa-download"></i> Exportar</span>
                <hr />
                <span className="panel-button" onClick={this.deletePolygon}><i className="corIconDelete fas fa-trash-alt"></i> Deletar Talhões</span>
                <hr />
            </div>
        );
    } 
}

const getCsrfToken = () => {
    const cookies = document.cookie.split(";");
    for (let cookie of cookies) {
    cookie = cookie.trim();
    if (cookie.startsWith("csrftoken=")) {
        return cookie.split("=")[1];
    }
    }
    return null;
};