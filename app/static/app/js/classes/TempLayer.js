import shp from 'shpjs';
import { _, interpolate } from './gettext';
import createFieldLayerControlPopup from '../components/FieldLayerControlPopup'

export function addTempLayer(file, cb) {
  let maxSize = 5242880;

  //random color for each feature
  let getColor = () => {
    return 'rgb(' + (Math.floor(Math.random() * 256)) + ',' + (Math.floor(Math.random() * 256)) + ',' + (Math.floor(Math.random() * 256)) + ')';
  }

  if (file && file.size > maxSize) {
    let err = {};
    err.message = interpolate(_("%(file)s is bigger than 5 MB."), { file: file.name });
    cb(err);
  } else {
    //get just the first file
    //file = file[0];
    let reader = new FileReader();
    let isZipFile = file.name.slice(-3) === 'zip';
    if (isZipFile) {
      //zipped shapefile
      reader.onload = function () {
        if (reader.readyState != 2 || reader.error) {
          return;
        } else {
          shp(reader.result).then(function (geojson) {
            addLayer(geojson);
          }).catch(function (err) {
            err.message = interpolate(_("Not a proper zipped shapefile: %(file)s"), { file: file.name });
            cb(err);
          })
        }
      }
      reader.readAsArrayBuffer(file);
    } else {
      //geojson file
      reader.onload = function () {
        try {
          let geojson = JSON.parse(reader.result);
          addLayer(geojson);
        } catch (err) {
          err.message = interpolate(_("Not a proper JSON file: %(file)s"), { file: file.name });
          cb(err);
        }
      }
      reader.readAsText(file);
    }
  }

  let addLayer = (_geojson) => {
    let tempLayer =
      L.geoJson(_geojson, {
        style: function (feature) {
          return {
            opacity: 1,
            fillOpacity: 0.7,
            color: '#99ff99'
          }
        },
        //for point layers
        pointToLayer: function (feature, latlng) {
          return L.circleMarker(latlng, {
            radius: 6,
            color: getColor(),
            opacity: 1,
            fillOpacity: 0.7
          });
        },
        //
        onEachFeature: function (feature, layer) {
          if (feature.properties) {
            if (feature.properties) {
              layer.bindPopup(Object.keys(feature.properties).map(function (k) {
                return "<strong>" + k + ":</strong> " + feature.properties[k];
              }).join("<br />"), {
                  maxHeight: 200
                });
            }
          }
        }
      });
    tempLayer.options.bounds = tempLayer.getBounds();
    
    cb(null, tempLayer, file.name);
  }
}

export function addTempLayerUsingRequest(api, api_type, aiTypes, cb) {
    fetch(api).then((value) => {
      if (value.status == 404) {
        let err = {};
        err.message = interpolate(_("Detection at %(url)s not found!"), { url: api });
        cb(err);
        return;
      }

      
      value.json().then((geojson) => {
        if (Array.isArray(geojson)) {
          geojson.forEach((el, idx) => {
            if (el.features.length != 0){
              addLayer(el);
            }
            else {
              console.warn(`Warning: The element of index ${idx} in the geojson list that has recently been loaded had no features!\nGeojson without features cannot be properly displayed in the map!\nSkipping index ${idx}!`);
            }
          });
          return
        }
        addLayer(geojson);
      }).catch((err) => {
        console.error(err)
        err.message = interpolate(_("Not a proper JSON file at: %(url)s!"), { url: api });
        cb(err);
      });
    });

    let addLayer = (_geojson) => {
      let tempLayer =
        L.geoJson(_geojson, {
          style: function (feature) {
            return {
              opacity: 1,
              fillOpacity: 0.7,
              color: '#99ff99'
            }
          },
          //for point layers
          pointToLayer: function (feature, latlng) {
            return L.circleMarker(latlng, {
              radius: 6,
              color: getColor(),
              opacity: 1,
              fillOpacity: 0.7
            });
          },
          //
          onEachFeature: function (feature, layer) {
            if (feature.properties && api_type == 'field') {
                layer.bindPopup(createFieldLayerControlPopup(aiTypes, layer), {
                    maxHeight: 200
              });
            }
          }
        });
        
      tempLayer.options.bounds = tempLayer.getBounds();

      cb(null, tempLayer, api);
    }
}