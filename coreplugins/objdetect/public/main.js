PluginsAPI.Map.willAddControls([
    	'objdetect/build/ObjDetect.js',
    	'objdetect/build/ObjDetect.css'
	], function(args, ObjDetect){
	var tasks = [];
	var ids = {};
	
	for (var i = 0; i < args.tiles.length; i++){
		var task = args.tiles[i].meta.task;
		if (!ids[task.id]){
			tasks.push(task);
			ids[task.id] = true;
		}
	}

	// TODO: add support for map view where multiple tasks are available?
	if (tasks.length === 1){
		args.map.addControl(new ObjDetect({map: args.map, tasks: tasks}));
	}
});
