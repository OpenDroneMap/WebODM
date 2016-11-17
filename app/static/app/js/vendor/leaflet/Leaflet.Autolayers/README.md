# Leaflet.AutoLayers

A dynamic leaflet layers control that pulls from multiple mapservers and manages basemaps and overlays plus their order.

## Getting Started

See [this demo page](http://aebadirad.github.io/Leaflet.AutoLayers/example/index.html) for a full example or [this barebones demonstration](http://aebadirad.github.io/Leaflet.AutoLayers/example/simple.html) of the simpliest way to configure the plugin.

New! WMS support! Huzzah! Splits the WMS layers up for you so that you can turn them off/on and declare basemaps, automatically pulls layers. [See this demo for an example](http://aebadirad.github.io/Leaflet.AutoLayers/example/wms.html).


### Configuration Breakdown

The configuration is an object that is passed in as the first signature on the method call (L.control.autolayers()). The second is the standard Layers options object which is optional.

List of possible configuration keys:
* overlays: OPTIONAL - standard built control layers object as built statically [here](http://leafletjs.com/examples/layers-control.html)
* baseLayers: OPTIONAL - standard built control layers object as built statically [here](http://leafletjs.com/examples/layers-control.html)
* selectedBasemap: RECOMMENDED - determines which baselayer gets selected first by layer 'name'
* selectedOverlays: OPTIONAL - determines which overlays are auto-selected on load
* mapServers: OPTIONAL - but this is kind of the whole point of this plugin
  * url: REQUIRED - the base url of the service (e.g. http://services.arcgisonline.com/arcgis/rest/services)
  * baseLayers: RECOMMENDED - tells the control what layers to place in base maps, else all from this server go into overlays
  * dictionary: REQUIRED - where the published service list dictionary is (e.g. http://services.arcgisonline.com/arcgis/rest/services?f=pjson)
  * tileUrl: REQUIRED - (EXCEPT WMS) - the part that comes after the layer name in the tileserver with xyz coords placeholders (e.g. /MapServer/tile/{z}/{y}/{x} or /{z}/{x}/{y}.png)
  * name: REQUIRED - the name of the server, or however you want to identify the source
  * type: REQUIRED - current options: esri or nrltileserver
  * whitelist: OPTIONAL - ONLY display these layers, matches against both baselayers and overlays. Do not use with blacklist.
  * blacklist: OPTIONAL - DO NOT display these layers, matches against both baselayers and overlays. Do not use with whitelist.

### Prerequisities

1. A recent browser (IE 10 or later, Firefox, Safari, Chrome etc)
2. [Leaflet](https://github.com/Leaflet/Leaflet) mapping library

That's it! It has its own built in ajax and comes bundled with x2js, you can drop both of these for your own with some slight modifications.

### Installing

1. Clone
2. Include leaflet-autolayers.js and the accompanying css/images in your project where appropriate
3. Create your configuration and place L.control.autolayers(config).addTo(map) where you have your map implemented
4. And that's it!


Sample Configuration that pulls from the public ArcGIS and Navy Research Labs tileservers:
```
 var config = {
        overlays: overlays, //custom overlays group that are static
        baseLayers: baseLayers, //custom baselayers group that are static
        selectedBasemap: 'Streets', //selected basemap when it loads
        selectedOverlays: ["ASTER Digital Elevation Model 30M", "ASTER Digital Elevation Model Color 30M", "Cities"], //which overlays should be on by default
        mapServers: [{
            "url": "http://services.arcgisonline.com/arcgis/rest/services",
            "dictionary": "http://services.arcgisonline.com/arcgis/rest/services?f=pjson",
            "tileUrl": "/MapServer/tile/{z}/{y}/{x}",
            "name": "ArcGIS Online",
            "type": "esri",
            "baseLayers": ["ESRI_Imagery_World_2D", "ESRI_StreetMap_World_2D", "NGS_Topo_US_2D"],
            "whitelist": ["ESRI_Imagery_World_2D", "ESRI_StreetMap_World_2D", "NGS_Topo_US_2D"]
        }, {
            "url": "http://geoint.nrlssc.navy.mil/nrltileserver",
            "dictionary": "http://geoint.nrlssc.navy.mil/nrltileserver/wms?REQUEST=GetCapabilities&VERSION=1.1.1&SERVICE=WMS",
            "tileUrl": "/{z}/{x}/{y}.png",
            "name": "Navy NRL",
            "type": "nrltileserver",
            "baseLayers": ["bluemarble", "Landsat7", "DTED0_GRID_COLOR1", "ETOPO1_COLOR1", "NAIP", "DRG_AUTO"],
            "blacklist": ["BlackMarble"]
        }]
    };

```

## Deployment

Make sure all your layers you include are of the same projection. Currently map projection redrawing based on baselayer is not implemented, so if you don't have matching layer projections, things will not line up properly.

## Contributing

Contributions, especially for other map servers or enhancements welcome.

## Versioning
For now it's going to remain in beta until the Leaflet 1.0.0 release. After that time a standard version 1.x will begin.

## Authors

* **Alex Ebadirad** - *Initial work* - [aebadirad](https://github.com/aebadirad)

## License

This project is licensed under the MIT License - see the [LICENSE.md](LICENSE.md) file for details

## Acknowledgments

* [Houston Engineering, INC](www.heigeo.com) for the simple ajax utility
* [x2js](https://github.com/abdmob/x2js) for parsing the WMS response to json
