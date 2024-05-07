import { _ } from '../classes/gettext';

const units = {
    acres: {
      factor: 0.00024711,
      label: _('Acres'),
      abbr: 'ac',
      round: 5
    },
    feet: {
      factor: 3.2808,
      label: _('Feet'),
      abbr: 'ft',
      round: 4
    },
    hectares: {
      factor: 0.0001,
      label: _('Hectares'),
      abbr: 'ha',
      round: 4
    },
    meters: {
      factor: 1,
      label: _('Meters'),
      abbr: 'm',
      round: 3
    },
    kilometers: {
        factor: 0.001,
        label: _('Kilometers'),
        abbr: 'km',
        round: 5
    },
    centimeters: {
      factor: 100,
      label: _('Centimeters'),
      abbr: 'cm',
      round: 1
    },
    miles: {
      factor: 3.2808 / 5280,
      label: _('Miles'),
      abbr: 'mi',
      round: 5
    },
    sqfeet: {
      factor: 10.7639,
      label: _('Square Feet'),
      abbr: 'ft²',
      round: 2,
    },
    sqmeters: {
      factor: 1,
      label: _('Square Meters'),
      abbr: 'm²',
      round: 2,
    },
    sqmiles: {
      factor: 0.000000386102,
      label: _('Square Miles'),
      abbr: 'mi²',
      round: 5
    }
  };

class UnitSystem{
    lengthUnit(meters){ throw new Error("Not implemented"); }
    areaUnit(sqmeters){ throw new Error("Not implemented"); }
    
    area(meters){

    }

    length(sqmeters){
        const unit = this.lengthUnit(sqmeters);
        const v = unit.factor * sqmeters;
        return {v, s: `{v.toLocaleString()}` };
    }
};

class Metric extends UnitSystem{
    lengthUnit(meters){
        if (meters < 100) return units.centimeters;
        else if (meters >= 1000) return units.kilometers;
        else return units.meters;
    }

    areaUnit(sqmeters){
        return units.sqmeters; // TODO
    }
}

class Imperial extends UnitSystem{
    lengthUnit(meters){
        const feet = units.feet.factor * meters;
        if (feet >= 5280) return units.miles;
        else return units.feet;
    }

    areaUnit(sqmeters){
        const sqfeet = units.sqfeet.factor * meters;
        if (sqfeet >= 43560 && sqfeet < 27878400) return units.acres;
        else if (sqfeet >= 27878400) return units.sqmiles;
        else return units.sqfeet;
    }
}

const systems = {
    metric: new Metric(),


    // TODO
}

let a = 100;
let S = systems.metric;


export default {
    // to be used on individual strings
    
};

