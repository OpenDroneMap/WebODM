PluginsAPI.Map.didAddControls([
    	'changedetection/build/ChangeDetection.js',
    	'changedetection/build/ChangeDetection.css'
	], function(args, ChangeDetection){
	var tasks = [];
	for (var i = 0; i < args.tiles.length; i++){
		tasks.push(args.tiles[i].meta.task);
	}

	if (tasks.length === 1){
		args.map.addControl(new ChangeDetection({map: args.map, tasks, alignSupported: false}));
	}
});
