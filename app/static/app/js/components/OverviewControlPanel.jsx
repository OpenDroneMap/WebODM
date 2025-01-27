import React from "react";
import PropTypes from "prop-types";
import "../css/OverviewControlPanel.scss";

export default class OverviewControlPanel extends React.Component {
  static propTypes = {
    selectedLayers: PropTypes.array.isRequired,
    removeGeoJsonDetections: PropTypes.func,
    loadGeoJsonDetections: PropTypes.func,
    overlays: PropTypes.array.isRequired,
    tiles: PropTypes.array,
    onClose: PropTypes.func.isRequired,
  };

  constructor(props) {
    super(props);

    this.state = {
      groupedLayers: {},
      collapsedLayers: {},
      filteredSelectedLayers: [],
    };

    this.removeGeoJsonDetections = this.props.removeGeoJsonDetections;
    this.loadGeoJsonDetections = this.props.loadGeoJsonDetections;
    this.tiles = this.props.tiles;
  }

  // Atualiza o estado do componente quando as propriedades ou o estado mudam
  // Verifica se `selectedLayers` mudou e filtra talhões válidos com base em condições específicas atualizando o state filteredSelectedLayers
  // Chama funções auxiliares para adicionar IDs de cada talhão e agrupa-los por tipo de cultura
  componentDidUpdate(prevProps, prevState) {
    if (prevProps.selectedLayers !== this.props.selectedLayers) {
        const filteredLayers = this.props.selectedLayers
            .map((layer, index) => ({ layer, index }))
            .filter(
                ({ layer }) =>
                    layer.cropType !== null &&
                    layer.aiOptions &&
                    layer.aiOptions.size > 0
            );

        this.setState({ filteredSelectedLayers: filteredLayers });
    }

    if (prevState.filteredSelectedLayers !== this.state.filteredSelectedLayers) {
        this.AddFieldsIdOnSelectedLayers();
        this.groupLayersByCropType();
    }
  }


  // Função para alternar o estado colapsado de um talhão selecionado listado no popup
  handleCollapsedlistLayerItems = (index) => {
    this.setState((prevState) => ({
      collapsedLayers: {
        ...prevState.collapsedLayers,
        [index]: !prevState.collapsedLayers[index], 
      },
    }));
  };

  // Reseta os talhões marcados no mapa
  handleClearOverviewLayers = () => {
    const fieldSet = new Set(["field"]);

    this.setState({ filteredSelectedLayers: [] });
    this.removeGeoJsonDetections(fieldSet);
    this.loadGeoJsonDetections(fieldSet);
  };

   // Adiciona o campo `field_id` aos talhões selecionadas 
  AddFieldsIdOnSelectedLayers = () => {
    const { filteredSelectedLayers } = this.state;
    const { overlays } = this.props;

    const overlayWithLayers = overlays.find(overlay => overlay && overlay._layers);

    if (overlayWithLayers) {

        const leafleatLayers = Array.from(Object.values(overlayWithLayers._layers));

        filteredSelectedLayers.forEach(selectedLayer => {
            const bounds2 = selectedLayer.layer.bounds;

            leafleatLayers.forEach(leafletLayer => {
                const bounds1 = leafletLayer._bounds;

                const isBoundsEqual = (
                    bounds1._northEast.lat === bounds2._northEast.lat &&
                    bounds1._northEast.lng === bounds2._northEast.lng &&
                    bounds1._southWest.lat === bounds2._southWest.lat &&
                    bounds1._southWest.lng === bounds2._southWest.lng
                );

                if (isBoundsEqual) {
                    const featureProps = leafletLayer.feature.properties;

                    if ('field_id' in featureProps) {
                        selectedLayer.field_id = featureProps.field_id; 
                    } else if ('Field_id' in featureProps) {
                        selectedLayer.field_id = featureProps.Field_id; 
                    }
                }
            });
        });
    }
};

  // Agrupa os talhões selecionados com base no tipo de cultivo
  groupLayersByCropType = () => {
    const { filteredSelectedLayers } = this.state;

    const groupedLayers = filteredSelectedLayers.reduce((groups, current) => {
        const cropType = current.layer.cropType;

        if (!groups[cropType]) {
            groups[cropType] = []; 
        }

        groups[cropType].push(current);
        return groups;
    }, {});

    this.setState({ groupedLayers });
  };

  // Envia os talhões selecionados para um endpoint de processamento
  handleSendData = async () => {
    const { groupedLayers } = this.state;
    const { filteredSelectedLayers } = this.state;

    this.AddFieldsIdOnSelectedLayers();
    this.groupLayersByCropType();

    if (!groupedLayers || Object.keys(groupedLayers).length === 0 || !filteredSelectedLayers) {
        alert("Nenhum talhão selecionado.");
        return;
    }

    const task_id = this.tiles[0].meta.task.id;
    const project_id = this.tiles[0].meta.task.project;
    const url = `/api/projects/${project_id}/tasks/${task_id}/process`;
    const csrfToken = getCsrfToken();

    const requests = Object.entries(groupedLayers).map(([cropType, layers]) => {
      
        const fieldsToProcessID = layers.map(layer => layer.field_id);
        
        const payload = {
            type: cropType,
            payload: { processing_requests: { fields_to_process: fieldsToProcessID } }
        };

        return fetch(url, {
            method: 'POST',
            headers: {
                'content-type': 'application/json',
                'X-CSRFToken': csrfToken, // Adiciona o CSRF token ao cabeçalho
            },
            body: JSON.stringify(payload),
        });
    });

    try {
        const responses = await Promise.all(requests);
        const results = await Promise.all(responses.map(res => res.json()));
        console.log('Sucesso:', results);
        alert("Talhões enviados para o processamento com sucesso.");
    } catch (error) {
        console.error('Erro:', error);
        alert("Ocorreu um erro ao enviar os talhões para processamento.");
    }
  };

  // Abre o popup do talhão correspondente
  handlePopUp = (e) => {
    const { overlays } = this.props;
    const layerSelected = this.state.filteredSelectedLayers.filter(
      (layer) => layer.index == e.target.id
    );

    const overlayWithLayers = overlays.find(overlay => overlay && overlay._layers);

    if (overlayWithLayers) {
        const leafleatLayers = Array.from(Object.values(overlayWithLayers._layers));
        
        const reflayerLeafLeat = leafleatLayers.filter((layer) => {
            return (
                layer._bounds &&
                layerSelected[0] &&
                layerSelected[0].layer &&
                layerSelected[0].layer.bounds &&
                layer._bounds._northEast.lat ===
                    layerSelected[0].layer.bounds._northEast.lat &&
                layer._bounds._northEast.lng ===
                    layerSelected[0].layer.bounds._northEast.lng &&
                layer._bounds._southWest.lat ===
                    layerSelected[0].layer.bounds._southWest.lat &&
                layer._bounds._southWest.lng ===
                    layerSelected[0].layer.bounds._southWest.lng
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
  };


  render() {
    return (
      <div className="overview-control-panel">
        <span className="close-button fas fa-times" onClick={this.props.onClose}></span>
        <div className="title">VISÃO GERAL</div>
        <hr />
        {this.state.filteredSelectedLayers.length > 0 ? (
          <ul className="list-overview">
            {this.state.filteredSelectedLayers.map(({ layer, index }) => (
              <li
                key={index}
                className="layer-item"
                
              >
                <button className="collapsed-infos-btn" onClick={() => this.handleCollapsedlistLayerItems(index)}>
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    viewBox="0 -960 960 960"
                    width="24px"
                    fill="#FFFFFF"
                    stroke="#FFFFFF"
                    strokeWidth="20"
                    style={{
                      transform: this.state.collapsedLayers[index]
                        ? "rotate(90deg)"
                        : "rotate(0deg)",
                      transition: "transform 0.3s ease", 
                    }}
                  >
                    <path d="m321-80-71-71 329-329-329-329 71-71 400 400L321-80Z" />
                  </svg>
                </button>
                <a
                  href="javascript:void(0)"
                  id={index}
                  onClick={this.handlePopUp}
                  className="link-item"
                >
                  {layer.name + ` | Layer ${index}` || `Layer ${index}`}
                </a>
                <ul
                  className={`list-layer-items ${
                    !this.state.collapsedLayers[index] ? "collapsed" : ""
                  }`}
                  onClick={this.handlePopUp}
                >
                  <li>
                    Tipo de colheita: {translate(layer.cropType, "cropType")}
                  </li>
                  <li>
                    Opções de IA:{" "}
                    {Array.from(layer.aiOptions)
                      .map((option) => translate(option, "aiOptions"))
                      .join(", ")}
                  </li>
                </ul>
              </li>
            ))}
          </ul>
        ) : (
          "Nenhum talhão selecionado"
        )}
        <hr />
        <div className="conteiner-button">
          <button className="send" onClick={() => this.handleSendData()}>
            Enviar
          </button>
          <button
            className="clear"
            onClick={() => this.handleClearOverviewLayers()}
          >
            Limpar
          </button>
        </div>
      </div>
    );
  }
}

// Função para obter o token CSRF armazenado nos cookies do navegador
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

// Objeto contendo traduções para diferentes tipos de dados
const translations = {
  cropType: {
    sugarcane: "Cana-de-açúcar",
    soy: "Soja",
    corn: "Milho",
  },
  aiOptions: {
    weed: "Daninha",
  },
};

// Função para traduzir um valor com base no tipo fornecido
const translate = (value, type) => {
  return translations[type] && translations[type][value]
    ? translations[type][value]
    : value;
};
