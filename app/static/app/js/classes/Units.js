import { _ } from '../classes/gettext';

const units = {
    acres: {
      factor: 0.00024711,
      label: _('Acres'),
      abbr: 'ac'
    },
    feet: {
      factor: 3.2808,
      label: _('Feet'),
      abbr: 'ft'
    },
    hectares: {
      factor: 0.0001,
      label: _('Hectares'),
      abbr: 'ha'
    },
    meters: {
      factor: 1,
      label: _('Meters'),
      abbr: 'm'
    },
    kilometers: {
        factor: 0.001,
        label: _('Kilometers'),
        abbr: 'km'
    },
    centimeters: {
      factor: 100,
      label: _('Centimeters'),
      abbr: 'cm'
    },
    miles: {
      factor: 3.2808 / 5280,
      label: _('Miles'),
      abbr: 'mi'
    },
    sqfeet: {
      factor: 10.7639,
      label: _('Square Feet'),
      abbr: 'ft²'
    },
    sqmeters: {
      factor: 1,
      label: _('Square Meters'),
      abbr: 'm²'
    },
    sqmiles: {
      factor: 0.000000386102,
      label: _('Square Miles'),
      abbr: 'mi²'
    }
  };

const systems = {
    metric: {
        length: [units.kilometers, units.meters, units.centimeters],
        area: [units.sqmeters]
    }

    // TODO
}

export default {
    // to be used on individual strings
    
};

