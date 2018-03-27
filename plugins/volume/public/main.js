PluginsAPI.Map.willAddControls([
    'volume/build/app.js',
    'volume/build/app.css'
	], function(options, App){
    const app = new App(options.map);
    app.setupVolumeControls();
});
