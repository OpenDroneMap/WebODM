PluginsAPI.Map.willAddControls([
    	'gpslocation/node_modules/leaflet.locatecontrol/dist/L.Control.Locate.min.js',
    	'gpslocation/node_modules/leaflet.locatecontrol/dist/L.Control.Locate.min.css'
	], function(args, _){

    // TODO: how to specify consistent plugin render ordering?
    // we use a timeout to make sure this button is rendered last
    // but a better method is warranted
    setTimeout(function(){
        L.control.locate({
            position: 'bottomleft',
            showPopup: false,
            locateOptions: {
                enableHighAccuracy: true
            },
            strings: {
                title: "Show My Location"
            }
        }).addTo(args.map);
    }, 150);
});
