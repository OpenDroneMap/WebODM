PluginsAPI.Map.willAddControls([
		'measure/leaflet-measure.css',
		'measure/leaflet-measure.min.js'
	], function(options){
    L.control.measure({
      primaryLengthUnit: 'meters',
      secondaryLengthUnit: 'feet',
      primaryAreaUnit: 'sqmeters',
      secondaryAreaUnit: 'acres'
    }).addTo(options.map);
});
