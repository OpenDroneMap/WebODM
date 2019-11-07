/*
The MIT License (MIT)

Copyright (c) 2016 Alex Ebadirad, https://github.com/aebadirad/Leaflet.AutoLayers

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
SOFTWARE.
*/

//we extend the control object to include the new AutoLayers object

L.Control.AutoLayers = L.Control.extend({
	options: {
		collapsed: true,
		position: 'topright',
		autoZIndex: true
	},
	mapConfig: {},
	mapLayers: [],
	overLays: [],
	baseMaps: [],
	selectedOverlays: [],
	zIndexBase: 1,
	selectedBasemap: null,
	layersToAdd: {},


	countZIndexBase: function(layers) {
		for (var i = 0; i < layers.length; i++) {
			var layer = layers[i];
			if (!layer.baseLayer) {
				autoControl.zIndexBase++;
			}
		}
	},

	initialize: function(mapConfig, options) {
		L.setOptions(this, options);
		this.mapConfig = mapConfig;
		this._layers = {};
		this._lastZIndex = 0;
		this._handlingClick = false;
		this._initLayout();
		var baseLayers = mapConfig.baseLayers;
		var overlays = mapConfig.overlays;
		var selectedBasemap = this.selectedBasemap = mapConfig.selectedBasemap;

		for (var i in baseLayers) {
			this._addLayer(baseLayers[i], i);
		}

		for (var i in overlays) {
			this._addLayer(overlays[i], i, true);
			this.overLays[i] = overlays[i];
		}

		//incase we have no mapservers but still wish to add custom overlays pre-selected
		this._selectOverlays();

		this.fetchMapData();
	},

	onAdd: function(map) {
		this._initEvents();
		this._update();
		map.on('layeradd', this._onLayerChange, this).on('layerremove', this._onLayerChange, this);
		return this._container;
	},

	onRemove: function(map) {
		map
			.off('layeradd', this._onLayerChange, this)
			.off('layerremove', this._onLayerChange, this);
	},

	addBaseLayer: function(layer, name) {
		this._addLayer(layer, name);
		this._update();
		return this;
	},

	addOverlay: function(layer, name) {
		this._addLayer(layer, name, true);
		this._update();
		return this;
	},

	removeLayer: function(layer) {
		var id = L.stamp(layer);
		delete this._layers[id];
		this._update();
		return this;
	},

	_initLayout: function() {
		var className = 'leaflet-control-layers',
			container = this._container = L.DomUtil.create('div', className);

		//Makes this work on IE10 Touch devices by stopping it from firing a mouseout event when the touch is released
		container.setAttribute('aria-haspopup', true);

		if (!L.Browser.touch) {
			L.DomEvent
				.disableClickPropagation(container)
				.disableScrollPropagation(container);
		} else {
			L.DomEvent.on(container, 'click', L.DomEvent.stopPropagation);
		}

		var form = this._form = L.DomUtil.create('form', className + '-list');

		if (this.options.collapsed) {

			var link = this._layersLink = L.DomUtil.create('a', className + '-toggle', container);
			link.href = '#';
			link.title = 'Base Maps';

			if (L.Browser.touch) {
				L.DomEvent
					.on(link, 'click', L.DomEvent.stop)
					.on(link, 'click', this._expand, this);
			} else {
				L.DomEvent.on(link, 'focus', this._expand, this);
			}
			//Work around for Firefox android issue https://github.com/Leaflet/Leaflet/issues/2033
			// L.DomEvent.on(form, 'click', function() {
			// 	setTimeout(L.bind(this._onInputClick, this), 0);
			// }, this);

			// TODO keyboard accessibility
		} else {
			this._expand();
		}

		//base layers are made here
		var baseLayersDiv = this._baseLayersDiv = L.DomUtil.create('div', 'leaflet-control-layers-tab',
			form);
		this._baseLayersTitle = L.DomUtil.create('div', 'leaflet-control-autolayers-title',
			baseLayersDiv);
		this._baseLayersTitle.innerHTML = 'Base Maps';
		this._baseLayersClose = L.DomUtil.create('span', 'leaflet-control-autolayers-close',
			baseLayersDiv);
		var baseLayersBox = this._baseLayersBox = L.DomUtil.create('div', 'map-filter', baseLayersDiv);
		var baseLayersFilter = this._baseLayersFilter = L.DomUtil.create('input',
			'map-filter-box-base', baseLayersBox);
		baseLayersFilter.setAttribute('placeholder', 'Filter Base Layer List');
		baseLayersFilter.setAttribute('autocomplete', 'off');
		this._baseLayersList = L.DomUtil.create('div', className + '-base', baseLayersDiv);
		this._separator = L.DomUtil.create('div', className + '-separator', form);

		//overlays are done here
		var overlaysLayersDiv = this._overlaysDiv = L.DomUtil.create('div',
			'leaflet-control-layers-tab', form);

		// We hide the overlays
		overlaysLayersDiv.style.display = 'none'; 
		
		this._overlaysLayersTitle = L.DomUtil.create('div', 'leaflet-control-autolayers-title',
			overlaysLayersDiv);
		this._overlaysLayersTitle.innerHTML = 'Overlays';

		var overlaysLayersBox = this._overlaysLayersBox = L.DomUtil.create('div', 'map-filter',
			overlaysLayersDiv);
		var overlaysLayersFilter = this._overlaysLayersFilter = L.DomUtil.create('input',
			'map-filter-box-overlays', overlaysLayersBox);
		overlaysLayersFilter.setAttribute('placeholder', 'Filter Overlays List');
		overlaysLayersFilter.setAttribute('autocomplete', 'off');
		this._overlaysList = L.DomUtil.create('div', className + '-overlays', overlaysLayersDiv);

		container.appendChild(form);

		//check to see if we have any preadded 

		return true;
	},

	_initEvents: function() {
		var self = this;
		var overlaysFilterBox = this._overlaysLayersFilter;
		var baseFilterBox = this._baseLayersFilter;

		//stop the traditional submit from occurring
		L.DomEvent.addListener(overlaysFilterBox, 'submit', function(e) {
			L.DomEvent.stopPropagation(e);
		});

		L.DomEvent.addListener(baseFilterBox, 'submit', function(e) {
			L.DomEvent.stopPropagation(e);
		});

		//now we bind the filtering to each box
		L.DomEvent.addListener(overlaysFilterBox, 'keyup', function(e) {
			var filterBoxValue = this.value.toLowerCase();
			var displayLayers = this.parentNode.parentNode.getElementsByClassName(
				'leaflet-control-layers-overlays')[0].children;
			if (filterBoxValue.length > 2) {
				for (var i = 0; i < displayLayers.length; i++) {
					if (displayLayers[i].innerText.toLowerCase().indexOf(
							filterBoxValue) > -1) {
						displayLayers[i].style.display = 'block';
					} else {
						displayLayers[i].style.display = 'none';
					}
				}
			} else {
				for (var i = 0; i < displayLayers.length; i++) {
					displayLayers[i].style.display = 'block';
				}
			}
		});

		//now the baselayers filter box
		L.DomEvent.addListener(baseFilterBox, 'keyup', function(e) {
			var filterBoxValue = this.value.toLowerCase();
			var displayLayers = this.parentNode.parentNode.getElementsByClassName(
				'leaflet-control-layers-base')[0].children;
			if (filterBoxValue.length > 2) {
				for (var i = 0; i < displayLayers.length; i++) {
					if (displayLayers[i].innerText.toLowerCase().indexOf(
							filterBoxValue) > -1) {
						displayLayers[i].style.display = 'block';
					} else {
						displayLayers[i].style.display = 'none';
					}
				}
			} else {
				for (var i = 0; i < displayLayers.length; i++) {
					displayLayers[i].style.display = 'block';
				}
			}
		});

		//open and close setup
		var titles = this._form.getElementsByClassName('leaflet-control-autolayers-title');
		var onTitleClick = function(e) {
			var overlayOrBase;
			if (e.currentTarget.innerText === 'Overlays') {
				overlayOrBase = 'overlays';
			}
			if (e.currentTarget.innerText === 'Base Maps') {
				overlayOrBase = 'base';
			}

			var allTabs = this.parentNode.parentNode.getElementsByClassName(
				'leaflet-control-layers-tab');
			for (var i = 0; i < allTabs.length; i++) {
				var tab = allTabs[i].getElementsByTagName('div');

				for (var m = 0; m < tab.length; m++) {
					var tabContent = tab[m];
					if (tabContent.className === "leaflet-control-layers-item-container") continue;

					if (tabContent.className !== 'leaflet-control-autolayers-title') {
						tabContent.style.display = 'none';

					}
				}
			}

			var thisTab = this.parentNode.children;
			for (var i = 0; i < thisTab.length; i++) {
				thisTab[i].style.display = 'block';
				var filter = thisTab[i].getElementsByClassName('map-filter-box-' + overlayOrBase);
				if (filter.length > 0) {
					filter[0].style.display = 'block';
				}
			}

			if (e.currentTarget.innerText === 'Overlays' || e.currentTarget
				.innerText === 'Base Maps') {
				var filterBoxValue = this.parentNode.getElementsByClassName('map-filter')[0].children[0].value
					.toLowerCase();
				var displayLayers = this.parentNode.getElementsByClassName('leaflet-control-layers-' +
					overlayOrBase)[0].getElementsByTagName('label');
				if (filterBoxValue.length > 2) {
					for (var i = 0; i < displayLayers.length; i++) {
						if (displayLayers[i].innerText.toLowerCase().indexOf(
								filterBoxValue) > -1) {
							displayLayers[i].style.display = 'block';
						} else {
							displayLayers[i].style.display = 'none';
						}
					}
				}
			} else {
				//	for (var i = 0; i < displayLayers.length; i++) {
				//		displayLayers[i].style.display = 'block';
				//	}
			}
		};

		for (var t = 0; t < titles.length; t++) {
			L.DomEvent.addListener(titles[t], 'click', onTitleClick);
		}


		//x in the corner to close
		var closeControl = this._baseLayersClose;
		L.DomEvent.addListener(closeControl, 'click', function(e) {
			this.parentNode.parentNode.parentNode.className = this.parentNode.parentNode.parentNode.className
				.replace(
					'leaflet-control-layers-expanded', '');
		});

		//fix pesky zooming, have to dynamically measure the hidden div too! Make sure you do that!
		var overlayBox = this._overlaysList;
		L.DomEvent.addListener(overlayBox, 'mousewheel', function(e) {
			var delta = e.wheelDelta || -e.detail;
			this.scrollTop += (delta < 0 ? 1 : -1) * 30;
			e.preventDefault();
		});
		var baseBox = this._baseLayersList;
		L.DomEvent.addListener(baseBox, 'mousewheel', function(e) {
			var delta = e.wheelDelta || -e.detail;
			this.scrollTop += (delta < 0 ? 1 : -1) * 30;
			e.preventDefault();
		});

		//make sure we collapse the control on mapclick
		this._map.on('click', this._collapse, this);

		onTitleClick.call(titles[0], {currentTarget: {innerText: "Base Maps"}});

	},

	_initMaps: function(mapLayers) {
		var mapConfig = this.mapConfig;
		var self = this;
		var selected;
		for (var i = 0; i < mapLayers.length; i++) {
			var mapLayer = mapLayers[i];
			if (!mapLayer.baseLayer) {
				self.zIndexBase++;
			}
			//set some default layer options
			var layerOpts = {
				noWrap: mapConfig.noWrap === false ? mapConfig.noWrap : true,
				continuousWorld: mapConfig.continuousWorld === true ? mapConfig.continuousWorld : false,
				tileSize: mapConfig.tileSize ? mapConfig.tileSize : 256,
				tms: mapLayer.tms ? mapLayer.tms : false,
				zoomOffset: mapLayer.zoomOffset ? mapLayer.zoomOffset : 0,
				minZoom: 0,
				maxZoom: mapConfig.maxZoom ? mapConfig.maxZoom : 15,
				attribution: mapLayer.attribution ? mapLayer.attribution : 'Source Currently Unknown'
			};
			var layer;
			if (mapLayer.type === 'wms') {
				layer = L.tileLayer.wms(mapLayer.url, {
					layers: mapLayer.name,
					format: 'image/png',
					maxZoom: 16,
					transparent: true
				});
				mapLayer.name = mapLayer.title;
				//self.baseMaps[mapLayer.name] = layer;
			} else {
				layer = new L.tileLayer(mapLayer.url, layerOpts);
			}
			if (mapLayer.baseLayer) {
				self.baseMaps[String(mapLayer.name).trim()] = layer;
				self._addLayer(layer, mapLayer.name);

			} else {
				self.overLays[String(mapLayer.name).trim()] = layer;
				self._addLayer(layer, mapLayer.name, true);
			}
			if (mapLayer.baseLayer && !self.selectedBasemap) {
				self.selectedBasemap = mapLayer.name.trim();
				layer.addTo(map);
			} else if (mapLayer.name === self.selectedBasemap && mapLayer.baseLayer) {
				self.selectedBasemap = mapLayer.name.trim();
				layer.addTo(map);
			}
		}
		this._selectOverlays();
	},

	fetchMapData: function() {
		var mapServers = this.mapConfig.mapServers;
		var self = this;
		var mapLayers = [];
		if (mapServers) {
			for (var i = 0; i < mapServers.length; i++) {
				var layers = this.fetchMapDictionary(mapServers[i]);
			}
		}
	},

	fetchMapDictionary: function(mapServer) {
		var self = this;
		var layers = [];
		this.layersToAdd[mapServer.name] = [];
		var url = mapServer.dictionary.replace(/&amp;/g, '&');
		ajax(url, function(res) {

			if (mapServer.type === 'esri') {
				var response = JSON.parse(res);
				var layersToAdd = self._parseESRILayers(mapServer, response);
				if (layersToAdd && layersToAdd.length > 0) {
					layers = layersToAdd;
				}

			} else if (mapServer.type === 'nrltileserver') {
				var x2js = new X2JS();
				var parser = new DOMParser();
				var xmlDoc = parser.parseFromString(res, "text/xml");
				var parsedRes = x2js.xml2json(xmlDoc);
				var capability = parsedRes.WMT_MS_Capabilities.Capability.Layer;
				var capLayers = capability.Layer;
				var contactInfo = parsedRes.WMT_MS_Capabilities.Service.ContactInformation;
				var crs = parseInt(capability.SRS.substring(5));
				var layersToAdd = self._parseNRLLayers(mapServer, capLayers, contactInfo, crs);
				if (layersToAdd && layersToAdd.length > 0) {
					layers = layersToAdd;
				}

			} else if (mapServer.type === 'wms') {
				var x2js = new X2JS();
				var parser = new DOMParser();
				var xmlDoc = parser.parseFromString(res, "text/xml");
				var parsedRes = x2js.xml2json(xmlDoc);
				var capability = parsedRes.WMS_Capabilities.Capability.Layer;
				var capLayers = capability.Layer;
				var contactInfo = parsedRes.WMS_Capabilities.Service.ContactInformation;
				var crs = capability.CRS[0];
				var layersToAdd = self._parseWMSLayers(mapServer, capLayers, contactInfo, crs);
				if (layersToAdd && layersToAdd.length > 0) {
					layers = layersToAdd;
				}
			}
			//let's filter this list of any nulls (blacklists)
			layers = layers.filter(function(l) {
				return (l !== undefined && l !== null);
			});
			self.mapLayers.push(layers);
			self._initMaps(layers);
		});
	},

	_parseESRILayers: function(mapServer, response) {
		var self = this;
		//check to see if we have any root folder layers
		var services = response.services;
		var folders = [];
		var layers = [];
		var layersToAdd = [];
		//check to see if any folders, if none it'll be empty array
		folders = response.folders;
		for (var i = 0; i < services.length; i++) {
			if (services[i].type === 'MapServer') {
				layersToAdd.push(self._parseESRILayer(mapServer, services[i]));
			}
		}
		//now we check folders, why? we don't want calls within calls
		if (folders.length > 0) {
			layersToAdd.concat(self._parseESRIFolders(mapServer, folders));
		}
		return layersToAdd;
	},

	_parseESRIFolders: function(mapServer, folders) {
		var self = this;
		var layersToAdd = [];
		for (var f = 0; f < folders.length; f++) {
			var folderUrl = mapServer.url + '/' + folders[f] +
				'?f=pjson';
			ajax(folderUrl, function(res) {
				var response = JSON.parse(res);
				//check to see if we have any layers here
				var services = response.services;
				for (var i = 0; i < services.length; i++) {
					if (services[i].type === 'MapServer') {
						layersToAdd.push(self._parseESRILayer(mapServer, services[i], true));
					}
				}
			});
		}
		return layersToAdd;

	},
	_parseESRILayer: function(mapServer, layer, folder = false) {
		var layerToAdd = [];
		if (folder) {
			var fullName = layer.name.split('/');
			var layerName = fullName[1];
			var folderName = fullName[0];
			var layerUrl = mapServer.url + '/' + folderName +
				'/' + layerName + mapServer.tileUrl;
			var url = mapServer.url + '/' + folderName +
				'/' + layerName + '/MapServer?f=pjson';

		} else {
			var layerName = layer.name;
			var layerUrl = mapServer.url + '/' + layerName +
				mapServer.tileUrl;
			var url = mapServer.url + '/' + layerName +
				'/MapServer?f=pjson';
		}
		var layerObj = {
			detailsUrl: url,
			url: layerUrl,
			name: layerName,
			type: 'esri',
			attribution: mapServer.name + ' - ' + layerName
		};
		layerToAdd = this._createLayer(mapServer, layerObj, layerName);
		return layerToAdd;

	},
	_parseNRLLayers: function(mapServer, layers, contactInfo, crs) {
		var self = this;
		for (var j = 0; j < layers.length; j++) {
			var layer = layers[j];
			if (layer.Layer && layer.Layer.length > 1) {
				self.layersToAdd[mapServer.name].concat(self._parseNRLLayers(mapServer, layer.Layer,
					contactInfo, crs));
			} else {
				self.layersToAdd[mapServer.name].push(self._parseNRLLayer(mapServer, layer, contactInfo, crs));
			}
		}
		return this.layersToAdd[mapServer.name];
	},
	_parseNRLLayer: function(mapServer, layer, contactInfo, crs) {
		var layerToAdd = [];
		var layerObj = {
			crs: crs,
			maxZoom: 18,
			name: layer.Title,
			type: 'nrl',
			zoomOffset: 2,
			tms: false,
			noWrap: false,
			continuousWorld: true,
			attribution: mapServer.name + ': ' + contactInfo.ContactPersonPrimary
				.ContactOrganization + ' - ' + layer.Title,
			url: mapServer.url + '/openlayers/' + layer.Name +
				mapServer.tileUrl
		};

		layerToAdd = this._createLayer(mapServer, layerObj, layer.Name);
		return layerToAdd;

	},
	_parseWMSLayers: function(mapServer, layers, contactInfo, crs) {
		var self = this;
		for (var j = 0; j < layers.length; j++) {
			var layer = layers[j];
			if (layer.Layer && layer.Layer.length > 1) {
				self.layersToAdd[mapServer.name].concat(self._parseWMSLayers(mapServer, layer.Layer,
					contactInfo, crs));
			} else {
				self.layersToAdd[mapServer.name].push(self._parseWMSLayer(mapServer, layer, contactInfo, crs));
			}
		}
		return this.layersToAdd[mapServer.name];
	},

	_parseWMSLayer: function(mapServer, layer, contactInfo, crs) {
		var layerToAdd = [];
		var layerObj = {
			crs: crs,
			maxZoom: 18,
			name: layer.Name,
			type: 'wms',
			zoomOffset: 1,
			tms: false,
			noWrap: false,
			continuousWorld: true,
			title: layer.Title,
			attribution: mapServer.name + ': ' + contactInfo.ContactPersonPrimary
				.ContactOrganization + ' - ' + layer.Title,
			url: mapServer.url
		};
		layerToAdd = this._createLayer(mapServer, layerObj, layer.Title);
		return layerToAdd;

	},

	_createLayer: function(mapServer, layer, name) {
		var blacklist = mapServer.blacklist;
		var whitelist = mapServer.whitelist;
		var layerToAdd = null;
		var mapPass = -1;
		if (mapServer.baseLayers) {
			mapPass = mapServer.baseLayers.indexOf(name);
		}
		if ((whitelist && whitelist.indexOf(name) > -1) || (blacklist && blacklist.indexOf(
				name) === -1) || (!blacklist && !whitelist)) {
			if (!(mapServer.baseLayers) || mapPass > -1) {
				layer.baseLayer = true;
			} else {
				layer.baseLayer = false;
			}
			layerToAdd = layer;
		}
		return layerToAdd;
	},

	_getLayerByName: function(name) {
		var response;
		for (var key in this._layers) {
			var layer = this._layers[key];
			var layerName = layer.name;
			if (layerName == name) {
				response = layer;
				break;
			}
		}
		return response;
	},

	_addSelectedOverlay: function(name) {
		if (this.selectedOverlays.indexOf(name) === -1) {
			this.selectedOverlays.unshift(name);
			this._buildSelectedOverlays();
		}
	},

	_buildSelectedOverlays: function() {
		return;
		var self = this;
		var selectedOverlays = this.selectedOverlays;
		var container = this._selectedList;
		container.innerHTML = '';
		for (var i = 0; i < selectedOverlays.length; i++) {
			var name = selectedOverlays[i];
			var selectedLabel = L.DomUtil.create('label', 'selected-label');
			var selectedRemove = L.DomUtil.create('span', 'selected-remove', selectedLabel);
			var selectedName = L.DomUtil.create('span', 'selected-name', selectedLabel);
			selectedName.innerHTML = name;
			var selectedUp;
			var selectedDown;
			if (selectedOverlays.length === 1) {
				selectedUp = L.DomUtil.create('span', 'selected-none', selectedLabel);
				selectedDown = L.DomUtil.create('span', 'selected-none', selectedLabel);
			} else {
				if (selectedOverlays.length === (i + 1)) {
					selectedUp = L.DomUtil.create('span', 'selected-up', selectedLabel);
					selectedDown = L.DomUtil.create('span', 'selected-none', selectedLabel);
				} else if (i === 0) {
					selectedUp = L.DomUtil.create('span', 'selected-none', selectedLabel);
					selectedDown = L.DomUtil.create('span', 'selected-down', selectedLabel);
				} else {
					selectedUp = L.DomUtil.create('span', 'selected-up', selectedLabel);
					selectedDown = L.DomUtil.create('span', 'selected-down', selectedLabel);
				}
			}

			container.appendChild(selectedLabel);

			L.DomEvent.addListener(selectedRemove, 'click', function(e) {
				var name = this.parentNode.getElementsByClassName('selected-name')[0].innerHTML;
				var layer = self._getLayerByName(name);
				self._map.removeLayer(layer.layer);
			});
			//Now setup for up and down ordering
			L.DomEvent.addListener(selectedUp, 'click', function(e) {
				var name = this.parentNode.getElementsByClassName('selected-name')[0].innerHTML;
				self._upSelectedOverlay(name);
			});
			L.DomEvent.addListener(selectedDown, 'click', function(e) {
				var name = this.parentNode.getElementsByClassName('selected-name')[0].innerHTML;
				self._downSelectedOverlay(name);
			});

		}

	},

	_removeSelectedOverlay: function(name) {
		if (this.selectedOverlays.indexOf(name) > -1) {
			this.selectedOverlays.splice(this.selectedOverlays.indexOf(name), 1);
			this._buildSelectedOverlays();
		}
	},

	_upSelectedOverlay: function(name) {
		var overlays = this.selectedOverlays;
		var selectedIndex = overlays.indexOf(name);
		var upSelectedIndex = selectedIndex - 1;
		if (upSelectedIndex > -1) {
			var tempLayer = overlays[selectedIndex];
			overlays[selectedIndex] = overlays[upSelectedIndex];
			overlays[upSelectedIndex] = tempLayer;
		}
		this.selectedOverlays = overlays;
		return this._reOrderOverlay();
	},

	_downSelectedOverlay: function(name) {
		var overlays = this.selectedOverlays;
		var selectedIndex = overlays.indexOf(name);
		var upSelectedIndex = selectedIndex;
		upSelectedIndex++;
		if (upSelectedIndex < overlays.length) {
			var tempLayer = overlays[upSelectedIndex];
			overlays[upSelectedIndex] = overlays[selectedIndex];
			overlays[selectedIndex] = tempLayer;
		}
		this.selectedOverlays = overlays;
		return this._reOrderOverlay();
	},

	_reOrderOverlay: function() {
		var self = this;
		var zIndexBase = this.zIndexBase;
		var overlays = this.selectedOverlays;
		var totalSelected = overlays.length;
		var maxBase = zIndexBase + totalSelected;
		for (var i = 0; i < overlays.length; i++) {
			var layerName = overlays[i];
			var layer = self._getLayerByName(layerName).layer;
			layer.setZIndex(maxBase);
			maxBase--;
		};
		return this._buildSelectedOverlays();
	},

	_selectOverlays: function() {
		var selectedOverlays = this.mapConfig.selectedOverlays;
		var overLays = this.overLays;
		for (var i = 0; i < selectedOverlays.length; i++) {
			var overlay = selectedOverlays[i];
			if (overLays[overlay]) {
				overLays[overlay].addTo(map);
				this._addSelectedOverlay(selectedOverlays[i]);
			}
		}
	},
	_addLayer: function(layer, name, overlay) {
		var id = L.stamp(layer);

		this._layers[id] = {
			layer: layer,
			name: name,
			overlay: overlay
		};

		if (this.options.autoZIndex && layer.setZIndex && overlay) {
			this._lastZIndex++;
			layer.setZIndex(this._lastZIndex);
		} else {
			layer.setZIndex(0);
		}
	},

	_update: function() {
		if (!this._container) {
			return;
		}

		this._baseLayersList.innerHTML = '';
		this._overlaysList.innerHTML = '';

		var baseLayersPresent = false,
			overlaysPresent = false,
			i, obj;

		for (i in this._layers) {
			obj = this._layers[i];
			this._addItem(obj);
			overlaysPresent = overlaysPresent || obj.overlay;
			baseLayersPresent = baseLayersPresent || !obj.overlay;
		}

		this._separator.style.display = overlaysPresent && baseLayersPresent ? '' : 'none';
	},

	_onLayerChange: function(e) {
		var obj = this._layers[L.stamp(e.layer)];
		var self = this;
		if (!obj) {
			return;
		}

		if (!this._handlingClick) {
			this._update();
		}

		var type = obj.overlay ?
			(e.type === 'layeradd' ? 'overlayadd' : 'overlayremove') :
			(e.type === 'layeradd' ? 'baselayerchange' : null);

		if (type) {
			this._map.fire(type, obj);
		}

		if (type === 'overlayadd') {
			this._addSelectedOverlay(obj.name);
			e.layer.setZIndex(this.zIndexBase)
		}

		if (type === 'overlayremove') {
			this._removeSelectedOverlay(obj.name);
		}
	},

	// IE7 bugs out if you create a radio dynamically, so you have to do it this hacky way (see http://bit.ly/PqYLBe)
	_createRadioElement: function(name, checked) {

		var radioHtml = '<input type="radio" class="leaflet-control-layers-selector" name="' + name +
			'"';
		if (checked) {
			radioHtml += ' checked="checked"';
		}
		radioHtml += '/>';

		var radioFragment = document.createElement('div');
		radioFragment.innerHTML = radioHtml;

		return radioFragment.firstChild;
	},

	_addItem: function(obj) {
		var wrapper = document.createElement(obj.overlay ? 'div' : 'label'),
			input,
			checked = this._map.hasLayer(obj.layer);

		wrapper.className='leaflet-control-layers-item-container';

		if (obj.overlay) {
			L.DomEvent.on(wrapper, 'click', function(e){
				this._map.fitBounds(obj.layer.options.bounds);
				obj.layer.openPopup();
			}, this);
			input = document.createElement('input');
			input.type = 'checkbox';
			input.className = 'leaflet-control-layers-selector';
			input.defaultChecked = checked;
		} else {
			input = this._createRadioElement('leaflet-base-layers', checked);
		}

		input.layerId = L.stamp(obj.layer);

		L.DomEvent.on(input, 'click', this._onInputClick, this);

		var name = document.createElement('span');
		name.innerHTML = ' ' + obj.name;

		wrapper.appendChild(input);
		wrapper.appendChild(name);

		var container = obj.overlay ? this._overlaysList : this._baseLayersList;
		container.appendChild(wrapper);

		return wrapper;
	},

	_onInputClick: function(e) {
		var i, input, obj,
			inputs = this._form.getElementsByTagName('input'),
			inputsLen = inputs.length;
		if (e) e.stopPropagation();

		this._handlingClick = true;

		for (var i = 0; i < inputsLen; i++) {
			input = inputs[i];
			obj = this._layers[input.layerId];
			if (input.type === 'checkbox' || input.type === "radio") {
				if (input.checked && !this._map.hasLayer(obj.layer)) {
					this._map.addLayer(obj.layer);

				} else if (!input.checked && this._map.hasLayer(obj.layer)) {
					this._map.removeLayer(obj.layer);
				}
			}
		}

		this._handlingClick = false;
		//keep this commented out so we don't lose focus
		//this._refocusOnMap();
	},
	_expand: function() {
		L.DomUtil.addClass(this._container, 'leaflet-control-layers-expanded');
	},

	_collapse: function() {
		this._container.className = this._container.className.replace(
			' leaflet-control-layers-expanded', '');
	}
});

//to conform to leaflet recommendations, here's the factory
L.control.autolayers = function(mapConfig, options) {
	return new L.Control.AutoLayers(mapConfig, options);
};

//Here we also override the attribution control's update method to better suit tons of layers
L.Control.Attribution = L.Control.Attribution.extend({
	_update: function() {
		if (!this._map) {
			return;
		}

		var attribs = [];

		for (var i in this._attributions) {
			if (this._attributions[i]) {
				attribs.push(i);
			}
		}

		var prefixAndAttribs = [];

		if (this.options.prefix) {
			prefixAndAttribs.push(this.options.prefix);
		}
		if (attribs.length) {
			prefixAndAttribs.push(attribs.join(' <br /> '));
		}

		this._container.innerHTML = prefixAndAttribs.join(' | ');
	}
});

// Simple AJAX helper (since we can't assume jQuery etc. are present)
//credit to Houston Engineering, INC www.heigeo.com
function ajax(url, callback) {
	var context = this,
		request = new XMLHttpRequest();
	request.onreadystatechange = change;
	request.open('GET', url, true);
	request.send();

	function change() {
		if (request.readyState === 4) {
			if (request.status === 200) {
				callback.call(context, request.responseText);
			} else {
				callback.call(context, "error");
			}
		}
	}
};

// Below is a version of x2js
/*
 Copyright 2011-2013 Abdulla Abdurakhmanov
 Original sources are available at https://code.google.com/p/x2js/
 Licensed under the Apache License, Version 2.0 (the "License");
 you may not use this file except in compliance with the License.
 You may obtain a copy of the License at
 http://www.apache.org/licenses/LICENSE-2.0
 Unless required by applicable law or agreed to in writing, software
 distributed under the License is distributed on an "AS IS" BASIS,
 WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 See the License for the specific language governing permissions and
 limitations under the License.
 */
(function(a, b) {
	if (typeof define === "function" && define.amd) {
		define([], b);
	} else {
		if (typeof exports === "object") {
			module.exports = b();
		} else {
			a.X2JS = b();
		}
	}
}(this, function() {
	return function(z) {
		var t = "1.2.0";
		z = z || {};
		i();
		u();

		function i() {
			if (z.escapeMode === undefined) {
				z.escapeMode = true;
			}
			z.attributePrefix = z.attributePrefix || "_";
			z.arrayAccessForm = z.arrayAccessForm || "none";
			z.emptyNodeForm = z.emptyNodeForm || "text";
			if (z.enableToStringFunc === undefined) {
				z.enableToStringFunc = true;
			}
			z.arrayAccessFormPaths = z.arrayAccessFormPaths || [];
			if (z.skipEmptyTextNodesForObj === undefined) {
				z.skipEmptyTextNodesForObj = true;
			}
			if (z.stripWhitespaces === undefined) {
				z.stripWhitespaces = true;
			}
			z.datetimeAccessFormPaths = z.datetimeAccessFormPaths || [];
			if (z.useDoubleQuotes === undefined) {
				z.useDoubleQuotes = false;
			}
			z.xmlElementsFilter = z.xmlElementsFilter || [];
			z.jsonPropertiesFilter = z.jsonPropertiesFilter || [];
			if (z.keepCData === undefined) {
				z.keepCData = false;
			}
		}
		var h = {
			ELEMENT_NODE: 1,
			TEXT_NODE: 3,
			CDATA_SECTION_NODE: 4,
			COMMENT_NODE: 8,
			DOCUMENT_NODE: 9
		};

		function u() {}

		function x(B) {
			var C = B.localName;
			if (C == null) {
				C = B.baseName;
			}
			if (C == null || C == "") {
				C = B.nodeName;
			}
			return C;
		}

		function r(B) {
			return B.prefix;
		}

		function s(B) {
			if (typeof(B) == "string") {
				return B.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g,
					"&quot;").replace(/'/g, "&apos;");
			} else {
				return B;
			}
		}

		function k(B) {
			return B.replace(/&lt;/g, "<").replace(/&gt;/g, ">").replace(/&quot;/g, '"').replace(
				/&apos;/g, "'").replace(/&amp;/g, "&");
		}

		function w(C, F, D, E) {
			var B = 0;
			for (; B < C.length; B++) {
				var G = C[B];
				if (typeof G === "string") {
					if (G == E) {
						break;
					}
				} else {
					if (G instanceof RegExp) {
						if (G.test(E)) {
							break;
						}
					} else {
						if (typeof G === "function") {
							if (G(F, D, E)) {
								break;
							}
						}
					}
				}
			}
			return B != C.length;
		}

		function n(D, B, C) {
			switch (z.arrayAccessForm) {
				case "property":
					if (!(D[B] instanceof Array)) {
						D[B + "_asArray"] = [D[B]];
					} else {
						D[B + "_asArray"] = D[B];
					}
					break;
			}
			if (!(D[B] instanceof Array) && z.arrayAccessFormPaths.length > 0) {
				if (w(z.arrayAccessFormPaths, D, B, C)) {
					D[B] = [D[B]];
				}
			}
		}

		function a(G) {
			var E = G.split(/[-T:+Z]/g);
			var F = new Date(E[0], E[1] - 1, E[2]);
			var D = E[5].split(".");
			F.setHours(E[3], E[4], D[0]);
			if (D.length > 1) {
				F.setMilliseconds(D[1]);
			}
			if (E[6] && E[7]) {
				var C = E[6] * 60 + Number(E[7]);
				var B = /\d\d-\d\d:\d\d$/.test(G) ? "-" : "+";
				C = 0 + (B == "-" ? -1 * C : C);
				F.setMinutes(F.getMinutes() - C - F.getTimezoneOffset());
			} else {
				if (G.indexOf("Z", G.length - 1) !== -1) {
					F = new Date(Date.UTC(F.getFullYear(), F.getMonth(), F.getDate(), F.getHours(), F.getMinutes(),
						F.getSeconds(), F.getMilliseconds()));
				}
			}
			return F;
		}

		function q(D, B, C) {
			if (z.datetimeAccessFormPaths.length > 0) {
				var E = C.split(".#")[0];
				if (w(z.datetimeAccessFormPaths, D, B, E)) {
					return a(D);
				} else {
					return D;
				}
			} else {
				return D;
			}
		}

		function b(E, C, B, D) {
			if (C == h.ELEMENT_NODE && z.xmlElementsFilter.length > 0) {
				return w(z.xmlElementsFilter, E, B, D);
			} else {
				return true;
			}
		}

		function A(D, J) {
			if (D.nodeType == h.DOCUMENT_NODE) {
				var K = new Object;
				var B = D.childNodes;
				for (var L = 0; L < B.length; L++) {
					var C = B.item(L);
					if (C.nodeType == h.ELEMENT_NODE) {
						var I = x(C);
						K[I] = A(C, I);
					}
				}
				return K;
			} else {
				if (D.nodeType == h.ELEMENT_NODE) {
					var K = new Object;
					K.__cnt = 0;
					var B = D.childNodes;
					for (var L = 0; L < B.length; L++) {
						var C = B.item(L);
						var I = x(C);
						if (C.nodeType != h.COMMENT_NODE) {
							var H = J + "." + I;
							if (b(K, C.nodeType, I, H)) {
								K.__cnt++;
								if (K[I] == null) {
									K[I] = A(C, H);
									n(K, I, H);
								} else {
									if (K[I] != null) {
										if (!(K[I] instanceof Array)) {
											K[I] = [K[I]];
											n(K, I, H);
										}
									}(K[I])[K[I].length] = A(C, H);
								}
							}
						}
					}
					for (var E = 0; E < D.attributes.length; E++) {
						var F = D.attributes.item(E);
						K.__cnt++;
						K[z.attributePrefix + F.name] = F.value;
					}
					var G = r(D);
					if (G != null && G != "") {
						K.__cnt++;
						K.__prefix = G;
					}
					if (K["#text"] != null) {
						K.__text = K["#text"];
						if (K.__text instanceof Array) {
							K.__text = K.__text.join("\n");
						}
						if (z.stripWhitespaces) {
							K.__text = K.__text.trim();
						}
						delete K["#text"];
						if (z.arrayAccessForm == "property") {
							delete K["#text_asArray"];
						}
						K.__text = q(K.__text, I, J + "." + I);
					}
					if (K["#cdata-section"] != null) {
						K.__cdata = K["#cdata-section"];
						delete K["#cdata-section"];
						if (z.arrayAccessForm == "property") {
							delete K["#cdata-section_asArray"];
						}
					}
					if (K.__cnt == 0 && z.emptyNodeForm == "text") {
						K = "";
					} else {
						if (K.__cnt == 1 && K.__text != null) {
							K = K.__text;
						} else {
							if (K.__cnt == 1 && K.__cdata != null && !z.keepCData) {
								K = K.__cdata;
							} else {
								if (K.__cnt > 1 && K.__text != null && z.skipEmptyTextNodesForObj) {
									if ((z.stripWhitespaces && K.__text == "") || (K.__text.trim() == "")) {
										delete K.__text;
									}
								}
							}
						}
					}
					delete K.__cnt;
					if (z.enableToStringFunc && (K.__text != null || K.__cdata != null)) {
						K.toString = function() {
							return (this.__text != null ? this.__text : "") + (this.__cdata != null ? this.__cdata :
								"");
						};
					}
					return K;
				} else {
					if (D.nodeType == h.TEXT_NODE || D.nodeType == h.CDATA_SECTION_NODE) {
						return D.nodeValue;
					}
				}
			}
		}

		function o(I, F, H, C) {
			var E = "<" + ((I != null && I.__prefix != null) ? (I.__prefix + ":") : "") + F;
			if (H != null) {
				for (var G = 0; G < H.length; G++) {
					var D = H[G];
					var B = I[D];
					if (z.escapeMode) {
						B = s(B);
					}
					E += " " + D.substr(z.attributePrefix.length) + "=";
					if (z.useDoubleQuotes) {
						E += '"' + B + '"';
					} else {
						E += "'" + B + "'";
					}
				}
			}
			if (!C) {
				E += ">";
			} else {
				E += "/>";
			}
			return E;
		}

		function j(C, B) {
			return "</" + (C.__prefix != null ? (C.__prefix + ":") : "") + B + ">";
		}

		function v(C, B) {
			return C.indexOf(B, C.length - B.length) !== -1;
		}

		function y(C, B) {
			if ((z.arrayAccessForm == "property" && v(B.toString(), ("_asArray"))) || B.toString().indexOf(
					z.attributePrefix) == 0 || B.toString().indexOf("__") == 0 || (C[B] instanceof Function)) {
				return true;
			} else {
				return false;
			}
		}

		function m(D) {
			var C = 0;
			if (D instanceof Object) {
				for (var B in D) {
					if (y(D, B)) {
						continue;
					}
					C++;
				}
			}
			return C;
		}

		function l(D, B, C) {
			return z.jsonPropertiesFilter.length == 0 || C == "" || w(z.jsonPropertiesFilter, D, B, C);
		}

		function c(D) {
			var C = [];
			if (D instanceof Object) {
				for (var B in D) {
					if (B.toString().indexOf("__") == -1 && B.toString().indexOf(z.attributePrefix) == 0) {
						C.push(B);
					}
				}
			}
			return C;
		}

		function g(C) {
			var B = "";
			if (C.__cdata != null) {
				B += "<![CDATA[" + C.__cdata + "]]>";
			}
			if (C.__text != null) {
				if (z.escapeMode) {
					B += s(C.__text);
				} else {
					B += C.__text;
				}
			}
			return B;
		}

		function d(C) {
			var B = "";
			if (C instanceof Object) {
				B += g(C);
			} else {
				if (C != null) {
					if (z.escapeMode) {
						B += s(C);
					} else {
						B += C;
					}
				}
			}
			return B;
		}

		function p(C, B) {
			if (C === "") {
				return B;
			} else {
				return C + "." + B;
			}
		}

		function f(D, G, F, E) {
			var B = "";
			if (D.length == 0) {
				B += o(D, G, F, true);
			} else {
				for (var C = 0; C < D.length; C++) {
					B += o(D[C], G, c(D[C]), false);
					B += e(D[C], p(E, G));
					B += j(D[C], G);
				}
			}
			return B;
		}

		function e(I, H) {
			var B = "";
			var F = m(I);
			if (F > 0) {
				for (var E in I) {
					if (y(I, E) || (H != "" && !l(I, E, p(H, E)))) {
						continue;
					}
					var D = I[E];
					var G = c(D);
					if (D == null || D == undefined) {
						B += o(D, E, G, true);
					} else {
						if (D instanceof Object) {
							if (D instanceof Array) {
								B += f(D, E, G, H);
							} else {
								if (D instanceof Date) {
									B += o(D, E, G, false);
									B += D.toISOString();
									B += j(D, E);
								} else {
									var C = m(D);
									if (C > 0 || D.__text != null || D.__cdata != null) {
										B += o(D, E, G, false);
										B += e(D, p(H, E));
										B += j(D, E);
									} else {
										B += o(D, E, G, true);
									}
								}
							}
						} else {
							B += o(D, E, G, false);
							B += d(D);
							B += j(D, E);
						}
					}
				}
			}
			B += d(I);
			return B;
		}
		this.parseXmlString = function(D) {
			var F = window.ActiveXObject || "ActiveXObject" in window;
			if (D === undefined) {
				return null;
			}
			var E;
			if (window.DOMParser) {
				var G = new window.DOMParser();
				var B = null;
				if (!F) {
					try {
						B = G.parseFromString("INVALID", "text/xml").getElementsByTagName("parsererror")[0].namespaceURI;
					} catch (C) {
						B = null;
					}
				}
				try {
					E = G.parseFromString(D, "text/xml");
					if (B != null && E.getElementsByTagNameNS(B, "parsererror").length > 0) {
						E = null;
					}
				} catch (C) {
					E = null;
				}
			} else {
				if (D.indexOf("<?") == 0) {
					D = D.substr(D.indexOf("?>") + 2);
				}
				E = new ActiveXObject("Microsoft.XMLDOM");
				E.async = "false";
				E.loadXML(D);
			}
			return E;
		};
		this.asArray = function(B) {
			if (B === undefined || B == null) {
				return [];
			} else {
				if (B instanceof Array) {
					return B;
				} else {
					return [B];
				}
			}
		};
		this.toXmlDateTime = function(B) {
			if (B instanceof Date) {
				return B.toISOString();
			} else {
				if (typeof(B) === "number") {
					return new Date(B).toISOString();
				} else {
					return null;
				}
			}
		};
		this.asDateTime = function(B) {
			if (typeof(B) == "string") {
				return a(B);
			} else {
				return B;
			}
		};
		this.xml2json = function(B) {
			return A(B);
		};
		this.xml_str2json = function(B) {
			var C = this.parseXmlString(B);
			if (C != null) {
				return this.xml2json(C);
			} else {
				return null;
			}
		};
		this.json2xml_str = function(B) {
			return e(B, "");
		};
		this.json2xml = function(C) {
			var B = this.json2xml_str(C);
			return this.parseXmlString(B);
		};
		this.getVersion = function() {
			return t;
		};
	};
}));