import { _ } from './gettext';

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
      round: 2
    },
    sqmeters: {
      factor: 1,
      label: _('Square Meters'),
      abbr: 'm²',
      round: 2
    },
    sqmeters: {
        factor: 0.000001,
        label: _('Square Kilometers'),
        abbr: 'km²',
        round: 5
    },
    sqmiles: {
      factor: 0.000000386102,
      label: _('Square Miles'),
      abbr: 'mi²',
      round: 5
    }
};

class ValueUnit{
    constructor(val, unit){
        this.val = val;
        this.unit = unit;
    }

    toString(){
        const mul = Math.pow(10, this.unit.round);
        const rounded = (Math.round(this.val * mul) / mul).toString();

        let withCommas = "";
        let parts = rounded.split(".");
        parts[0] = parts[0].replace(/\B(?=(\d{3})+(?!\d))/g, ",");
        withCommas = parts.join(".");

        return `${withCommas} ${this.unit.abbr}`;
    }
}

class UnitSystem{
    lengthUnit(meters){ throw new Error("Not implemented"); }
    areaUnit(sqmeters){ throw new Error("Not implemented"); }
    getName(){ throw new Error("Not implemented"); }
    
    area(sqmeters){
        const unit = this.areaUnit(sqmeters);
        const val = unit.factor * sqmeters;
        return new ValueUnit(val, unit);
    }

    length(meters){
        const unit = this.lengthUnit(meters);
        const val = unit.factor * meters;
        return new ValueUnit(val, unit);
    }
};

class MetricSystem extends UnitSystem{
    getName(){
        return _("Metric");
    }

    lengthUnit(meters){
        if (meters < 1) return units.centimeters;
        else if (meters >= 1000) return units.kilometers;
        else return units.meters;
    }

    areaUnit(sqmeters){
        if (sqmeters >= 10000 && sqmeters < 1000000) return units.hectares;
        else if (sqmeters >= 1000000) return units.sqkilometers;
        return units.sqmeters;
    }
}

class ImperialSystem extends UnitSystem{
    getName(){
        return _("Imperial");
    }
    
    lengthUnit(meters){
        const feet = units.feet.factor * meters;
        if (feet >= 5280) return units.miles;
        else return units.feet;
    }

    areaUnit(sqmeters){
        const sqfeet = units.sqfeet.factor * sqmeters;
        if (sqfeet >= 43560 && sqfeet < 27878400) return units.acres;
        else if (sqfeet >= 27878400) return units.sqmiles;
        else return units.sqfeet;
    }
}

const systems = {
    metric: new MetricSystem(),
    imperial: new ImperialSystem()
}

// Expose to allow every part of the app to access this information
function getPreferredUnitSystem(){
    return localStorage.getItem("preferred_unit_system") || "metric";
}
function setPreferredUnitSystem(system){
    localStorage.setItem("preferred_unit_system", system);
}

export {
    systems,
    getPreferredUnitSystem,
    setPreferredUnitSystem
};

