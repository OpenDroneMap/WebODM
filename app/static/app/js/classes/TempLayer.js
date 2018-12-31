import shp from 'shpjs';
import Spinner from 'spin';

export function addTempLayer(file, _this) {
  let maxSize = 5242880;

  //random color for each feature
  let getColor = () => {
    return 'rgb(' + (Math.floor(Math.random() * 256)) + ',' + (Math.floor(Math.random() * 256)) + ',' + (Math.floor(Math.random() * 256)) + ')';
  }

  //notifications on top
  let writeMessage = (_err) => {
    _this.setState({ error: _err.message || JSON.stringify(_err) });
    spinner.stop();
  }

  //show wait spinner
  var spinner = new Spinner({ color: '#fff', lines: 12 }).spin(_this.map._container);

  if (file && file.size > maxSize) {
    let err = {};
    err.message = file.name + " is bigger than 5 MB.";
    writeMessage(err);
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
            err.message = "Not a proper zipped shapefile " + file.name;
            writeMessage(err);
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
          err.message = "Not a proper json file " + file.name;
          writeMessage(err);
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
            color: getColor()
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
                return k + ": " + feature.properties[k];
              }).join("<br />"), {
                  maxHeight: 200
                });
            }
          }
        }
      });
    tempLayer.addTo(_this.map);
    //add layer to layer switcher with file name
    _this.autolayers.addOverlay(tempLayer, file.name);
    //zoom to all features
    _this.map.fitBounds(tempLayer.getBounds());
    spinner.stop();
  }
}