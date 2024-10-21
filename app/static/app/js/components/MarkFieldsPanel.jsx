import React from 'react';
import PropTypes from 'prop-types';
import '../css/MarkFieldsPanel.scss';
import { _ } from '../classes/gettext';
import 'leaflet/dist/leaflet.css';
import Leaflet from 'leaflet';
import 'leaflet-draw/dist/leaflet.draw.css';
import 'leaflet-draw';
import L from 'leaflet';



export default class LayersControlPanel extends React.Component {

    static propTypes = {
        onClose: PropTypes.func.isRequired,
        map: PropTypes.object.isRequired
    }

    constructor(props){
        super(props);
        this.drawControl = null;
        this.drawnItems = new L.FeatureGroup();
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

  
    map.on(L.Draw.Event.CREATED, (e) => {
      const layer = e.layer;
      this.drawnItems.addLayer(layer);
      layer.bindPopup('Polygon created').openPopup();
    });

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
    const { map } = this.props;

  
    this.drawControl._toolbars.edit._modes.edit.handler.enable();
  };
 
  deletePolygon = () => {
    const { map } = this.props;

  
    this.drawControl._toolbars.edit._modes.remove.handler.enable();
  }
  


  drawPolygon = () => {
    const { map } = this.props;

    map.fire('draw:drawstart', { layerType: 'polygon' });
    this.drawControl._toolbars.draw._modes.polygon.handler.enable();    
  };

    
    render(){
    
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
            </div>
        );
    }
}
