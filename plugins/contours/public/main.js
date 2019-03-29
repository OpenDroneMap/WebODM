PluginsAPI.Map.willAddControls([
    	'contours/build/Contours.js',
    	'contours/build/Contours.css'
	], function(args, Contours){
	args.map.addControl(new Contours());
});
