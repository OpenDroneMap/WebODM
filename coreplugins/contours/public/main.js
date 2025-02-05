PluginsAPI.Map.willAddControls([
    	'contours/build/Contours.js',
    	'contours/build/Contours.css'
	], function(args, Contours){
	var tasks = [];
	for (var i = 0; i < args.tiles.length; i++){
		tasks.push(args.tiles[i].meta.task);
	}

	// TODO: add support for map view where multiple tasks are available?
	if (tasks.length === 1){
		// args.map.addControl(new Contours({map: args.map, tasks: tasks, openPopup: args.openPopup, onTogglePopup: args.onTogglePopup}));

		const contoursControl = new Contours({
            map: args.map,
            tasks: tasks,
            openPopup: args.openPopup,
            onTogglePopup: args.onTogglePopup
        });

        args.map.addControl(contoursControl);

        // Salva a instância no PluginsAPI.Map
        PluginsAPI.Map.contoursControl = contoursControl;
	}
});
