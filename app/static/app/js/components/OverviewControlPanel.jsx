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
        .filter(
          ({ layer }) =>
            layer.cropType !== null &&
            layer.aiOptions &&
            layer.aiOptions.size > 0
        );

      this.setState({ filteredSelectedLayers: filteredLayers });
    }
  };

  handleCollapsedlistLayerItems = (index) => {
    this.setState((prevState) => ({
      collapsedLayers: {
        ...prevState.collapsedLayers,
        [index]: !prevState.collapsedLayers[index], // Toggle o estado de colapsado para esse índice
      },
    }));
  };

  handleClearOverviewLayers = () => {
    const fieldSet = new Set(["field"]);

    this.setState({ filteredSelectedLayers: [] });
    this.removeGeoJsonDetections(fieldSet);
    this.loadGeoJsonDetections(fieldSet);
  };

    handleSendData = async () => {
        const { filteredSelectedLayers } = this.state;

        if (filteredSelectedLayers.length == 0 ){
            alert("Nenhum talhão selecionado.");
            return;
        } 

        const task_id = this.tiles[0].meta.task.id;
        const project_id = this.tiles[0].meta.task.project;
        const url = `/api/projects/${project_id}/tasks/${task_id}/process`;
        const csrfToken = getCsrfToken(); 
    
        const requests = filteredSelectedLayers.map(({ layer }) => {
            const payload = {
                type: layer.cropType,
                payload: { processing_requests: { fields_to_process: [] } } // Adicionar IDs aqui
            };
            return fetch(url, {
                method: 'POST',
                headers: { 
                    'content-type': 'application/json',
                    'X-CSRFToken': csrfToken, // Adicionando o CSRF token ao cabeçalho
                },
                body: JSON.stringify(payload)
            });
        });
    
        try {
            const responses = await Promise.all(requests);
            const results = await Promise.all(responses.map(res => res.json()));
            console.log('sucess: ', results);
            alert("Talhões enviados para o processamento com sucesso.");

        } catch (error) {
            console.error('Error:', error);
        }
    

    this.removeGeoJsonDetections = this.props.removeGeoJsonDetections;
    this.loadGeoJsonDetections = this.props.loadGeoJsonDetections;
    this.tiles = this.props.tiles;
  }

  componentDidUpdate = (prevProps) => {
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
  };

  handleCollapsedlistLayerItems = (index) => {
    this.setState((prevState) => ({
      collapsedLayers: {
        ...prevState.collapsedLayers,
        [index]: !prevState.collapsedLayers[index], // Toggle o estado de colapsado para esse índice
      },
    }));
  };

  handleClearOverviewLayers = () => {
    const fieldSet = new Set(["field"]);

    this.setState({ filteredSelectedLayers: [] });
    this.removeGeoJsonDetections(fieldSet);
    this.loadGeoJsonDetections(fieldSet);
  };

  handleSendData = async () => {
    const { filteredSelectedLayers } = this.state;
    const task_id = this.tiles[0].meta.task.id;
    const project_id = this.tiles[0].meta.task.project;
    const url = `/api/projects/${project_id}/tasks/${task_id}/process`;
    const csrfToken = getCsrfToken();

    const requests = filteredSelectedLayers.map(({ layer }) => {
      const payload = {
        type: layer.cropType,
        payload: { processing_requests: { fields_to_process: [] } }, // Adicionar IDs aqui
      };
      return fetch(url, {
        method: "POST",
        headers: {
          "content-type": "application/json",
          "X-CSRFToken": csrfToken, // Adicionando o CSRF token ao cabeçalho
        },
        body: JSON.stringify(payload),
      });
    });

    try {
      const responses = await Promise.all(requests);
      const results = await Promise.all(responses.map((res) => res.json()));
      console.log("sucess: ", results);
      alert("Talhões enviados para o processamento com sucesso.");
    } catch (error) {
      console.error("Error:", error);
    }
  };

  handlePopUp = (e) => {
    const { overlays } = this.props;
    const layerSelected = this.state.filteredSelectedLayers.filter(
      (layer) => layer.index == e.target.id
    );

    if (overlays[1]) {
      const leafleatLayers = Array.from(Object.values(overlays[1]._layers));
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
        <div className="title">Visão geral</div>
        <hr />
        {this.state.filteredSelectedLayers.length > 0 ? (
          <ul className="list-overview">
            {this.state.filteredSelectedLayers.map(({ layer, index }) => (
              <li
                key={index}
                className="layer-item"
                onClick={() => this.handleCollapsedlistLayerItems(index)}
              >
                <button className="collapsed-infos-btn">
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    viewBox="0 -960 960 960"
                    width="24px"
                    fill="#FFFFFF"
                    stroke="#FFFFFF"
                    stroke-width="20"
                    style={{
                      transform: this.state.collapsedLayers[index]
                        ? "rotate(90deg)"
                        : "rotate(0deg)",
                      transition: "transform 0.3s ease", // Adiciona uma transição suave
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
                  {names[index] + ` - Camada ${index}` || `Camada ${index}`}
                </a>
                <ul
                  className={`list-layer-items ${
                    !this.state.collapsedLayers[index] ? "collapsed" : ""
                  }`}
                  onClick={this.handlePopUp}
                >
                  {/* <li>
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
                                    </li> */}
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

const names = [
  "Ana",
  "Beatriz",
  "Carlos",
  "Daniela",
  "Eduardo",
  "Fernanda",
  "Gabriel",
  "Helena",
  "Igor",
  "Juliana",
  "Kleber",
  "Luana",
  "Marcos",
  "Natalia",
  "Otávio",
  "Priscila",
  "Roberto",
  "Samantha",
  "Thiago",
  "Vanessa",
  "Wesley",
  "Yasmin",
  "Zé",
  "Amanda",
  "Bruno",
  "Camila",
  "Diego",
  "Eliane",
  "Flávio",
  "Gustavo",
  "Heloísa",
  "Isabela",
  "João",
  "Karine",
  "Leonardo",
  "Maria",
  "Nicolas",
  "Olga",
  "Pedro",
  "Queila",
  "Raul",
  "Sabrina",
  "Tiago",
  "Vânia",
  "William",
  "Zilda",
  "André",
  "Barbara",
  "Célia",
  "David",
  "Emanuelle",
  "Felipe",
  "Giovana",
  "Henrique",
  "Irene",
  "Júlio",
  "Larissa",
  "Marcelo",
  "Nayara",
  "Olavo",
  "Paula",
  "Ricardo",
  "Silvia",
  "Tânia",
  "Vinícius",
  "Wagner",
  "Yara",
  "Zeca",
  "Adriana",
  "Bernardo",
  "Cristiane",
  "Douglas",
  "Elena",
  "Flávia",
  "Gisele",
  "Hugo",
  "Jéssica",
  "Lucas",
  "Márcia",
  "Nando",
  "Patrícia",
  "Rafael",
  "Silvia",
  "Tatiane",
  "Valter",
  "Wellington",
  "Zuleica",
  "Aline",
  "Bruna",
  "César",
  "Daniel",
  "Evelyn",
  "Fábio",
  "Gisele",
  "Helena",
];

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

const translate = (value, type) => {
  return translations[type] && translations[type][value]
    ? translations[type][value]
    : value;
};
