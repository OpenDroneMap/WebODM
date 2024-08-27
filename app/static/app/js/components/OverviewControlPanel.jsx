import React from 'react';
import PropTypes from 'prop-types';
import '../css/OverviewControlPanel.scss';

export default class OverviewControlPanel extends React.Component {
    static propTypes = {
        selectedLayers: PropTypes.array.isRequired,
        onClose: PropTypes.func.isRequired,
    }

    constructor(props) {
        super(props);
        this.state = {
            collapsedLayers: {}, // Objeto para rastrear quais listas estão colapsadas
        };
    }

    names = [
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

    translations = {
        cropType: {
            sugarcane: 'Cana-de-açúcar',
            soy: 'Soja',
            corn: 'Milho',
        },
        aiOptions: {
            weed: 'Daninha',
        },
    };

    translate(value, type) {
        return this.translations[type] && this.translations[type][value] ? this.translations[type][value] : value;
    }

    handleCollapsedlistLayerItems = (index) => {
        this.setState(prevState => ({
            collapsedLayers: {
                ...prevState.collapsedLayers,
                [index]: !prevState.collapsedLayers[index], // Toggle o estado de colapsado para esse índice
            }
        }));
    }

    render() {
        const filteredLayers = this.props.selectedLayers
            .map((layer, index) => ({ layer, index }))
            .filter(({ layer }) =>
                layer.cropType !== null && layer.aiOptions && layer.aiOptions.size > 0
            );

        return (
            <div className="overview-control-panel">
                <span className="close-button" onClick={this.props.onClose} />
                <div className="title">Overview</div>
                <hr />
                {filteredLayers.length > 0 ? (
                    <ul>
                        {filteredLayers.map(({ layer, index }) => (
                            <li key={index} className='layer-item'>
                                <button onClick={() => this.handleCollapsedlistLayerItems(index)}>
                                    {this.state.collapsedLayers[index] ? "+" : "-"}
                                </button>
                                {this.names[index] + ` - Layer ${index}` || `Layer ${index}`}
                                <ul className={`list-layer-items ${this.state.collapsedLayers[index] ? 'collapsed' : ''}`}>
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
                                    <li>Tipo de colheita: {this.translate(layer.cropType, 'cropType')}</li>
                                    <li>Opções de IA: {Array.from(layer.aiOptions).map(option => this.translate(option, 'aiOptions')).join(', ')}</li>
                                </ul>
                            </li>
                        ))}
                    </ul>
                ) : (
                    "Nenhum talhão selecionado"
                )}
                <hr />
                <button>Enviar</button>
                <button>Cancelar</button>
            </div>
        );
    }
}
