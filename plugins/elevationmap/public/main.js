PluginsAPI.Map.didAddControls([
    	'elevationmap/build/ElevationMap.js',
    	'elevationmap/build/ElevationMap.css'
	], function(args, ElevationMap){
	var tasks = [];
	for (var i = 0; i < args.tiles.length; i++){
		tasks.push(args.tiles[i].meta.task);
	}

	// TODO: add support for map view where multiple tasks are available?
	if (tasks.length === 1){
		args.map.addControl(new ElevationMap({map: args.map, layersControl: args.controls.autolayers, tasks: tasks}));
	}
});
