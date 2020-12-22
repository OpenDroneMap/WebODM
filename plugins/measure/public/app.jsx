import L from 'leaflet';
import './app.scss';
import 'leaflet-measure-ex/dist/leaflet-measure';
import 'leaflet-measure-ex/dist/leaflet-measure.css';
import MeasurePopup from './MeasurePopup';
import Utils from 'webodm/classes/Utils';
import ReactDOM from 'ReactDOM';
import React from 'React';
import $ from 'jquery';
import { _, get_format } from 'webodm/classes/gettext';

export default class App{
    constructor(map){
        this.map = map;

        const measure = L.control.measure({
          labels:{
            measureDistancesAndAreas: _('Measure volume, area and length'),
            areaMeasurement: _('Measurement'),
            measure: _("Measure"),
            createNewMeasurement: _("Create a new measurement"),
            startCreating: _("Start creating a measurement by adding points to the map"),
            finishMeasurement: _("Finish measurement"),
            lastPoint: _("Last point"),
            area: _("Area"),
            perimeter: _("Perimeter"),
            pointLocation: _("Point location"),
            linearMeasurement: _("Linear measurement"),
            pathDistance: _("Path distance"),
            centerOnArea: _("Center on this area"),
            centerOnLine: _("Center on this line"),
            centerOnLocation: _("Center on this location"),
            cancel: _("Cancel"),
            delete: _("Delete"),
            acres: _("Acres"),
            feet: _("Feet"),
            kilometers: _("Kilometers"),
            hectares: _("Hectares"),
            meters: _("Meters"),
            miles: _("Miles"),
            sqfeet: _("Sq Feet"),
            sqmeters: _("Sq Meters"),
            sqmiles: _("Sq Miles"),
            decPoint: get_format("DECIMAL_SEPARATOR"),
            thousandsSep: get_format("THOUSAND_SEPARATOR")
          },
          primaryLengthUnit: 'meters',
          secondaryLengthUnit: 'feet',
          primaryAreaUnit: 'sqmeters',
          secondaryAreaUnit: 'acres'
        }).addTo(map);

        // measure.options.labels.

        const $btnExport = $(`<br/><a href='#' class='js-start start'>${_("Export Measurements")}</a>`);
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