import { _ } from './gettext';

const units = {
    acres: {
      factor: 1 / 4046.85642,
      abbr: 'ac',
      round: 5
    },
    feet: {
      factor: 3.28084,
      abbr: 'ft',
      round: 4
    },
    hectares: {
      factor: 0.0001,
      abbr: 'ha',
      round: 4
    },
    meters: {
      factor: 1,
      abbr: 'm',
      round: 3
    },
    kilometers: {
        factor: 0.001,
        abbr: 'km',
        round: 5
    },
    centimeters: {
      factor: 100,
      abbr: 'cm',
      round: 1
    },
    miles: {
      factor: 3.28084 / 5280,
      abbr: 'mi',
      round: 5
    },
    sqfeet: {
      factor: 1 / 0.09290304,
      abbr: 'ft²',
      round: 2
    },
    sqmeters: {
      factor: 1,
      abbr: 'm²',
      round: 2
    },
    sqkilometers: {
        factor: 0.000001,
        abbr: 'km²',
        round: 5
    },
    sqmiles: {
      factor: 0.000000386102,
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

