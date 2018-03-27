import 'leaflet-draw';
import 'leaflet-draw/dist/leaflet.draw.css';
import $ from 'jquery';
import L from 'leaflet';

module.exports = class App{
    constructor(map){
        this.map = map;
    }

    setupVolumeControls(){
        const { map } = this;

        const editableLayers = new L.FeatureGroup();
        map.addLayer(editableLayers);

        const options = {
            position: 'topright',
            draw: {
                toolbar: {
                    buttons: {
                        polygon: 'Draw an awesome polygon'
                    }
                },
                polyline: false,
                polygon: {
                    showArea: true,
                    showLength: true,

                    allowIntersection: false, // Restricts shapes to simple polygons
                    drawError: {
                        color: '#e1e100', // Color the shape will turn when intersects
                        message: '<strong>Oh snap!<strong> Area cannot have intersections!' // Message that will show when intersect
                    },
                    shapeOptions: {
                        // color: '#bada55'
                    }
                },
                circle: false,
                rectangle: false,
                marker: false,
                circlemarker: false
            },
            edit: {
                featureGroup: editableLayers,
                // remove: false
                edit: {
                    selectedPathOptions: {
                      maintainColor: true,
                      dashArray: '10, 10'
                    }
                }
            }
        };

        const drawControl = new L.Control.Draw(options);
        map.addControl(drawControl);

        // Is there a better way?
        $(drawControl._container)
            .find('a.leaflet-draw-draw-polygon')
            .attr('title', 'Measure Volume');
        
        map.on(L.Draw.Event.CREATED, (e) => {
            const { layer } = e;
            layer.feature = {geometry: {type: 'Polygon'} };

            var paramList;
            // $.ajax({
            //     type: 'POST',
            //     async: false,
            //     url: `/api/projects/${meta.task.project}/tasks/${meta.task.id}/volume`,
            //     data: JSON.stringify(e.layer.toGeoJSON()),
            //     contentType: "application/json",
            //     success: function (msg) {
            //         paramList = msg;
            //     },
            //     error: function (jqXHR, textStatus, errorThrown) {
            //         alert("get session failed " + errorThrown);
            //     }
            // });

            e.layer.bindPopup('Volume: test');
        
            editableLayers.addLayer(layer);
        });

        map.on(L.Draw.Event.EDITED, (e) => {
            console.log("EDITED ", e);
        });
    }
}