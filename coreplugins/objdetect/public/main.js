PluginsAPI.Map.willAddControls([
    	'objdetect/build/ObjDetect.js',
    	'objdetect/build/ObjDetect.css'
	], function(args, ObjDetect){
	var tasks = [];
	for (var i = 0; i < args.tiles.length; i++){
		tasks.push(args.tiles[i].meta.task);
	}

	// TODO: add support for map view where multiple tasks are available?
	if (tasks.length === 1){
		args.map.addControl(new ObjDetect({map: args.map, tasks: tasks}));
	}
});
