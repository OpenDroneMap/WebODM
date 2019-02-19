import L from 'leaflet';
import './app.scss';
import 'leaflet-measure-ex/dist/leaflet-measure';
import 'leaflet-measure-ex/dist/leaflet-measure.css';
import MeasurePopup from './MeasurePopup';
import Utils from 'webodm/classes/Utils';
import ReactDOM from 'ReactDOM';
import React from 'react';
import $ from 'jquery';

export default class App{
    constructor(map){
        this.map = map;

        const measure = L.control.measure({
          labels:{
            measureDistancesAndAreas: 'Measure volume, area and length',
            areaMeasurement: 'Measurement'
          },
          primaryLengthUnit: 'meters',
          secondaryLengthUnit: 'feet',
          primaryAreaUnit: 'sqmeters',
          secondaryAreaUnit: 'acres'
        }).addTo(map);

        const $btnExport = $("<br/><a href='#' class='js-start start'>Export Measurements</a>");
        $btnExport.appendTo($(measure.$startPrompt).children("ul.tasks"));
        $btnExport.on('click', () => {
          const features = [];
          map.eachLayer(layer => {
            const mp = layer._measurePopup;
            if (mp){
              features.push(mp.getGeoJSON());
            }
          });

          const geoJSON = {
            type: "FeatureCollection",
            features: features
          };

          Utils.saveAs(JSON.stringify(geoJSON, null, 4), "measurements.geojson")
        });

        map.on('measurepopupshown', ({popupContainer, model, resultFeature}) => {
            // Only modify area popup, length popup is fine as default
            if (model.area !== 0){
                const $container = $("<div/>"),
                      $popup = $(popupContainer);

                $popup.children("p").empty();
                $popup.children("h3:first-child").after($container);

                ReactDOM.render(<MeasurePopup 
                                    model={model} 
                                    resultFeature={resultFeature} 
                                    map={map} />, $container.get(0));
            }
        });
    }
}