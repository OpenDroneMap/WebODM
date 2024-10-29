import React from 'react';
import PropTypes from 'prop-types';

import '../css/SprayLineControlPanel.scss';

export default class SprayLineControlPanel extends React.Component {
    static propTypes = {
        selectedLayers: PropTypes.array.isRequired,
        removeGeoJsonDetections: PropTypes.func,
        loadGeoJsonDetections: PropTypes.func,
        overlays: PropTypes.array.isRequired,
        tiles: PropTypes.array,
        onClose: PropTypes.func.isRequired,
    }

    constructor(props) {
        super(props);

        this.state = {
            filteredSelectedLayers: [],
        };

        this.distanceRef = React.createRef();
        this.directionRef = React.createRef();
        this.flightHeightRef = React.createRef();


    }

    componentDidUpdate = (prevProps) => {
        if (prevProps.selectedLayers !== this.props.selectedLayers) {
            const filteredLayers = this.props.selectedLayers
                .map((layer, index) => ({ layer, index }))
                .filter(({ layer }) => layer.pulverize === true);

            this.setState({ filteredSelectedLayers: filteredLayers });
        }

    }

    handlePopUp = (e) => {
        const { overlays } = this.props;
        
        const layerSelected = this.state.filteredSelectedLayers.filter(layer => layer.index == e.target.id);

        if (overlays[1]) {
            const leafleatLayers = Array.from(Object.values(overlays[1]._layers));
            const reflayerLeafLeat = leafleatLayers.filter(layer => {
                return (
                    layer._bounds &&
                    layerSelected[0] &&
                    layerSelected[0].layer &&
                    layerSelected[0].layer.bounds &&
                    layer._bounds._northEast.lat === layerSelected[0].layer.bounds._northEast.lat &&
                    layer._bounds._northEast.lng === layerSelected[0].layer.bounds._northEast.lng &&
                    layer._bounds._southWest.lat === layerSelected[0].layer.bounds._southWest.lat &&
                    layer._bounds._southWest.lng === layerSelected[0].layer.bounds._southWest.lng
                );
            });

            if (reflayerLeafLeat.length > 0) {
                const layer = reflayerLeafLeat[0];
                if (layer.getPopup()) {
                    if (!layer.isPopupOpen()) {
                        layer.openPopup();
                    }
                }
            }
        }
    }

    handleProcess = async () => {

        const { overlays } = this.props;
        const { tiles } = this.props
        const { filteredSelectedLayers } = this.state;
    

        if (overlays[1] && filteredSelectedLayers.length > 0) {
            const leafleatLayers = Array.from(Object.values(overlays[1]._layers));
            const fieldIds = [];

            leafleatLayers.forEach(leafletLayer => {
                filteredSelectedLayers.forEach(selectedLayer => {
                    const bounds1 = leafletLayer._bounds;
                    const bounds2 = selectedLayer.layer.bounds;
    
                    const isBoundsEqual = (
                        bounds1._northEast.lat === bounds2._northEast.lat &&
                        bounds1._northEast.lng === bounds2._northEast.lng &&
                        bounds1._southWest.lat === bounds2._southWest.lat &&
                        bounds1._southWest.lng === bounds2._southWest.lng
                    );
    
                    if (isBoundsEqual) {
                        fieldIds.push(leafletLayer.feature.properties.Field_id);
                    }
                });
            });
    
            
            console.log("Field IDs: ", fieldIds);  


            const task_id = tiles[0].meta.task.id;
            const project_id = tiles[0].meta.task.project;
            const distance = this.distanceRef.current.value;
            const direction = this.directionRef.current.value;
            // const flightHeight = this.flightHeightRef.current.value;
            const URL = '';



            const payload = {
                processing_requests: {
                    distancia: distance,
                    angulo: direction,
                    fields_to_process: fieldIds
                }
            };

            console.log("payload: ", payload);

            try {
                const response = await fetch(URL, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                    },
                    body: JSON.stringify(payload),
                });

                if (response.ok) {
                    const data = await response.json();
                    console.log('Processamento bem-sucedido:', data);
                } else {
                    console.error('Erro no processamento');
                }
            } catch (error) {
                console.error('Erro na requisição:', error);
            }
        }

    }


    handleExport = (format) => {
        console.log(format);
    }

    render() {
        
        return (
            <div className="sprayline-control-panel">
                <span className="close-button" onClick={this.props.onClose} />
                <div className="title">Pulverizar</div>
                <hr />

                {this.state.filteredSelectedLayers.length > 0 ? (
                    <div>
                        <ul className='list-sprayline'>
                            {this.state.filteredSelectedLayers.map(({ layer, index }) => (
                                <li key={index} className='layer-item'>
                                    <a href="javascript:void(0)" id={index} onClick={this.handlePopUp} className='link-item'>
                                        {names[index] + ` - Layer ${index}` || `Layer ${index}`}
                                    </a>
                                </li>
                            ))}
                        </ul>

                        <form className='form-container'>
                            <label htmlFor="distance">Distância entre linhas:</label>
                            <input type="number" id="distance" name="distance" min="0" step="0.1" ref={this.distanceRef} required />
                            <br />

                            <label htmlFor="direction">Direção das linhas:</label>
                            <input type="number" id="direction" name="direction" min="0" max="360" step="1" ref={this.directionRef} required />
                            <br />

                            <label htmlFor="flightHeight">Altura de voo:</label>
                            <input type="number" id="flightHeight" name="flightHeight" min="0" step="0.1" ref={this.flightHeightRef} required />
                        </form>
                    </div>
                ) : (
                    "Nenhum talhão selecionado"
                )}
                <hr />
                <button onClick={this.handleProcess}>Processar</button>
                <button className="btn btn-sm btn-primary btn-export" data-toggle="dropdown">
                    Exportar
                </button>
                <ul className="dropdown-menu  pull-right">
                    <li>
                    <a href="javascript:void(0);" onClick={() => this.handleExport("GeoJSON")}>
                        <i className="fa fa-code fa-fw"></i> GeoJSON (.JSON)
                    </a>
                    </li>
                    <li>
                    <a href="javascript:void(0);" onClick={() => this.handleExport("Shapefile")}>
                        <i className="far fa-file-archive fa-fw"></i> ShapeFile (.SHP)
                    </a>
                    </li>
                    <li>
                        <a href="javascript:void(0);" onClick={() => this.handleExport("xml")}>
                            <i className="fa fa-file-code fa-fw"></i> XML (.XML)
                        </a>
                    </li>
                </ul>
            </div>
        );
    }
}


const names = [
    "Ana", "Beatriz", "Carlos", "Daniela", "Eduardo",
    "Fernanda", "Gabriel", "Helena", "Igor", "Juliana",
    "Kleber", "Luana", "Marcos", "Natalia", "Otávio",
    "Priscila", "Roberto", "Samantha", "Thiago", "Vanessa",
    "Wesley", "Yasmin", "Zé", "Amanda", "Bruno",
    "Camila", "Diego", "Eliane", "Flávio", "Gustavo",
    "Heloísa", "Isabela", "João", "Karine", "Leonardo",
    "Maria", "Nicolas", "Olga", "Pedro", "Queila",
    "Raul", "Sabrina", "Tiago", "Vânia", "William",
    "Zilda", "André", "Barbara", "Célia", "David",
    "Emanuelle", "Felipe", "Giovana", "Henrique", "Irene",
    "Júlio", "Larissa", "Marcelo", "Nayara", "Olavo",
    "Paula", "Ricardo", "Silvia", "Tânia", "Vinícius",
    "Wagner", "Yara", "Zeca", "Adriana", "Bernardo",
    "Cristiane", "Douglas", "Elena", "Flávia", "Gisele",
    "Hugo", "Jéssica", "Lucas", "Márcia", "Nando",
    "Patrícia", "Rafael", "Silvia", "Tatiane", "Valter",
    "Wellington", "Zuleica", "Aline", "Bruna", "César",
    "Daniel", "Evelyn", "Fábio", "Gisele", "Helena"
];