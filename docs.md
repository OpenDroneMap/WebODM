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

Depois de alterar os arquivos HTML e CSS execute o comando `docker build -t opendronemap\webodm_webapp .` estando no diretorio raiz deste projeto. Aguarde o fim da recompilação que pode demorar até 20 minutos e depois rode o comando `docker compose up` para subir o projeto. É necessário ter conexão com a internet para fazer a recompilação.
