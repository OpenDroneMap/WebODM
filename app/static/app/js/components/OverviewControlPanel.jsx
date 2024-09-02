import React from 'react';
import PropTypes from 'prop-types';
import '../css/OverviewControlPanel.scss';

export default class OverviewControlPanel extends React.Component {
    static propTypes = {
        selectedLayers: PropTypes.array.isRequired,
        onClose: PropTypes.func.isRequired,
        removeGeoJsonDetections: PropTypes.func,
        loadGeoJsonDetections: PropTypes.func
    }

    constructor(props) {
        super(props);

        this.state = {
            collapsedLayers: {},
            filteredSelectedLayers: [], 
        };

        this.removeGeoJsonDetections = this.props.removeGeoJsonDetections;
        this.loadGeoJsonDetections = this.props.loadGeoJsonDetections;
        this.tiles = this.props.tiles;
    }

    componentDidUpdate = (prevProps) => {
        if (prevProps.selectedLayers !== this.props.selectedLayers) {
            const filteredLayers = this.props.selectedLayers
            .map((layer, index) => ({ layer, index }))
            .filter(({ layer }) =>
                layer.cropType !== null && layer.aiOptions && layer.aiOptions.size > 0
            );

            this.setState({filteredSelectedLayers: filteredLayers});
        }
    }
    

    handleCollapsedlistLayerItems = (index) => {
        this.setState(prevState => ({
            collapsedLayers: {
                ...prevState.collapsedLayers,
                [index]: !prevState.collapsedLayers[index], // Toggle o estado de colapsado para esse índice
            }
        }));
    }

    handleClearOverviewLayers = () => {
        const fieldSet = new Set(['field']);

        this.setState({filteredSelectedLayers: [] })
        this.removeGeoJsonDetections(fieldSet);
        this.loadGeoJsonDetections(fieldSet);
    }

    handleSendData = () => {
        const {filteredSelectedLayers} = this.state;

        const task_id = this.tiles[0].meta.task.id;
        const project_id = this.tiles[0].meta.task.project;

        const url = `/api/projects/${project_id}/tasks/${task_id}/process`;

        filteredSelectedLayers.forEach(({layer}) => {
            
            const payload = {
                type: layer.cropType,
                payload: {
                    processing_requests: {
                        fields_to_process: [] //Adicionar id dos talhoes 
                    }
                }
            };

            fetch(url , {
                method: 'POST',
                headers: {
                    'content-type': 'application/json'
                },
                body: JSON.stringify(payload)
            })
            .then(Response => Response.json())
            .then(data => {
                console.log('sucess: ', data)
            })
            .catch(error => console.error('Error:', error));
        })
    }

    render() {


        return (
            <div className="overview-control-panel">
                <span className="close-button" onClick={this.props.onClose} />
                <div className="title">Overview</div>
                <hr />
                {this.state.filteredSelectedLayers.length > 0 ? (
                    <ul className='list-overview'>
                        {this.state.filteredSelectedLayers.map(({ layer, index }) => (
                            <li key={index} className='layer-item'>
                                <button className='collapsed-infos-btn' onClick={() => this.handleCollapsedlistLayerItems(index)}>
                                    {this.state.collapsedLayers[index] ? "-" : "+"}
                                </button>
                                {names[index] + ` - Layer ${index}` || `Layer ${index}`}
                                <ul className={`list-layer-items ${!this.state.collapsedLayers[index] ? 'collapsed' : ''}`}>
                                    <li>
                                        Coordenadas:
                                        <ul>
                                            <li>
                                                Nordeste
                                                <ul>
                                                    <li>lat: {layer.bounds._northEast.lat} </li>
                                                    <li>lng: {layer.bounds._northEast.lng} </li>
                                                </ul>
                                            </li>
                                            <li>
                                                Sudoeste
                                                <ul>
                                                    <li>lat: {layer.bounds._southWest.lat} </li>
                                                    <li>lng: {layer.bounds._southWest.lng} </li>
                                                </ul>
                                            </li>
                                        </ul>
                                    </li>
                                    <li>Tipo de colheita: {translate(layer.cropType, 'cropType')}</li>
                                    <li>Opções de IA: {Array.from(layer.aiOptions).map(option => translate(option, 'aiOptions')).join(', ')}</li>
                                </ul>
                            </li>
                        ))}
                    </ul>
                ) : (
                    "Nenhum talhão selecionado"
                )}
                <hr />
                <button onClick={() => this.handleSendData()}>Enviar</button>
                <button onClick={() => this.handleClearOverviewLayers()}>Limpar</button>
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

const translations = {
    cropType: {
        sugarcane: 'Cana-de-açúcar',
        soy: 'Soja',
        corn: 'Milho',
    },
    aiOptions: {
        weed: 'Daninha',
    },
};

const translate = (value, type) => {
    return translations[type] && translations[type][value] ? translations[type][value] : value;
}
