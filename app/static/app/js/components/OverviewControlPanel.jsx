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


  /**
 * Alterna o estado colapsado de um talhão listado no popup.
 *
 * @param {number} index - O índice do item na lista de camadas cujo estado de colapso será alternado.
 * @returns {void}
 *
 */
  handleCollapsedlistLayerItems = (index) => {
    this.setState((prevState) => ({
      collapsedLayers: {
        ...prevState.collapsedLayers,
        [index]: !prevState.collapsedLayers[index],
      },
    }));
  };

  /**
 * Reseta os talhões marcados no mapa.
 *
 * @returns {void}
 *
 */
  handleClearOverviewLayers = () => {
    const fieldSet = new Set(["field"]);

    this.setState({ filteredSelectedLayers: [] });
    this.removeGeoJsonDetections(fieldSet);
    this.loadGeoJsonDetections(fieldSet);
  };

  /**
 * Adiciona o campo `field_id` aos talhões selecionados.
 *
 * @returns {void} Não retorna um valor, mas atualiza os objetos das camadas selecionadas adicionando o campo `field_id` quando identificado.
 *
 * @description
 * A função busca o campo `field_id` (ou `Field_id`, dependendo do caso) nas propriedades das camadas presentes em `overlays` 
 * e o adiciona às camadas selecionadas em `filteredSelectedLayers`, com base na comparação das coordenadas dos limites (`bounds`).
 * Somente camadas cujos limites coincidam serão atualizadas.
 */
  AddFieldsIdOnSelectedLayers = () => {
    const { filteredSelectedLayers } = this.state;
    const { overlays } = this.props;

    // Filtra o local onde os layers estão armazenados dentro da props overlays
    const overlayWithLayers = overlays.find(overlay => overlay && overlay._layers);

    // Veridica se os layers foram encontrados corretamente
    if (overlayWithLayers) {

      // Extrai os layers do mapa e converte para um array para facilitar a iteração
      const leafleatLayers = Array.from(Object.values(overlayWithLayers._layers));

      // Itera sobre cada talhão selecionado
      filteredSelectedLayers.forEach(selectedLayer => {

        // Obtem os limites do talhão selecionado
        const bounds2 = selectedLayer.layer.bounds;

        // Itera sobre os layers do mapa que comtém os IDs buscados
        leafleatLayers.forEach(leafletLayer => {

          // Obtem os limites dos layers do mapa
          const bounds1 = leafletLayer._bounds;

          // Verifica a correspondência entre os limites dos talhões para identificar os layers no overview que correspondem aos talhões selecionados
          const isBoundsEqual = (
            bounds1._northEast.lat === bounds2._northEast.lat &&
            bounds1._northEast.lng === bounds2._northEast.lng &&
            bounds1._southWest.lat === bounds2._southWest.lat &&
            bounds1._southWest.lng === bounds2._southWest.lng
          );

          // Verifica se existe um layer correspondente ao talhão marcado
          if (isBoundsEqual) {

            // Obtem as propriedades do layer corresponde
            const featureProps = leafletLayer.feature.properties;

            // Verifica se existe o campo field_id no layer corresponde
            if ('field_id' in featureProps) {

              // Adiciona o field_id ao talhão selecionado
              selectedLayer.field_id = featureProps.field_id;
            }
          }
        });
      });
    }
  };

  /**
 * Gerencia o envio e processamento dos dados selecionados.
 *
 * @returns {void} Não retorna um valor, mas executa os processos de IA e saúde polinomial para os talhões selecionados.
 *
 * @description
 * - Verifica se há talhões selecionados para processamento. Se não houver, exibe um alerta ao usuário.
 * - Adiciona os `fieldIds` correspondentes aos talhões selecionados usando a função `AddFieldsIdOnSelectedLayers`.
 * - Filtra os talhões que possuem opções de saúde polinomial e IA.
 * - Executa os processos de saúde polinomial e IA de forma assíncrona e simultânea, caso aplicável.
 * - Trata possíveis erros durante o processamento e exibe um alerta caso ocorra algum problema.
 */
  handleSendData = async () => {
    const { filteredSelectedLayers } = this.state;

    // Verifica se tem algum talhão selecionado para processamento de IA ou gerar saúde polinomial, caso não tenha manda um alerta
    if (!filteredSelectedLayers || filteredSelectedLayers.length === 0) {
      alert("Nenhum talhão selecionado.");
      return;
    }

    // adiciona os fieldsIds correspondentes a cada talhão
    this.AddFieldsIdOnSelectedLayers();

    // Filtra os talhões com processamento de saúde polinomial e IA
    const polinomialHealthProcess = filteredSelectedLayers.filter(layer => layer.layer.polynomialHealth);
    const aiProcessingFields = filteredSelectedLayers.filter(layer => layer.layer.aiOptions.size > 0);

    // Tenta lidar com os processamentos, caso não consiga exibe um alerta de erro
    try {

      // Array para guardar resostas das duas funções assincronas e fazer elas serem executadas simultaneâmente 
      const processingTasks = [];

      // Caso haja algum talhão com saúde polinomial, executa a função de processamento de saúde polinomial
      if (polinomialHealthProcess.length > 0) {
        processingTasks.push(this.heandlePolinomialHealthProcess(polinomialHealthProcess));
      }

      // Caso haja algum talhão com IA, executa a função de processamento de IA
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


  /**
 * Lida com o processamento de IA para os talhões selecionados.
 *
 * @param {Array} fields - Lista de talhões selecionados para processamento de IA.
 * @returns {Promise<void>} Retorna uma Promise que resolve após todas as requisições de processamento serem concluídas.
 *
 * @description
 * - Obtém as informações necessárias para construir a requisição, como `task_id`, `project_id` e a URL do endpoint.
 * - Agrupa os talhões por tipo de cultivo utilizando a função `groupFieldsByCropType`.
 * - Para cada tipo de cultivo, monta um payload contendo os IDs dos talhões a serem processados.
 * - Envia as requisições de forma assíncrona utilizando a função `makeRequest`.
 * - Trata os resultados das requisições, exibindo sucesso no console ou lançando um erro em caso de falha.
 */
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


  /**
 * Lida com o processamento de Saúde Polinomial para os talhões selecionados.
 *
 * @param {Array} fields - Lista de talhões selecionados para processamento de Saúde Polinomial.
 * @returns {Promise<void>} Retorna uma Promise que resolve após a requisição de processamento ser concluída.
 *
 * @description
 * - Obtém as informações necessárias para construir a requisição, como `task_id`, `project_id` e a URL do endpoint.
 * - Agrupa os IDs dos talhões que serão processados.
 * - Monta um payload contendo os IDs dos talhões, o grau do polinômio (3 por default) e os pontos do talhão.
 * - Envia a requisição de forma assíncrona utilizando a função `makeRequest`.
 * - Trata o resultado da requisição, exibindo sucesso no console ou lançando um erro em caso de falha.
 */

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
        polynomial_degree: 3, // DEFAULT
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


  /**
   * Realiza uma requisição POST assíncrona para o endpoint especificado.
   *
   * @param {string} url - URL do endpoint para onde a requisição será enviada.
   * @param {Object} payload - Dados que serão enviados no corpo da requisição.
   * @param {string} csrfToken - Token CSRF utilizado para autenticação da requisição.
   * @returns {Promise<Object>} Retorna uma Promise que resolve com o corpo da resposta em formato JSON.
   *
   */
  makeRequest = async (url, payload, csrfToken) => {
    // Realiza a requisição com o método POST e as opções configuradas
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-CSRFToken': csrfToken,
      },
      body: JSON.stringify(payload),
    });

    // Verifica se a resposta da requisição é bem-sucedida 
    if (!response.ok) {
      // Lança um erro se o status HTTP não for bem-sucedido
      throw new Error(`Erro na requisição: ${response.status}`);
    }

    // Retorna o corpo da resposta convertido para JSON
    return response.json();
  };


  /**
 * Agrupa os talhões com base no tipo de cultivo.
 *
 * @param {Array<Object>} fields - Lista de objetos representando os talhões selecionados.
 * @returns {Object} Objeto onde as chaves são os tipos de cultivo (`cropType`) 
 *                   e os valores são arrays de talhões correspondentes.
 * 
 */
  groupFieldsByCropType = (fields) => {
    // Reduz o array de talhões (`fields`) para um objeto agrupado por tipo de cultivo (`cropType`)
    const groupedLayers = fields.reduce((groups, current) => {
      const cropType = current.layer.cropType; // Obtém o tipo de cultivo do talhão atual

      // Verifica se o tipo de cultivo já existe no grupo; caso contrário, inicializa como um array vazio
      if (!groups[cropType]) {
        groups[cropType] = [];
      }

      // Adiciona o talhão atual ao grupo correspondente ao seu tipo de cultivo
      groups[cropType].push(current);

      return groups; // Retorna o objeto acumulador atualizado
    }, {}); // Inicializa o objeto acumulador como um objeto vazio

    // Retorna o objeto contendo os talhões agrupados por tipo de cultivo
    return groupedLayers;
  };



  /**
 * Abre o popup do talhão correspondente quando um evento é disparado.
 *
 * @param {Object} e - O evento disparado (por exemplo, um clique em um talhão).
 * @returns {void}
 *
 * @description
 * - Filtra o talhão correspondente ao evento com base no `id` do alvo.
 * - Procura o overlay que contém as camadas correspondentes.
 * - Compara as coordenadas de limites de cada camada para identificar a camada correspondente ao talhão selecionado.
 * - Se o talhão correspondente for encontrado, abre o popup da camada, caso ainda não esteja aberto.
 */
  handlePopUp = (e) => {
    // Obtém as camadas de sobreposição (overlays) da props
    const { overlays } = this.props;

    // Filtra o talhão selecionado com base no `id` do alvo do evento
    const layerSelected = this.state.filteredSelectedLayers.filter(
      (layer) => layer.index == e.target.id // Compara o índice do talhão com o id do alvo
    );

    // Encontra o overlay que contém as camadas (layers)
    const overlayWithLayers = overlays.find(overlay => overlay && overlay._layers);

    if (overlayWithLayers) {
      // Converte as camadas em um array para facilitar o processamento
      const leafleatLayers = Array.from(Object.values(overlayWithLayers._layers));

      // Filtra as camadas para encontrar a que corresponde aos limites do talhão selecionado
      const reflayerLeafLeat = leafleatLayers.filter((layer) => {
        return (
          layer._bounds && // Verifica se a camada tem limites (bounds)
          layerSelected[0] && // Verifica se um talhão foi selecionado
          layerSelected[0].layer && // Verifica se o talhão tem camada associada
          layerSelected[0].layer.bounds && // Verifica se o talhão tem limites
          layer._bounds._northEast.lat === // Verifica se os limites da camada correspondem aos limites do talhão
          layerSelected[0].layer.bounds._northEast.lat &&
          layer._bounds._northEast.lng ===
          layerSelected[0].layer.bounds._northEast.lng &&
          layer._bounds._southWest.lat ===
          layerSelected[0].layer.bounds._southWest.lat &&
          layer._bounds._southWest.lng ===
          layerSelected[0].layer.bounds._southWest.lng
        );
      });

      // Se a camada correspondente for encontrada
      if (reflayerLeafLeat.length > 0) {
        const layer = reflayerLeafLeat[0];

        // Verifica se a camada tem um popup associado
        if (layer.getPopup()) {
          // Se o popup não estiver aberto, abre o popup
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
