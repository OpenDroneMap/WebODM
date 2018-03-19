PluginsAPI.Map.willAddControls([
    'volume/build/app.js'
	], function(options, App){
    new App();
});

/*
    const featureGroup = L.featureGroup();
    featureGroup.addTo(this.map);

    new L.Control.Draw({
        draw: {
          polygon: {
            allowIntersection: false, // Restricts shapes to simple polygons
            shapeOptions: {
              color: '#707070'
            }
          },
          rectangle: false,
          circle: false,
          circlemarker: false,
          marker: false
        },
        edit: {
          featureGroup: featureGroup,
          edit: {
            selectedPathOptions: {
              maintainColor: true,
              dashArray: '10, 10'
            }
          }
        }
      }).addTo(this.map);

    this.map.on(L.Draw.Event.CREATED, function(e) {
      e.layer.feature = {geometry: {type: 'Polygon'} };
      featureGroup.addLayer(e.layer);

      var paramList;
        $.ajax({
            type: 'POST',
            async: false,
            url: `/api/projects/${meta.task.project}/tasks/${meta.task.id}/volume`,
            data: JSON.stringify(e.layer.toGeoJSON()),
            contentType: "application/json",
            success: function (msg) {
                paramList = msg;
            },
            error: function (jqXHR, textStatus, errorThrown) {
                alert("get session failed " + errorThrown);
            }
        });

      e.layer.bindPopup('Volume: ' + paramList.toFixed(2) + 'Mètres Cubes (m3)');
    });

    this.map.on(L.Draw.Event.EDITED, function(e) {
      e.layers.eachLayer(function(layer) {
        const meta = window.meta;

        var paramList = null;
        $.ajax({
            type: 'POST',
            async: false,
            url: `/api/projects/${meta.task.project}/tasks/${meta.task.id}/volume`,
            data: JSON.stringify(layer.toGeoJSON()),
            contentType: "application/json",
            success: function (msg) {
                paramList = msg;
            },
            error: function (jqXHR, textStatus, errorThrown) {
                alert("get session failed " + errorThrown);
            }
        });

      layer.setPopupContent('Volume: ' + paramList.toFixed(2) + 'Mètres Cubes (m3)');

      });
    });*/