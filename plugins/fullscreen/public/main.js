PluginsAPI.Map.willAddControls([
    	'fullscreen/node_modules/leaflet-fullscreen/dist/Leaflet.fullscreen.js',
    	'fullscreen/node_modules/leaflet-fullscreen/dist/leaflet.fullscreen.css'
	], function(args, _){
	args.map.addControl(new L.Control.Fullscreen({
        position: 'bottomleft'
    }));

    var fullscreenchange;

    if ('onfullscreenchange' in document) {
        fullscreenchange = 'fullscreenchange';
    } else if ('onmozfullscreenchange' in document) {
        fullscreenchange = 'mozfullscreenchange';
    } else if ('onwebkitfullscreenchange' in document) {
        fullscreenchange = 'webkitfullscreenchange';
    } else if ('onmsfullscreenchange' in document) {
        fullscreenchange = 'MSFullscreenChange';
    }

    if (fullscreenchange) {
        var onFullscreenChange = L.bind(args.map._onFullscreenChange, args.map);

        args.map.whenReady(function () {
            L.DomEvent.on(document, fullscreenchange, onFullscreenChange);
        });

        args.map.on('unload', function () {
            L.DomEvent.off(document, fullscreenchange, onFullscreenChange);
        });
    }
});
