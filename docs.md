# Documentação

## Download dos ortomosaicos

O download dos ortomosaicos é feito através da classe `TaskDownloads`.

- Localização:
  - Linha: 360
  - Arquivo: [tasks.py](https://github.com/LSIIM/WebODM/blob/master/app/api/tasks.py "tasks.py")

Ele também pode ser feito por outra classe que ainda não foi identificada mas é refenciada no comentário. O download é primeiro pegando a stream do node e depois baixando o arquivo pela stream.

## API de acesso aos tiles usados para criação do mapa

- X, Y: posições calculadas a partir da latitude e longitude. Ler: [Calcular X e Y](https://stackoverflow.com/questions/21513646/how-to-get-x-y-z-coordinates-of-tile-by-click-on-leaflet-map "Calcular X e Y")
- Z: zoom.
- Localização:
  - Linha: 39-44.
  - Arquivo: [url.py](https://github.com/LSIIM/WebODM/blob/master/app/api/urls.py "url.py")

Essa api é usada no front-end com uma biblioteca chamada de leaflet que é utilizada para desenhar o mapa. Para mais informações: [Leaflet](https://leafletjs.com/reference.html "Leaflet")

### Documentação da API para Recuperação dos Dados de Detecção de AI

Esta API provê endpoints para acessar arquivos GeoJSON que contêm dados de detecções AI realizadas em tarefas específicas dentro de projetos. Cada endpoint suporta o método HTTP GET e retorna informações específicas conforme descrito abaixo:

#### Detecção de Gado

- **Endpoint:**`http://<webapp_ip>:<webapp_port>/api/projects/<project_id>/tasks/<task_id>/ai/detections/cattle`
- **Método:** GET
- **Descrição:** Retorna um JSON contendo o conteúdo do arquivo GeoJSON de detecção de gado, se disponível. Este arquivo inclui as áreas identificadas com presença de gado na área especificada da tarefa.

#### Detecção de Culturas (Soja ou Milho)

- **Endpoint:**`http://<webapp_ip>:<webapp_port>/api/projects/<project_id>/tasks/<task_id>/ai/detections/<detection_type>`
  - Substitua `<detection_type>` por `soy` para detecções de soja ou `corn` para detecções de milho.
- **Método:** GET
- **Descrição:** Retorna uma lista de objetos, cada um contendo o conteúdo de um arquivo GeoJSON para a detecção do tipo de cultura especificado (`soy` ou `corn`). Cada objeto representa um talhão diferente na área da tarefa especificados e possuem os atributos `filed_number`, que referencia o ID do talhão, e `content` que contém os dados do arquivo GeoJSON.

#### Detecção de Polígonos de Campos

- **Endpoint:**`http://<webapp_ip>:<webapp_port>/api/projects/<project_id>/tasks/<task_id>/ai/detections/field`
- **Método:** GET
- **Descrição:** Retorna um JSON com o conteúdo do arquivo GeoJSON que mapeia os polígonos dos talhões dentro da área da tarefa especificada.

### Notas Adicionais:

- **Autenticação:** **AINDA DEVE SER IMPLEMENTADO A VERIFICAÇÃO DE AUTENTICAÇÃO**
- **Erros:** Em caso de falhas, como arquivos não encontrados ou permissões insuficientes, a API retornará um erro com uma mensagem explicativa.

Substitua `<webapp_ip>` e `<webapp_port>` pelos valores corretos do seu ambiente para acessar os endpoints. Em ambiente de desenvolvimento é `http://localhost:8000`

## API para iniciar processamento dos ortomosaicos


- **Endpoint:**`http://<webapp_ip>:<webapp_port>/api/projects/<project_id>/tasks/<task_id>/process`
- **Método:** POST
- **Query Parameters:**
  - `project_pk` (integer, required): ID do projeto.
  - `pk` (string, required): ID da tarefa.
- **Headers:**
  - `User-Agent: insomnia/8.6.1`
- **Descrição:** Envia um `payload` para um endpoint especificado pela variavel de ambiente `WO_AGROSMART_API_ADDRESS`. O `type` e `subtype` indentificam qual subrota será chamada. 

- **Body Schema:**
  ```json
  {
    "type": {
      "type": "string"
    },
    "subtype": {
      "type": "string"
    },
    "payload": {
      "type": "object"
    },
    "required": ["type", "payload"]
  }
  ```

### Tipo: cattle

- **Body Schema:**
  ```json
  {
    "type": "cattle",
    "payload": {
      "processing_requests": {
        "identification": { "type": "boolean" },
        "weight": { "type": "boolean" }
      },
      "required": ["identification", "weight"]
    },
    "required": ["type", "payload"]
  }
  ```

- **Example Body:**
  ```json
  {
    "type": "cattle",
    "payload": {
      "processing_requests": {
        "identification": true,
        "weight": true
      }
    }
  }
  ```

### Tipo: polynomial-health

- **Body Schema:**
  ```json
  {
    "type": "polynomial-health",
    "payload": {
        "processing_requests": {
        "fields_to_process": {
          "type": "array",
          "items": {
            "type": "object",
            "properties": {
              "field_id": { "type": "number" },
              "polynomial_degree": {
                "type": "number"
              },
              "points": {
                "type": "array",
                "items": {
                  "type": "object",
                  "properties": {
                    "x": { "type": "number" },
                    "y": { "type": "number" }
                  },
                  "required": ["x", "y"]
                }
              }
            },
            "required": [
              "field_id",
              "polynomial_degree",
              "points"
            ]
          }
        }
      },
      "required": ["fields_to_process"]
    },
    "required": ["type", "payload"]
  }
  ```

- **Example Body:**
  ```json
  {
    "type": "polynomial-health",
    "payload": {
      "processing_requests": {
        "fields_to_process": [
          {
            "field_id": 0,
            "polynomial_degree": 2,
            "points": [
              { "x": 0, "y": 0 },
              { "x": 1, "y": 1 }
            ]
          }
        ]
      }
    }
  }
  ```

### Tipo: weeds; Subtipo: soy

- **Body Schema:**
  ```json
  {
    "type": "weeds",
    "subtype": "soy",
    "payload": {
      "processing_requests": {
       "fields_to_process": {
         "type": "array",
         "items": { "type": "number" }
       }
      },
      "required": ["fields_to_process"]
    },
    "required": ["type", "payload"]
  }
  ```

- **Example Body:**
  ```json
  {
    "type": "weeds",
    "subtype": "soy",
    "payload": {
        "processing_requests": {
        "fields_to_process": [3, 4, 5]
      }
    }
  }
  ```

## Exibição do Mapa

Ele é divido em dois componentes, o primeiro componente a `MapView` é responsável por exibir algumas informações adicionais além do mapa. Onde a magia realmente acontece é no componente chamado `Map`.

- `MapView` Localização:

  - Linha: 8
  - Arquivo: [MapView.jsx](https://github.com/LSIIM/WebODM/blob/master/app/static/app/js/MapView.jsx "MapView.jsx")
  - Nota: A funcionalidade de renderição está na função render, como é o padrão de componentes do React.

- `Map` Localização:
  - Linha: 33
  - Arquivo: [Map.jsx](https://github.com/LSIIM/WebODM/blob/master/app/static/app/js/components/Map.jsx "Map.jsx")
  - Nota: A função mais importante é a `loadImageryLayers` porque ela é responsável por passar a api dos tiles do back-end para leaflet que irá renderizar a imagem. Ali é possível incluir código para criar novos popups, desenhar poligonos e adicionar os própiros tiles desde que seja seguido o padrão do leaflet e passado uma api adequada. Ler: [Leaflet](https://leafletjs.com/reference.html "Leaflet"). _É ali que seria possível implementar o desenho das detecções de objeto e da divisão de talhões._

## Primeira build

Execute o comando `docker build -f "./Dockerfile_Base" -t webodm_webapp_base:latest .` para contruir a imagem base e depois execute o comando `docker build -t webodm_webapp:latest .`, somente então execute `docker compose up`

## Como passar modificações para produção

Depois de alterar os arquivos HTML e CSS execute o comando `docker build -t webodm_webapp:latest .` estando no diretorio raiz deste projeto. Aguarde o fim da recompilação que pode demorar até 20 minutos e depois rode o comando `docker compose up` para subir o projeto. É necessário ter conexão com a internet para fazer a recompilação.
