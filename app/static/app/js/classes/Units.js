import { _ } from './gettext';

const units = {
    acres: {
        factor: (1 / (0.3048 * 0.3048)) / 43560,
        abbr: 'ac',
        round: 5
    },
    acres_us: {
      factor: Math.pow(3937 / 1200, 2) / 43560,
      abbr: 'ac (US)',
      round: 5
    },
    feet: {
      factor: 1 / 0.3048,
      abbr: 'ft',
      round: 4
    },
    feet_us:{
      factor: 3937 / 1200,
      abbr: 'ft (US)',
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
        factor: (1 / 0.3048) / 5280,
        abbr: 'mi',
        round: 5
      },
    miles_us: {
        factor: (3937 / 1200) / 5280,
        abbr: 'mi (US)',
        round: 5
    },
    sqfeet: {
      factor: 1 / (0.3048 * 0.3048),
      abbr: 'ft²',
      round: 2
    },
    sqfeet_us: {
        factor: Math.pow(3937 / 1200, 2),
        abbr: 'ft² (US)',
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
      factor: Math.pow((1 / 0.3048) / 5280, 2),
      abbr: 'mi²',
      round: 5
    },
    sqmiles_us: {
        factor: Math.pow((3937 / 1200) / 5280, 2),
        abbr: 'mi² (US)',
        round: 5
    },
    cbmeters:{
        factor: 1,
        abbr: 'm³',
        round: 4
    },
    cbyards:{
        factor: Math.pow(1/(0.3048*3), 3),
        abbr: 'yd³',
        round: 4
    },
    cbyards_us:{
        factor: Math.pow(3937/3600, 3),
        abbr: 'yd³ (US)',
        round: 4
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
    volumeUnit(cbmeters){ throw new Error("Not implemented"); }
    
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

    volume(cbmeters){
        const unit = this.volumeUnit(cbmeters);
        const val = unit.factor * cbmeters;
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

    volumeUnit(cbmeters){
        return units.cbmeters;
    }
}

class ImperialSystem extends UnitSystem{
    getName(){
        return _("Imperial");
    }

    feet(){
        return units.feet;
    }

    sqfeet(){
        return units.sqfeet;
    }

    miles(){
        return units.miles;
    }

    sqmiles(){
        return units.sqmiles;
    }

    acres(){
        return units.acres;
    }

    cbyards(){
        return units.cbyards;
    }
    
    lengthUnit(meters){
        const feet = this.feet().factor * meters;
        if (feet >= 5280) return this.miles();
        else return this.feet();
    }

    areaUnit(sqmeters){
        const sqfeet = this.sqfeet().factor * sqmeters;
        if (sqfeet >= 43560 && sqfeet < 27878400) return this.acres();
        else if (sqfeet >= 27878400) return this.sqmiles();
        else return this.sqfeet();
    }

    volumeUnit(cbmeters){
        return this.cbyards();
    }
}

class ImperialUSSystem extends ImperialSystem{
    getName(){
        return _("Imperial (US)");
    }

    feet(){
        return units.feet_us;
    }

    sqfeet(){
        return units.sqfeet_us;
    }

    miles(){
        return units.miles_us;
    }

    sqmiles(){
        return units.sqmiles_us;
    }

    acres(){
        return units.acres_us;
    }

    cbyards(){
        return units.cbyards_us;
    }
}

const systems = {
    metric: new MetricSystem(),
    imperial: new ImperialSystem(),
    imperialUS: new ImperialUSSystem()
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

