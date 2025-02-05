import React from 'react';
import ReactDOM from 'ReactDOM';
import '../css/Map.scss';
import 'leaflet/dist/leaflet.css';
import Leaflet from 'leaflet';
import async from 'async';
import '../vendor/leaflet/L.Control.MousePosition.css';
import '../vendor/leaflet/L.Control.MousePosition';
import '../vendor/leaflet/Leaflet.Autolayers/css/leaflet.auto-layers.css';
import '../vendor/leaflet/Leaflet.Autolayers/leaflet-autolayers';
// import '../vendor/leaflet/L.TileLayer.NoGap';
import Dropzone from '../vendor/dropzone';
import $ from 'jquery';
import ErrorMessage from './ErrorMessage';
import ImagePopup from './ImagePopup';
import GCPPopup from './GCPPopup';
import SwitchModeButton from './SwitchModeButton';
import ShareButton from './ShareButton';
import AssetDownloads from '../classes/AssetDownloads';
import { addTempLayer, addTempLayerUsingRequest } from '../classes/TempLayer';
import PropTypes from 'prop-types';
import PluginsAPI from '../classes/plugins/API';
import Basemaps from '../classes/Basemaps';
import Standby from './Standby';
import LayersControl from './LayersControl';
import OverviewControl from './OverviewControl';
import MarkFieldsControl from './MarkFieldsControl';
import SprayLineControl from './SprayLineControl';
import update from 'immutability-helper';
import Utils from '../classes/Utils';
import '../vendor/leaflet/Leaflet.Ajax';
import 'rbush';
import '../vendor/leaflet/leaflet-markers-canvas';
import { _ } from '../classes/gettext';
import ProcessingCard from './ProcessingCard';



class Map extends React.Component {
  static defaultProps = {
    showBackground: false,
    mapType: "orthophoto",
    public: false,
    shareButtons: true,
    aiSelected: new Set()
  };

  static propTypes = {
    showBackground: PropTypes.bool,
    tiles: PropTypes.array.isRequired,
    mapType: PropTypes.oneOf(['orthophoto', 'plant', 'dsm', 'dtm', 'polyhealth']),
    public: PropTypes.bool,
    shareButtons: PropTypes.bool,
    aiSelected: PropTypes.object,
    aiTypes: PropTypes.array.isRequired,
  };

  constructor(props) {
    super(props);

    this.state = {
      error: "",
      singleTask: null, // When this is set to a task, show a switch mode button to view the 3d model
      pluginActionButtons: [],
      showLoading: false, // for drag&drop of files and first load
      opacity: 100,
      imageryLayers: [],
      overlays: [],
      selectedLayers: [],
      isDrawing: false,
      openPopup: null
    };

    this.basemaps = {};
    this.mapBounds = null;
    this.autolayers = null;
    this.addedCameraShots = false;

    this.loadImageryLayers = this.loadImageryLayers.bind(this);
    this.updatePopupFor = this.updatePopupFor.bind(this);
    this.handleMapMouseDown = this.handleMapMouseDown.bind(this);
    this.loadGeoJsonDetections = this.loadGeoJsonDetections.bind(this);
    this.removeGeoJsonDetections = this.removeGeoJsonDetections.bind(this);
    this.setSelectedLayers = this.setSelectedLayers.bind(this);
    this.getSelectedLayers = this.getSelectedLayers.bind(this);
    this.togglePopup = this.togglePopup.bind(this);
  }

  setOpacityForLayer(layer, opacity) {
    layer.setStyle({ opacity: opacity });
  }

  updateOpacity = (evt) => {
    this.setState({
      opacity: parseFloat(evt.target.value),
    });
  }

  setSelectedLayers(idx, el) {
    //Verifica se todos os nomes ja foram utilizados e, caso todos tenham sido utilizados, reutiliza os nomes anteriores com um valor do lado
    let counter = "";
    const value = Math.floor(idx / names.length);
    let nameIdx = idx;
    if (value >= 1) {
      counter = " " + (value + 1);
      nameIdx = nameIdx - (names.length * value);
    }
    el.name = names[nameIdx] + counter;

    if (idx >= this.state.selectedLayers.length) {
      this.setState(update(this.state,
        { selectedLayers: { $push: [el] } }
      ));
    } else {
      // Atualiza o elemento no índice idx
      this.setState(update(this.state,
        { selectedLayers: { [idx]: { $set: el } } }
      ));
    }
  }

  getSelectedLayers() {
    return this.state.selectedLayers;
  }

  setPolygonColor(polygon) {
    polygon.eachLayer((layer) => {
      if (layer.feature.properties.obstacle === true) {
        layer.setStyle({ color: 'red', fillOpacity: 0.5 });
      }
    });
  }

  loadGeoJsonDetections(types_to_be_loaded) {
    const { tiles } = this.props;
    const task_id = tiles[0].meta.task.id;
    const project_id = tiles[0].meta.task.project;

    const base_url = `/api/projects/${project_id}/tasks/${task_id}/ai/detections/`;

    types_to_be_loaded.forEach((typ) => {
      addTempLayerUsingRequest(base_url + typ, typ, this.props.aiTypes, [this.getSelectedLayers, this.setSelectedLayers], (error, tempLayer, api_url) => {
        if (!error) {
          this.setOpacityForLayer(tempLayer, 1);
          this.setPolygonColor(tempLayer);
          tempLayer.addTo(this.map);
          tempLayer[Symbol.for("meta")] = { name: typ };
          this.setState(update(this.state, {
            overlays: { $push: [tempLayer] }
          }));
          this.map.fitBounds(tempLayer.options.bounds);
        } else {
          this.setState({ error: error.message || JSON.stringify(error) });
        }
      });
    });
  }


  // types_to_be_removed is a Set.
  removeGeoJsonDetections(types_to_be_removed) {
    this.state.overlays.forEach((layer, idx) => {
      if (layer[Symbol.for("meta")]["name"] != null && types_to_be_removed.has(layer[Symbol.for("meta")]["name"])) {
        this.map.removeLayer(layer);
        delete this.state.overlays[idx];
      }
      if (layer[Symbol.for("meta")]["name"] != null && layer[Symbol.for("meta")]["name"] == "field") {
        this.state.selectedLayers = [];
      }
    });
  }

  updatePopupFor(layer) {
    const popup = layer.getPopup();
    $('#layerOpacity', popup.getContent()).val(layer.options.opacity);
  }

  typeToHuman = (type) => {
    switch (type) {
      case "orthophoto":
        return _("Orthophoto");
      case "plant":
        return _("Plant Health");
      case "dsm":
        return _("DSM");
      case "dtm":
        return _("DTM");
      case "polyhealth":
        return _("Polynomial Health");
    }
    return "";
  }

  hasBands = (bands, orthophoto_bands) => {
    if (!orthophoto_bands) return false;

    for (let i = 0; i < bands.length; i++) {
      if (orthophoto_bands.find(b => b.description !== null && b.description.toLowerCase() === bands[i].toLowerCase()) === undefined) return false;
    }

    return true;
  }


  loadImageryLayers(forceAddLayers = false) {
    // Cancel previous requests
    if (this.tileJsonRequests) {
      this.tileJsonRequests.forEach(tileJsonRequest => tileJsonRequest.abort());
      this.tileJsonRequests = [];
    }

    const { tiles } = this.props,
      layerId = layer => {
        const meta = layer[Symbol.for("meta")];
        return meta.task.project + "_" + meta.task.id;
      };

    // Remove all previous imagery layers
    // and keep track of which ones were selected
    const prevSelectedLayers = [];

    this.state.imageryLayers.forEach(layer => {
      if (this.map.hasLayer(layer)) prevSelectedLayers.push(layerId(layer));
      layer.remove();
    });
    this.setState({ imageryLayers: [] });

    // Request new tiles
    return new Promise((resolve, reject) => {
      this.tileJsonRequests = [];

      async.each(tiles, (tile, done) => {
        const { url, meta, type } = tile;

        let metaUrl = url + "metadata";

        if (type == "plant") {
          if (meta.task && meta.task.orthophoto_bands && meta.task.orthophoto_bands.length === 2) {
            // Single band, probably thermal dataset, in any case we can't render NDVI
            // because it requires 3 bands
            metaUrl += "?formula=Celsius&bands=L&color_map=magma";
          } else if (meta.task && meta.task.orthophoto_bands) {
            let formula = this.hasBands(["red", "green", "nir"], meta.task.orthophoto_bands) ? "NDVI" : "VARI";
            metaUrl += `?formula=${formula}&bands=auto&color_map=rdylgn`;
          } else {
            // This should never happen?
            metaUrl += "?formula=NDVI&bands=RGN&color_map=rdylgn";
          }
        } else if (type == "dsm" || type == "dtm") {
          metaUrl += "?hillshade=6&color_map=viridis";
        }

        this.tileJsonRequests.push($.getJSON(metaUrl)
          .done(mres => {
            const { scheme, name, maxzoom, statistics } = mres;

            const bounds = Leaflet.latLngBounds(
              [mres.bounds.value.slice(0, 2).reverse(), mres.bounds.value.slice(2, 4).reverse()]
            );

            // Build URL
            let tileUrl = mres.tiles[0];
            const TILESIZE = 512;

            // Set rescale
            if (statistics) {
              const params = Utils.queryParams({ search: tileUrl.slice(tileUrl.indexOf("?")) });
              if (statistics["1"]) {
                // Add rescale
                let min = Infinity;
                let max = -Infinity;
                if (type === 'plant') {
                  // percentile
                  for (let b in statistics) {
                    min = Math.min(statistics[b]["percentiles"][0]);
                    max = Math.max(statistics[b]["percentiles"][1]);
                  }
                } else {
                  // min/max
                  for (let b in statistics) {
                    min = Math.min(statistics[b]["min"]);
                    max = Math.max(statistics[b]["max"]);
                  }
                }
                params["rescale"] = encodeURIComponent(`${min},${max}`);
              } else {
                console.warn("Cannot find min/max statistics for dataset, setting to -1,1");
                params["rescale"] = encodeURIComponent("-1,1");
              }

              params["size"] = TILESIZE;
              tileUrl = Utils.buildUrlWithQuery(tileUrl, params);
            } else {
              tileUrl = Utils.buildUrlWithQuery(tileUrl, { size: TILESIZE });
            }

            const layer = Leaflet.tileLayer(tileUrl, {
              bounds,
              minZoom: 0,
              maxZoom: maxzoom + 99,
              maxNativeZoom: maxzoom - 1,
              tileSize: TILESIZE,
              tms: scheme === 'tms',
              opacity: this.state.opacity / 100,
              detectRetina: true
            });

            // Associate metadata with this layer
            meta.name = name + ` (${this.typeToHuman(type)})`;
            meta.metaUrl = metaUrl;
            layer[Symbol.for("meta")] = meta;
            layer[Symbol.for("tile-meta")] = mres;

            if (forceAddLayers || prevSelectedLayers.indexOf(layerId(layer)) !== -1) {
              layer.addTo(this.map);
            }

            // Show 3D switch button only if we have a single orthophoto
            if (tiles.length === 1) {
              this.setState({ singleTask: meta.task });
            }

            // For some reason, getLatLng is not defined for tileLayer?
            // We need this function if other code calls layer.openPopup()
            let self = this;
            layer.getLatLng = function () {
              let latlng = self.lastClickedLatLng ?
                self.lastClickedLatLng :
                this.options.bounds.getCenter();
              return latlng;
            };

            var popup = L.DomUtil.create('div', 'infoWindow');

            popup.innerHTML = `<div class="title">
                                    ${name}
                                </div>
                                <div class="popup-opacity-slider">Opacity: <input id="layerOpacity" type="range" value="${layer.options.opacity}" min="0" max="1" step="0.01" /></div>
                                <div>Bounds: [${layer.options.bounds.toBBoxString().split(",").join(", ")}]</div>
                                <ul class="asset-links loading">
                                    <li><i class="fa fa-spin fa-sync fa-spin fa-fw"></i></li>
                                </ul>

                                <button
                                    onclick="location.href='/3d/project/${meta.task.project}/task/${meta.task.id}/';"
                                    type="button"
                                    class="switchModeButton btn btn-sm btn-secondary">
                                    <i class="fa fa-cube"></i> 3D
                                </button>`;

            layer.bindPopup(popup);

            $('#layerOpacity', popup).on('change input', function () {
              layer.setOpacity($('#layerOpacity', popup).val());
            });

            this.setState(update(this.state, {
              imageryLayers: { $push: [layer] }
            }));

            let mapBounds = this.mapBounds || Leaflet.latLngBounds();
            mapBounds.extend(bounds);
            this.mapBounds = mapBounds;

            // Add camera shots layer if available
            if (meta.task && meta.task.camera_shots && !this.addedCameraShots) {

              var camIcon = L.icon({
                iconUrl: "/static/app/js/icons/marker-camera.png",
                iconSize: [41, 46],
                iconAnchor: [17, 46],
              });

              const shotsLayer = new L.MarkersCanvas();
              $.getJSON(meta.task.camera_shots)
                .done((shots) => {
                  if (shots.type === 'FeatureCollection') {
                    let markers = [];

                    shots.features.forEach(s => {
                      let marker = L.marker(
                        [s.geometry.coordinates[1], s.geometry.coordinates[0]],
                        { icon: camIcon }
                      );
                      markers.push(marker);

                      if (s.properties && s.properties.filename) {
                        let root = null;
                        const lazyrender = () => {
                          if (!root) root = document.createElement("div");
                          ReactDOM.render(<ImagePopup task={meta.task} feature={s} />, root);
                          return root;
                        }

                        marker.bindPopup(L.popup(
                          {
                            lazyrender,
                            maxHeight: 450,
                            minWidth: 320
                          }));
                      }
                    });

                    shotsLayer.addMarkers(markers, this.map);
                  }
                });
              shotsLayer[Symbol.for("meta")] = { name: name + " " + _("(Cameras)"), icon: "fa fa-camera fa-fw" };

              this.setState(update(this.state, {
                overlays: { $push: [shotsLayer] }
              }));

              this.addedCameraShots = true;
            }

            // Add ground control points layer if available
            if (meta.task && meta.task.ground_control_points && !this.addedGroundControlPoints) {
              const gcpIcon = L.icon({
                iconUrl: "/static/app/js/icons/marker-gcp.png",
                iconSize: [41, 46],
                iconAnchor: [17, 46],
              });

              const gcpLayer = new L.MarkersCanvas();
              $.getJSON(meta.task.ground_control_points)
                .done((gcps) => {
                  if (gcps.type === 'FeatureCollection') {
                    let markers = [];

                    gcps.features.forEach(gcp => {
                      let marker = L.marker(
                        [gcp.geometry.coordinates[1], gcp.geometry.coordinates[0]],
                        { icon: gcpIcon }
                      );
                      markers.push(marker);

                      if (gcp.properties && gcp.properties.observations) {
                        let root = null;
                        const lazyrender = () => {
                          if (!root) root = document.createElement("div");
                          ReactDOM.render(<GCPPopup task={meta.task} feature={gcp} />, root);
                          return root;
                        }

                        marker.bindPopup(L.popup(
                          {
                            lazyrender,
                            maxHeight: 450,
                            minWidth: 320
                          }));
                      }
                    });

                    gcpLayer.addMarkers(markers, this.map);
                  }
                });
              gcpLayer[Symbol.for("meta")] = { name: name + " " + _("(GCPs)"), icon: "far fa-dot-circle fa-fw" };

              this.setState(update(this.state, {
                overlays: { $push: [gcpLayer] }
              }));

              this.addedGroundControlPoints = true;
            }

            done();
          })
          .fail((_, __, err) => done(err))
        );
      }, err => {
        if (err) {
          if (err !== "abort") {
            this.setState({ error: err.message || JSON.stringify(err) });
          }
          reject();
        } else resolve();
      });
    });
  }

  togglePopup(popup) {
    this.setState({
      openPopup: popup,
    })
  }


  updateControlPlugin() {
    if (PluginsAPI.Map.contoursControl?.update) {
      PluginsAPI.Map.contoursControl.update(this.state.openPopup, this.togglePopup);
    }
  }

  updateMeasurePlugin() {
    if (PluginsAPI.Map.measureControl?.update) {
      PluginsAPI.Map.measureControl.update(this.state.openPopup);
    }
  }

  componentDidMount() {
    const { showBackground, tiles } = this.props;

    this.map = Leaflet.map(this.container, {
      scrollWheelZoom: true,
      positionControl: true,
      zoomControl: false,
      minZoom: 0,
      maxZoom: 24
    });

    // For some reason, in production this class is not added (but we need it)
    // leaflet bug?
    $(this.container).addClass("leaflet-touch");



    let scaleControl = Leaflet.control.scale({
      maxWidth: 250,
    }).addTo(this.map);

    //add zoom control with your options
    let zoomControl = Leaflet.control.zoom({
      position: 'bottomleft'
    }).addTo(this.map);

    if (showBackground) {
      this.basemaps = {};

      Basemaps.forEach((src, idx) => {
        const { url, ...props } = src;
        const tileProps = Utils.clone(props);
        tileProps.maxNativeZoom = tileProps.maxZoom;
        tileProps.maxZoom = tileProps.maxZoom + 99;
        const layer = L.tileLayer(url, tileProps);

        if (idx === 0) {
          layer.addTo(this.map);
        }

        this.basemaps[props.label] = layer;
      });

      const customLayer = L.layerGroup();
      customLayer.on("add", a => {
        const defaultCustomBm = window.localStorage.getItem('lastCustomBasemap') || 'https://tile.openstreetmap.org/{z}/{x}/{y}.png';

        let url = window.prompt([_('Enter a tile URL template. Valid coordinates are:'),
        _('{z}, {x}, {y} for Z/X/Y tile scheme'),
        _('{-y} for flipped TMS-style Y coordinates'),
          '',
        _('Example:'),
          'https://tile.openstreetmap.org/{z}/{x}/{y}.png'].join("\n"), defaultCustomBm);

        if (url) {
          customLayer.clearLayers();
          const l = L.tileLayer(url, {
            maxNativeZoom: 24,
            maxZoom: 99,
            minZoom: 0
          });
          customLayer.addLayer(l);
          l.bringToBack();
          window.localStorage.setItem('lastCustomBasemap', url);
        }
      });
      this.basemaps[_("Custom")] = customLayer;
      this.basemaps[_("None")] = L.layerGroup();
    }


    // Drag & Drop overlays
    const addDnDZone = (container, opts) => {
      const mapTempLayerDrop = new Dropzone(container, opts);
      mapTempLayerDrop.on("addedfile", (file) => {
        this.setState({ showLoading: true });
        addTempLayer(file, (err, tempLayer, filename) => {
          if (!err) {
            tempLayer.addTo(this.map);
            tempLayer[Symbol.for("meta")] = { name: filename };
            this.setState(update(this.state, {
              overlays: { $push: [tempLayer] }
            }));
            //zoom to all features
            this.map.fitBounds(tempLayer.getBounds());
          } else {
            this.setState({ error: err.message || JSON.stringify(err) });
          }

          this.setState({ showLoading: false });
        });
      });
      mapTempLayerDrop.on("error", (file) => {
        mapTempLayerDrop.removeFile(file);
      });
    };

    addDnDZone(this.container, { url: "/", clickable: false });


    this.map.fitBounds([
      [13.772919746115805,
        45.664640939831735],
      [13.772825784981254,
        45.664591558975154]]);
    this.map.attributionControl.setPrefix("");

    this.map.on('draw:drawstart', () => {
      this.state.isDrawing = true;
    });
    this.map.on('draw:drawstop', () => {
      this.state.isDrawing = false;
    });
    this.map.on('draw:editstart', () => {
      this.state.isDrawing = true;
    });
    this.map.on('draw:editstop', () => {
      this.state.isDrawing = false;
    });
    this.map.on('draw:deletestart', () => {
      this.state.isDrawing = true;
    });
    this.map.on('draw:deletestop', () => {
      this.state.isDrawing = false;
    });


    this.setState({ showLoading: true });
    this.loadImageryLayers(true).then(() => {
      this.setState({ showLoading: false });
      this.map.fitBounds(this.mapBounds);

      this.map.on('click', e => {
        // Find first tile layer at the selected coordinates 
        for (let layer of this.state.imageryLayers) {
          if (layer._map && layer.options.bounds.contains(e.latlng) && this.state.isDrawing == false) {
            this.lastClickedLatLng = this.map.mouseEventToLatLng(e.originalEvent);
            this.updatePopupFor(layer);
            layer.openPopup();
            break;
          }
        }
      }).on('popupopen', e => {
        // Load task assets links in popup
        if (e.popup && e.popup._source && e.popup._content && !e.popup.options.lazyrender) {
          const infoWindow = e.popup._content;
          if (typeof infoWindow === 'string') return;

          const $assetLinks = $("ul.asset-links", infoWindow);

          if ($assetLinks.length > 0 && $assetLinks.hasClass('loading')) {
            const { id, project } = (e.popup._source[Symbol.for("meta")] || {}).task;

            $.getJSON(`/api/projects/${project}/tasks/${id}/`)
              .done(res => {
                const { available_assets } = res;
                const assets = AssetDownloads.excludeSeparators();
                const linksHtml = assets.filter(a => available_assets.indexOf(a.asset) !== -1)
                  .map(asset => {
                    return `<li><a href="${asset.downloadUrl(project, id)}">${asset.label}</a></li>`;
                  })
                  .join("");
                $assetLinks.append($(linksHtml));
              })
              .fail(() => {
                $assetLinks.append($("<li>" + _("Erro: não é possível carregar a lista de ativos.") + "</li>"));
              })
              .always(() => {
                $assetLinks.removeClass('loading');
              });
          }
        }

        if (e.popup && e.popup.options.lazyrender) {
          e.popup.setContent(e.popup.options.lazyrender());
        }
      });
    }).catch(e => {
      this.setState({ showLoading: false, error: e.message });
    });

    PluginsAPI.Map.triggerDidAddControls({
      map: this.map,
      tiles: tiles,
      controls: {
        autolayers: this.autolayers,
        scale: scaleControl,
        zoom: zoomControl
      }
    });

    PluginsAPI.Map.triggerAddActionButton({
      map: this.map,
      tiles
    }, (button) => {
      this.setState(update(this.state, {
        pluginActionButtons: { $push: [button] }
      }));
    });

    // POPUP MEDIDAS E CONTORNO
    PluginsAPI.Map.triggerWillAddControls({
      map: this.map,
      tiles,
      openPopup: this.state.openPopup,
      onTogglePopup: this.togglePopup,
    });

    // POPUP CAMADAS
    this.layersControl = new LayersControl({
      layers: this.state.imageryLayers,
      overlays: this.state.overlays,
      openPopup: this.state.openPopup,
      onTogglePopup: this.togglePopup,
    }).addTo(this.map);

    // POPUP BASEMAPS
    this.autolayers = Leaflet.control.autolayers({
      overlays: {},
      selectedOverlays: [],
      baseLayers: this.basemaps,
      openPopup: this.state.openPopup,
      onTogglePopup: this.togglePopup,
    }).addTo(this.map);

    this.autolayers.addEventPopup(this.togglePopup);

    // POPUP MAIS
    const AddOverlayCtrl = Leaflet.Control.extend({
      options: {
        position: 'topright'
      },

      onAdd: function () {
        this.container = Leaflet.DomUtil.create('div', 'leaflet-control-add-overlay leaflet-bar leaflet-control');
        Leaflet.DomEvent.disableClickPropagation(this.container);
        const btn = Leaflet.DomUtil.create('a', 'leaflet-control-add-overlay-button');
        btn.setAttribute("title", _("Adicione uma sobreposição temporária de GeoJSON (.json) ou ShapeFile (.zip)"));

        this.container.append(btn);
        addDnDZone(btn, { url: "/", clickable: true });

        return this.container;
      }
    });
    new AddOverlayCtrl().addTo(this.map);

    // POPUP OVERVIEW
    this.overviewControl = new OverviewControl({
      tiles: tiles,
      selectedLayers: this.state.selectedLayers,
      overlays: this.state.overlays,
      loadGeoJsonDetections: this.loadGeoJsonDetections,
      removeGeoJsonDetections: this.removeGeoJsonDetections,
      openPopup: this.state.openPopup,
      onTogglePopup: this.togglePopup,
    }).addTo(this.map);

    // POPUP SPRAYLINE
    this.sprayLineControl = new SprayLineControl({
      tiles: tiles,
      selectedLayers: this.state.selectedLayers,
      overlays: this.state.overlays,
      loadGeoJsonDetections: this.loadGeoJsonDetections,
      removeGeoJsonDetections: this.removeGeoJsonDetections,
      openPopup: this.state.openPopup,
      onTogglePopup: this.togglePopup,

    }).addTo(this.map);


    // POPUP MARCAR TALHÕES
    this.MarkFieldsControl = new MarkFieldsControl({
      task_id: this.props.tiles?.[0]?.meta?.task?.id || "ID padrão",
      project_id: this.props.tiles[0].meta.task.project,
      openPopup: this.state.openPopup,
      onTogglePopup: this.togglePopup,
    }).addTo(this.map);


    window.addEventListener("sidebarToggle", () => {
      setTimeout(() => {
        this.map.invalidateSize();
      }, 500);
    });

  }

  componentDidUpdate(prevProps, prevState) {
    this.state.imageryLayers.forEach(imageryLayer => {
      imageryLayer.setOpacity(this.state.opacity / 100);
      this.updatePopupFor(imageryLayer);
    });

    if (prevState.openPopup !== this.state.openPopup) {

      if (this.state.openPopup) {

        this.layersControl.update(this.state.imageryLayers, this.state.overlays, this.state.openPopup, this.togglePopup)
        this.MarkFieldsControl.update(this.state.openPopup)
        this.overviewControl.updateOpenPopup(this.state.openPopup, this.togglePopup, this.state.overlays, this.state.selectedLayers);
        this.sprayLineControl.updateOpenPopup(this.state.openPopup, this.togglePopup, this.state.overlays, this.state.selectedLayers);
        this.updateControlPlugin();
        this.updateMeasurePlugin();
        this.autolayers.updateOpenPopup(this.state.openPopup, this.togglePopup);
      }
    }


    if (prevProps.tiles !== this.props.tiles) {
      this.loadImageryLayers(true);
    }

    if (this.layersControl && (prevState.imageryLayers !== this.state.imageryLayers ||
      prevState.overlays !== this.state.overlays)) {
      this.layersControl.update(this.state.imageryLayers, this.state.overlays, this.state.openPopup, this.togglePopup);
    }

    if (this.selectionOverviewControl &&
      (prevState.selectedLayers.length == this.state.selectedLayers.length ||
        this.state.selectedLayers.length == 0) &&
      prevState.selectedLayers !== this.state.selectedLayers) {
      this.selectionOverviewControl.update(this.state.selectedLayers);
    }

    if (this.overviewControl && prevState.selectedLayers !== this.state.selectedLayers) {
      this.overviewControl.updateSelectedLayers(this.state.selectedLayers, this.state.overlays);
    }

    if (this.overviewControl && prevState.overlays !== this.state.overlays) {
      this.overviewControl.updateOverlays(this.state.overlays, this.state.selectedLayers);
    }

    if (this.sprayLineControl &&
      (prevState.selectedLayers.length == this.state.selectedLayers.length ||
        this.state.selectedLayers.length == 0) &&
      prevState.selectedLayers !== this.state.selectedLayers) {
      this.sprayLineControl.update(this.state.selectedLayers);
    }

    // Atualizando o sprayLineControl
    if (this.sprayLineControl && prevState.selectedLayers !== this.state.selectedLayers) {
      this.sprayLineControl.updateSelectedLayers(this.state.selectedLayers, this.state.overlays);
    }

    if (this.sprayLineControl && prevState.overlays !== this.state.overlays) {
      this.sprayLineControl.updateOverlays(this.state.overlays, this.state.selectedLayers);
    }

    if (this.props.tiles != null) {
      // Gives the new types to be loaded.
      // props.aiSelected -prevProps.aiSelected
      let currentAiSelected_minus_prevAiSelected = new Set([...this.props.aiSelected].filter(x => !prevProps.aiSelected.has(x)));
      if (currentAiSelected_minus_prevAiSelected.size != 0) {
        this.loadGeoJsonDetections(currentAiSelected_minus_prevAiSelected);
      }
      // Gives the types to be removed
      // prevProps.aiSelected - props.aiSelected
      let prevAiSelected_minus_currentAiSelected = new Set([...prevProps.aiSelected].filter(x => !this.props.aiSelected.has(x)));
      if (prevAiSelected_minus_currentAiSelected.size != 0) {
        this.removeGeoJsonDetections(prevAiSelected_minus_currentAiSelected);
      }
    }
  }

  componentWillUnmount() {
    this.map.remove();

    if (this.tileJsonRequests) {
      this.tileJsonRequests.forEach(tileJsonRequest => tileJsonRequest.abort());
      this.tileJsonRequests = [];
    }

  }

  handleMapMouseDown(e) {
    // Make sure the share popup closes
    if (this.shareButton) this.shareButton.hidePopup();
  }

  handleEndProcess() {
    // Faz reload da pagina.
    location.reload(true);
  }

  render() {

    return (
      <div style={{ height: "100%" }} className="map">
        <ProcessingCard task_id={this.props.tiles[0].meta.task.id} project_id={this.props.tiles[0].meta.task.project} endProcess={this.handleEndProcess} />
        <ErrorMessage bind={[this, 'error']} />
        <div className="opacity-slider hidden-xs">
          {_("Opacidade:")} <input type="range" step="1" value={this.state.opacity} onChange={this.updateOpacity} />
        </div>

        <Standby
          message={_("Carregando...")}
          show={this.state.showLoading}
        />

        <div
          style={{ height: "100%" }}
          ref={(domNode) => (this.container = domNode)}
          onMouseDown={this.handleMapMouseDown}
        />

        <div className="actionButtons">
          {this.state.pluginActionButtons.map((button, i) => <div key={i}>{button}</div>)}
          {(this.props.shareButtons && !this.props.public && this.state.singleTask !== null) ?
            <ShareButton
              ref={(ref) => { this.shareButton = ref; }}
              task={this.state.singleTask}
              linksTarget="map"
              queryParams={{ t: this.props.mapType }}
            />
            : ""}
          <SwitchModeButton
            task={this.state.singleTask}
            type="mapToModel"
            public={this.props.public} />
        </div>
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

export default Map;
