import L from 'leaflet';
import './app.scss';
import 'leaflet-measure-ex/dist/leaflet-measure';
import 'leaflet-measure-ex/dist/leaflet-measure.css';
import MeasurePopup from './MeasurePopup';
import ReactDOM from 'ReactDOM';
import React from 'react';
import $ from 'jquery';

module.exports = class App{
    constructor(map){
        this.map = map;

        L.control.measure({
          labels:{
            measureDistancesAndAreas: 'Measure volume, area and length',
            areaMeasurement: 'Measurement'
          },
          primaryLengthUnit: 'meters',
          secondaryLengthUnit: 'feet',
          primaryAreaUnit: 'sqmeters',
          secondaryAreaUnit: 'acres'
        }).addTo(map);

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