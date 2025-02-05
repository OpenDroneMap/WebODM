PluginsAPI.Map.willAddControls([
    	'measure/build/app.js',
    	'measure/build/app.css'
	], function(args, App){

	const measureControl = new App(args.map, args.openPopup, args.onTogglePopup);

    // Armazena a instância para futuras atualizações
    PluginsAPI.Map.measureControl = measureControl;
});
