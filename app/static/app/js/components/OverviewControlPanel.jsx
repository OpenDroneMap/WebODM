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

  }

  // Atualiza o estado do componente quando as propriedades ou o estado mudam
  // Verifica se `selectedLayers` mudou e filtra talhões válidos com base em condições específicas atualizando o state filteredSelectedLayers
  componentDidUpdate(prevProps, prevState) {


    if (prevProps.selectedLayers !== this.props.selectedLayers) {
      const filteredLayers = this.props.selectedLayers
        .map((layer, index) => ({ layer, index }))
        .filter(
          ({ layer }) =>
            layer.cropType !== null &&
            layer.aiOptions &&
            layer.aiOptions.size > 0 ||
            layer.cropType !== null &&
            layer.polynomialHealth

        );

      this.setState({ filteredSelectedLayers: filteredLayers });
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

  // Função que gerencia os processamentos
  handleSendData = async () => {
    const { filteredSelectedLayers } = this.state;

    // Verifica se tem algum talhão selecionado para processamento de Ia ou gerar saúde polinomial, caso não tenha manda um alerta
    if (!filteredSelectedLayers || filteredSelectedLayers.length === 0) {
      alert("Nenhum talhão selecionado.");
      return;
    }

    // adiciona os fieldsIds correspondentes a cada talhão
    this.AddFieldsIdOnSelectedLayers();

    // Filtra os talhões com processamento de saúde polinomial e Ia
    const polinomialHealthProcess = filteredSelectedLayers.filter(layer => layer.layer.polynomialHealth);
    const aiProcessingFields = filteredSelectedLayers.filter(layer => layer.layer.aiOptions.size > 0);


    // Executa os processos de Ia e saúde polinomial, caso haja algum talhão com Ia ou saúde polinomial
    try {
      
      // Array para guardar resostas das duas funções assincronas e fazer elas serem executadas simultaneâmente 
      const processingTasks = [];

      if (polinomialHealthProcess.length > 0) {
        processingTasks.push(this.heandlePolinomialHealthProcess(polinomialHealthProcess));
      }

      if (aiProcessingFields.length > 0) {
        processingTasks.push(this.handleIaProcess(aiProcessingFields));
      }

      // Executa ambos os processamentos simultaneamente
      await Promise.all(processingTasks);

    } catch (error) {

      console.error("Erro ao processar os dados: ", error);
      alert("Erro no processamento");
    }
  };


  // Função para lidar com processamento de IA
  handleIaProcess = async (fields) => {

    const { tiles } = this.props;
    
    // Pega informações necessárias para  a requisição
    const task_id = tiles[0].meta.task.id;
    const project_id = tiles[0].meta.task.project;
    const url = `/api/projects/${project_id}/tasks/${task_id}/process`;
    const csrfToken = getCsrfToken();

    // Agrupa os talhões por tipo de cultivo
    const groupedFields = this.groupFieldsByCropType(fields);


    // Mapeia os campos agrupados por tipo de cultivo, criando um array de chamadas assíncronas
    // Para cada tipo de cultivo (cropType), monta o payload com os IDs dos talhões a serem processados 
    // e utiliza a função `makeRequest` para enviar a requisição ao endpoint especificado
    const requests = Object.entries(groupedFields).map(([cropType, layers]) => {
      const fields_to_process_ids = layers.map(layer => layer.field_id);
      const payload = {
        type: cropType,
        payload: { processing_requests: { fields_to_process: fields_to_process_ids } },
      };
      return this.makeRequest(url, payload, csrfToken);
    });

    // Executa as chamadas assíncronas e trata os resultados, caso haja algum erro, rejeita a promise
    try {
      const results = await Promise.all(requests);
      console.log("Sucesso na requisição da IA:", results);
    } catch (error) {
      console.error("Erro na requisição da IA:", error);
      throw error;
    }
  };


  // Função para lidar com processamento de Saúde polinomial
  heandlePolinomialHealthProcess = async (fields) => {

    const { tiles } = this.props;

    // Pegar informações necessárias para  a requisição
    const task_id = tiles[0].meta.task.id;
    const project_id = tiles[0].meta.task.project;
    const url = `/api/projects/${project_id}/tasks/${task_id}/process/polinomialHealth`;
    const csrfToken = getCsrfToken();

    // Agrupa os ids dos talhões
    const fields_to_process_ids = fields.map(field => field.field_id);

    // Monta o payload com os IDs dos talhões a serem processados
    const payload = {
      processing_requests: {
        fields_to_process: fields_to_process_ids,
        polynomial_degree: 3,
        points: [],
      },
    };

    // Executa a chamadas assíncrona e trata o resultado, caso haja algum erro, rejeita a promise
    try {
      const data = await this.makeRequest(url, payload, csrfToken);
      console.log("Sucesso no Polynomial Health:", data);
    } catch (error) {
      console.error("Erro no Polynomial Health:", error);
      throw error;
    }
  };


  makeRequest = async (url, payload, csrfToken) => {
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-CSRFToken': csrfToken,
      },
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      throw new Error(`Erro na requisição: ${response.status}`);
    }

    return response.json();
  };


  groupFieldsByCropType = (fields) => {

    const groupedLayers = fields.reduce((groups, current) => {
      const cropType = current.layer.cropType;

      if (!groups[cropType]) {
        groups[cropType] = [];
      }

      groups[cropType].push(current);
      return groups;
    }, {});

    return groupedLayers;
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
        <span className="close-button" onClick={this.props.onClose} />
        <div className="title">Overview</div>
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
                  {layer.name + ` - Layer ${index}` || `Layer ${index}`}
                </a>
                <ul
                  className={`list-layer-items ${!this.state.collapsedLayers[index] ? "collapsed" : ""
                    }`}
                  onClick={this.handlePopUp}
                >
                  {layer.cropType && (
                    <li>
                      Colheita: {translate(layer.cropType, "cropType")}
                    </li>
                  )}
                  {layer.aiOptions.size > 0 && (
                    <li>
                      IA: {translate([...layer.aiOptions][0], "aiOptions")}
                    </li>
                  )}
                  {layer.polynomialHealth && (
                    <li>
                      Gerar Saúde Polinomial: Sim
                    </li>
                  )}
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
