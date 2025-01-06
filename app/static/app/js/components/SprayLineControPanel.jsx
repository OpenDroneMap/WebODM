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
            isProcessing: false,
            processingCompleted: false,
            isExporting: false,
            exportingCompleted: false,
            enableExport: false,
            error: false
        };

        this.distanceRef = React.createRef();
        this.directionRef = React.createRef();
        this.flightHeightRef = React.createRef();

    }

    // Atualiza state selectedLayers quando um novo talhão é marcado para pulverizar 
    componentDidUpdate = (prevProps) => {
        if (prevProps.selectedLayers !== this.props.selectedLayers) {
            const filteredLayers = this.props.selectedLayers
                .map((layer, index) => ({ layer, index }))
                .filter(({ layer }) => layer.pulverize === true);

            this.setState({ filteredSelectedLayers: filteredLayers });
        }
    }

    // Função para abrir popup do talhão ao clicar nele
    handlePopUp = (e) => {

        const clickedId = e.currentTarget.id;
    
        const { overlays } = this.props;
        const layerSelected = this.state.filteredSelectedLayers.filter(layer => layer.index == clickedId);
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


    // Função para processamento de talhões selecionados

    handleProcess = async () => {

        const { overlays } = this.props;
        const { tiles } = this.props;
        const { filteredSelectedLayers } = this.state;
    
        if (overlays[1] && filteredSelectedLayers.length > 0 && this.state.isProcessing == false) {

            const inputDirection = this.directionRef.current.value;
            const inputDistance = this.distanceRef.current.value;

            if (inputDirection == "" || inputDistance == "") {
                alert("Por favor, preencha todos os campos obrigatórios antes de continuar.");
                return;
            }

            this.setState({isProcessing: true});
            this.setState({enableExport: false});
            this.setState({processingCompleted: false});
            this.setState({exportingCompleted: false});
            this.setState({error: false});

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
                        const featureProps = leafletLayer.feature.properties;

                        if ('field_id' in featureProps) {
                            fieldIds.push(featureProps.field_id);
                        } else if ('Field_id' in featureProps) {
                            fieldIds.push(featureProps.Field_id);
                        }
                    }
                });
            });
    
            const task_id = tiles[0].meta.task.id;
            const project_id = tiles[0].meta.task.project;
            const distance = parseFloat(inputDistance);
            const direction = parseFloat(inputDirection);
            const csrfToken = getCsrfToken();

            const URL = `/api/projects/${project_id}/tasks/${task_id}/process/spraylines`;

            const payload = {
                processing_requests: {
                    distancia: distance,
                    angulo: direction,
                    fields_to_process: fieldIds
                }
            };
    
            try {
                const response = await fetch(URL, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'User-Agent': 'insomnia/8.6.1',
                        'X-CSRFToken': csrfToken,
                    },
                    body: JSON.stringify(payload),
                });
                if (response.ok) {

                    const data = await response.json();
                    console.log('Processamento bem-sucedido:', data);
                    
                    const intervalId = setInterval(async () => {
                        try {
                            const processing = await this.getProcess(project_id, task_id); 

                            if (processing[0].finishedOn !== null) {
                                console.log('Processamento concluído!');

                                setTimeout(() => {
                                    clearInterval(intervalId);
                                    this.setState({processingCompleted:true});
                                    this.setState({isProcessing: false});
                                    this.setState({enableExport: true});
                                }, 2000);
                            }

                        } catch (error) {
                            console.error('Erro ao chamar getProcess:', error);
                            
                        }
                    }, 1000);
                } else {
                    console.error('Erro no processamento');
                    this.setState({error: true});
                    this.setState({isProcessing: false});3
                    alert('Não foi possivel processar os talhões selecionados.');

                }
            } catch (error) {
                console.error('Erro na requisição:', error);
                this.setState({error: true});
                this.setState({isProcessing: false});
                alert('Não foi possivel processar os talhões selecionados.');
            }

            
        }
    };

    // Função para exportar resultados do processamento de talhões

    handleExport = async (format) => {

        const { overlays } = this.props;
        const { tiles } = this.props;
        const { filteredSelectedLayers } = this.state;

        this.setState({processingCompleted: false});
    
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
                        const featureProps = leafletLayer.feature.properties;

                        if ('field_id' in featureProps) {
                            fieldIds.push(featureProps.field_id);
                        } else if ('Field_id' in featureProps) {
                            fieldIds.push(featureProps.Field_id);
                        }
                    }
                });
            });
    
            const task_id = tiles[0].meta.task.id;
            const project_id = tiles[0].meta.task.project;

            const URL = `/api/projects/${project_id}/tasks/${task_id}/export/spraylines`;

            const csrfToken = getCsrfToken();

            try {
                for (let field_id of fieldIds) {
                    this.setState({isExporting: true});
                    this.setState({exportingCompleted:false});
                    this.setState({enableExport:false});
                    const payload = {
                        processing_requests: {
                            field_id: field_id,
                            export_format: format,
                        },
                    };

                    const response = await fetch(URL, {
                        method: 'POST',
                        headers: {
                            'Content-Type': 'application/json',
                            'User-Agent': 'insomnia/8.6.1',
                            'X-CSRFToken': csrfToken,
                        },
                        body: JSON.stringify(payload),
                    });

                    if (response.ok) {
                        const contentType = response.headers.get('Content-Type');
                        if (contentType.includes('application/zip')) {
                            const blob = await response.blob();
                            const downloadUrl = window.URL.createObjectURL(blob);
                            const link = document.createElement('a');
                            link.href = downloadUrl;
                            link.download = `pulverizacao_${field_id}.zip`; 
                            document.body.appendChild(link);
                            link.click();
                            link.remove();
                            console.log(`Arquivo ZIP exportado com sucesso para o field_id: ${field_id}`);
                
                        } else if (contentType.includes('application/json')) {
                            const geoJsonResponse = await response.json();
                            if (geoJsonResponse && geoJsonResponse.type === 'FeatureCollection') {
                                const geoJsonBlob = new Blob([JSON.stringify(geoJsonResponse)], { type: 'application/geo+json' });
                                const downloadUrl = window.URL.createObjectURL(geoJsonBlob);
                                const link = document.createElement('a');
                                link.href = downloadUrl;
                                link.download = `pulverizacao_${field_id}.geojson`;
                                document.body.appendChild(link);
                                link.click();
                                link.remove();
                                console.log(`GeoJSON exportado com sucesso para o field_id: ${field_id}`);
                            } 
                        }
                    } else {
                        console.error(`Erro no processamento da exportação para o field_id ${field_id}:`, response.statusText);
                    }
                    this.setState({processingCompleted:false})
                    this.setState({exportingCompleted: true});
                    this.setState({isExporting: false});
                    this.setState({enableExport: true});
                }
            } catch (error) {
                console.error('Erro na requisição:', error);
            }
        }
    }

    // Função para identificar se tem algum talhão sendo processado

    getProcess = async (project_id, task_id) => {
        const url = `/api/projects/${project_id}/tasks/${task_id}/getProcess`;
        return fetch(url, {
            method: "GET",
            headers: {
                "content-type": "application/json",
            },
        })
            .then(response => {
                if (!response.ok) {
                    throw new Error("Erro na requisição");
                }
                return response.json(); 
            })
            .catch(error => {
                console.error("Erro:", error);
                throw error; 
            });
    };

    // Função de incremento para icons personalizados nos inputs
    incrementValue = (ref, step = 1, max = Infinity) => {
        const currentValue = parseFloat(ref.current.value) || 0;
        const newValue = Math.min(currentValue + step, max); 
        ref.current.value = newValue;
    };

    // Função de decremento para icons personalizados nos inputs
    decrementValue = (ref, step = 1, min = 0) => {
        const currentValue = parseFloat(ref.current.value) || 0;
        const newValue = Math.max(currentValue - step, min); 
        ref.current.value = newValue;
    };


    render() {
        return (
            <div className="sprayline-control-panel">
                <span className="close-button fas fa-times" onClick={this.props.onClose} />
                <div className="title">PULVERIZAR</div>

                {this.state.filteredSelectedLayers.length > 0 ? (
                    <div>
                        <ul className='list-sprayline'>
                            {this.state.filteredSelectedLayers.map(({ layer, index }) => (
                                <li key={index} className='layer-item'>
                                    <a href="javascript:void(0)" id={index} onClick={this.handlePopUp} className='link-item'>
                                        
                                        {layer.name ? 
                                        <div className='layer-container'>
                                            <span className='NameField'> {layer.name} </span> 
                                            <span className='vertical-bar'></span>
                                            <span className='layer-id'> Layer {index} </span>
                                        </div> :
                                            <span className='layer-id'> Layer {index} </span>}
                                    </a>
                                </li>
                            ))}
                        </ul>

                        <form className='form-container'>
                            <hr />
                            <div>
                                <label htmlFor="distance">Distância entre linhas</label>
                                <div className="custom-number-input">
                                    <input
                                    type="number"
                                    id="distance"
                                    name="distance"
                                    min="0"
                                    step="1"
                                    ref={this.distanceRef}
                                    required
                                    />
                                    <div className="icon-incre-decre">
                                        <i className="fas fa-chevron-up"
                                            onClick={() => this.incrementValue(this.distanceRef, 1)}/>
                                        <i className="fas fa-chevron-down"
                                            onClick={() => this.decrementValue(this.distanceRef, 1)}/>
                                    </div>
                                </div>
                            </div>
                            <hr />
                            <div>
                                <label htmlFor="direction">Ângulo</label>
                                <div className="custom-number-input">
                                    <input
                                    type="number"
                                    id="direction"
                                    name="direction"
                                    min="0"
                                    max="360"
                                    step="1"
                                    ref={this.directionRef}
                                    required
                                    />
                                    <div className="icon-incre-decre">
                                    <i className="fas fa-chevron-up"
                                        onClick={() => this.incrementValue(this.directionRef, 1, 360)}/>
                                    <i className="fas fa-chevron-down"
                                        onClick={() => this.decrementValue(this.directionRef, 1, 0)}/>
                                    </div>
                                </div>
                            </div>
                        </form>
                    </div>
                ) : (
                    "Nenhum talhão selecionado"
                )}
                <div className='btn-container'>
                    <button onClick={this.handleProcess} 
                            className='btn btn-sm btn-primary btn-process'>
                            {this.state.isProcessing ? <i class="iconSize fas fa-spinner fa-spin"></i> : <i class="iconSize far fa-circle"></i> }
                        Processar
                    </button>
                    <button disabled={!this.state.enableExport} 
                            className={this.state.enableExport ? 'btn btn-sm btn-primary btn-export' : 'btn btn-sm btn-primary btn-export export-disable'}  
                            data-toggle="dropdown">
                        <i class="iconSize far fa-arrow-alt-circle-down"></i>
                        Exportar
                    </button>
                </div>
                <ul className="dropdown-menu  pull-right">
                    <li>
                        <a href="javascript:void(0);" onClick={() => this.handleExport("geojson")}>
                            <i className="fa fa-code fa-fw"></i> 
                            GeoJSON (.JSON)
                        </a>
                    </li>
                    <li>
                        <a href="javascript:void(0);" onClick={() => this.handleExport("shp")}>
                            <i className="far fa-file-archive fa-fw"></i> 
                            ShapeFile (.SHP)
                        </a>
                    </li>
                    <li>
                        <a href="javascript:void(0);" onClick={() => this.handleExport("xml")}>
                            <i className="fa fa-file-code fa-fw"></i> 
                            XML (.XML)
                        </a>
                    </li>
                </ul>

                {/* <div>
                    {this.state.error
                    ? 'Erro ao processar o talhão'
                    : this.state.isProcessing
                    ? 'Processando Talhões, aguarde...'
                    : this.state.processingCompleted && !this.state.isExporting
                    ? 'Processamento concluído!'
                    : this.state.isExporting
                    ? 'Exportando Arquivos, aguarde...'
                    : this.state.exportingCompleted
                    ? 'Arquivos exportados!'
                    : ''}
                </div> */}

            </div>
        );
    }
}


// Função para obter csrfToken e passar nas requisições
const getCsrfToken = () => {
    const cookies = document.cookie.split(';');
    for (let cookie of cookies) {
        cookie = cookie.trim();
        if (cookie.startsWith('csrftoken=')) {
            return cookie.split('=')[1];
        }
    }
    return null;
}