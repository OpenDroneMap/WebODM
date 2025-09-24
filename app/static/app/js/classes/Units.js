import { _ } from './gettext';

/**
 * Unit type constants - used to categorize different measurement types
 * Each unit must belong to one of these types to ensure proper conversion
 */
const types = {
    LENGTH: 1,
    AREA: 2,
    VOLUME: 3,
    TEMPERATURE: 4
};

/**
 * Comprehensive unit definitions with conversion factors
 * 
 * The base units for internal calculations are:
 * - LENGTH: meters
 * - AREA: square meters
 * - VOLUME: cubic meters
 * - TEMPERATURE: Celsius
 * 
 * Each unit object contains:
 * - factor: multiplication factor to convert FROM base unit TO this unit
 *           (e.g., meters × factor = feet)
 * - conversion: for non-linear conversions like temperature (uses functions instead of factors)
 * - abbr: abbreviation displayed to users
 * - round: default decimal places for display
 * - label: translatable label for UI
 * - type: one of the types constants above
 */
const units = {
    // AREA UNITS
    acres: {
        // Convert square meters to acres (international foot standard)
        // 1 meter = 1/0.3048 feet (exact)
        // 1 acre = 43560 square feet
        // So: sq meters → sq feet → acres
        factor: (1 / (0.3048 * 0.3048)) / 43560,
        abbr: 'ac',
        round: 5,
        label: _("Acres"),
        type: types.AREA
    },
    acres_us: {
        // US Survey foot differs from international foot
        // US Survey foot = 1200/3937 meters (slightly larger than international foot)
        // UNCERTAINTY: The math here uses 3937/1200 as the conversion from meters to US feet
        // This appears to be inverted - should verify this is correct
        factor: Math.pow(3937 / 1200, 2) / 43560,
        abbr: 'ac (US)',
        round: 5,
        label: _("Acres"),
        type: types.AREA
    },
    
    // LENGTH UNITS
    feet: {
        // International foot definition: 1 foot = 0.3048 meters (exact)
        factor: 1 / 0.3048,
        abbr: 'ft',
        round: 4,
        label: _("Feet"),
        type: types.LENGTH
    },
    feet_us: {
        // US Survey foot: 1 meter = 3937/1200 US feet
        // More precisely: 1 US foot = 1200/3937 meters
        factor: 3937 / 1200,
        abbr: 'ft (US)',
        round: 4,
        label: _("Feet"),
        type: types.LENGTH
    },
    hectares: {
        // 1 hectare = 10,000 square meters
        factor: 0.0001,  // Convert sq meters to hectares
        abbr: 'ha',
        round: 4,
        label: _("Hectares"),
        type: types.AREA
    },
    meters: {
        // Base unit for length - no conversion needed
        factor: 1,
        abbr: 'm',
        round: 3,
        label: _("Meters"),
        type: types.LENGTH
    },
    kilometers: {
        // 1 kilometer = 1000 meters
        factor: 0.001,
        abbr: 'km',
        round: 5,
        label: _("Kilometers"),
        type: types.LENGTH
    },
    centimeters: {
        // 1 meter = 100 centimeters
        factor: 100,
        abbr: 'cm',
        round: 1,
        label: _("Centimeters"),
        type: types.LENGTH
    },
    miles: {
        // 1 mile = 5280 feet (international foot standard)
        // First convert meters to feet, then feet to miles
        factor: (1 / 0.3048) / 5280,
        abbr: 'mi',
        round: 5,
        label: _("Miles"),
        type: types.LENGTH
    },
    miles_us: {
        // US Survey mile using US Survey foot
        factor: (3937 / 1200) / 5280,
        abbr: 'mi (US)',
        round: 5,
        label: _("Miles"),
        type: types.LENGTH
    },
    
    // AREA UNITS (continued)
    sqfeet: {
        // Square feet (international foot standard)
        // 1 sq meter = (1/0.3048)² sq feet
        factor: 1 / (0.3048 * 0.3048),
        abbr: 'ft²',
        round: 2,
        label: _("Square Feet"),
        type: types.AREA
    },
    sqfeet_us: {
        // Square feet (US Survey foot standard)
        factor: Math.pow(3937 / 1200, 2),
        abbr: 'ft² (US)',
        round: 2,
        label: _("Square Feet"),
        type: types.AREA
    },
    sqmeters: {
        // Base unit for area - no conversion needed
        factor: 1,
        abbr: 'm²',
        round: 2,
        label: _("Square Meters"),
        type: types.AREA
    },
    sqkilometers: {
        // 1 sq kilometer = 1,000,000 sq meters
        factor: 0.000001,
        abbr: 'km²',
        round: 5,
        label: _("Square Kilometers"),
        type: types.AREA
    },
    sqmiles: {
        // Square miles (international foot standard)
        // 1 sq mile = (5280 feet)²
        factor: Math.pow((1 / 0.3048) / 5280, 2),
        abbr: 'mi²',
        round: 5,
        label: _("Square Miles"),
        type: types.AREA
    },
    sqmiles_us: {
        // Square miles (US Survey foot standard)
        factor: Math.pow((3937 / 1200) / 5280, 2),
        abbr: 'mi² (US)',
        round: 5,
        label: _("Square Miles"),
        type: types.AREA
    },
    
    // VOLUME UNITS
    cbmeters: {
        // Base unit for volume - no conversion needed
        factor: 1,
        abbr: 'm³',
        round: 4,
        label: _("Cubic Meters"),
        type: types.VOLUME
    },
    cbyards: {
        // Cubic yards (international foot standard)
        // 1 yard = 3 feet = 3 × 0.3048 meters
        // 1 cubic yard = (3 × 0.3048)³ cubic meters
        // So factor converts FROM cubic meters TO cubic yards
        factor: Math.pow(1/(0.3048*3), 3),
        abbr: 'yd³',
        round: 4,
        label: _("Cubic Yards"),
        type: types.VOLUME
    },
    cbyards_us: {
        // Cubic yards (US Survey foot standard)
        // UNCERTAINTY: This uses 3937/3600 for meter to US yard conversion
        // Need to verify: 1 US yard = 3600/3937 meters (3 US feet)
        factor: Math.pow(3937/3600, 3),
        abbr: 'yd³ (US)',
        round: 4,
        label: _("Cubic Yards"),
        type: types.VOLUME
    },
    
    // TEMPERATURE UNITS
    // Temperature uses conversion functions instead of factors since it's not a simple multiplication
    celsius: {
        conversion: {
            // Identity functions since Celsius is our base temperature unit
            forward: celsius => celsius,
            backward: celsius => celsius
        },
        abbr: '°C',
        round: 1,
        label: _("Celsius"),
        type: types.TEMPERATURE
    },
    fahrenheit: {
        conversion: {
            // Standard temperature conversion formulas
            forward: celsius => (9.0 / 5.0) * celsius + 32.0,  // C to F
            backward: fahrenheit => (fahrenheit - 32.0) * (5.0 / 9.0)  // F to C
        },
        abbr: '°F',
        round: 1,
        label: _("Fahrenheit"),
        type: types.TEMPERATURE
    }
};

/**
 * ValueUnit class - Represents a numeric value with its associated unit
 * This allows us to keep the value and unit together for proper formatting
 */
class ValueUnit {
    constructor(value, unit) {
        this.value = value;
        this.unit = unit;
    }

    /**
     * Convert the value to a string with proper formatting
     * @param {Object} opts - Options object
     * @param {number} opts.precision - Override default decimal places for this unit
     * @returns {string} Formatted string like "1,234.56 ft"
     */
    toString(opts = {}) {
        // Determine decimal places - use override or unit's default
        const mul = Math.pow(10, opts.precision !== undefined ? opts.precision : this.unit.round);
        
        // Round to specified decimal places
        const rounded = (Math.round(this.value * mul) / mul).toString();

        // Add thousands separators (commas) for readability
        // This regex adds commas to the integer part only
        let withCommas = "";
        let parts = rounded.split(".");
        parts[0] = parts[0].replace(/\B(?=(\d{3})+(?!\d))/g, ",");
        withCommas = parts.join(".");

        return `${withCommas} ${this.unit.abbr}`;
    }
}

/**
 * NanUnit class - Special case for invalid/NaN values
 * Provides a consistent interface when calculations fail
 */
class NanUnit {
    constructor() {
        this.value = NaN;
        this.unit = units.meters; // Default unit (doesn't matter since value is NaN)
    }
    
    toString() {
        return "NaN";
    }
}

/**
 * Abstract base class for unit systems
 * Defines the interface that all unit systems must implement
 * 
 * Design pattern: Template Method + Strategy Pattern
 * - Each unit system implements its own strategy for selecting appropriate units
 * - The base class provides template methods that use these strategies
 */
class UnitSystem {
    // Abstract methods that must be implemented by subclasses
    // These determine which specific unit to use based on the magnitude of the value
    
    /**
     * Select appropriate length unit based on value magnitude
     * @param {number} meters - Value in meters
     * @param {Object} opts - Options (e.g., fixedUnit to force a specific unit)
     * @returns {Object} Unit object from units constant
     */
    lengthUnit(meters, opts = {}) { throw new Error("Not implemented"); }
    
    areaUnit(sqmeters, opts = {}) { throw new Error("Not implemented"); }
    volumeUnit(cbmeters, opts = {}) { throw new Error("Not implemented"); }
    temperatureUnit(celsius, opts = {}) { throw new Error("Not implemented"); }
    
    // System identification methods
    getName() { throw new Error("Not implemented"); }
    getKey() { throw new Error("Not implemented"); }
    
    /**
     * Convert area from square meters to appropriate unit in this system
     * @param {number} sqmeters - Area in square meters
     * @param {Object} opts - Options for unit selection
     * @returns {ValueUnit} Value with appropriate unit
     */
    area(sqmeters, opts = {}) {
        sqmeters = parseFloat(sqmeters);
        if (isNaN(sqmeters)) return NanUnit();  // ISSUE: Should return `new NanUnit()`

        // Let the subclass decide which unit is appropriate
        const unit = this.areaUnit(sqmeters, opts);
        
        // Convert from base unit (sq meters) to selected unit
        const val = unit.factor * sqmeters;
        return new ValueUnit(val, unit);
    }

    /**
     * Special case of length for elevation
     * Always uses fixed unit (meters/feet) regardless of magnitude
     */
    elevation(meters) {
        return this.length(meters, { fixedUnit: true });
    }

    /**
     * Convert length from meters to appropriate unit in this system
     */
    length(meters, opts = {}) {
        meters = parseFloat(meters);
        if (isNaN(meters)) return NanUnit();  // ISSUE: Should return `new NanUnit()`

        const unit = this.lengthUnit(meters, opts);
        const val = unit.factor * meters;
        return new ValueUnit(val, unit);
    }

    /**
     * Convert volume from cubic meters to appropriate unit in this system
     */
    volume(cbmeters, opts = {}) {
        cbmeters = parseFloat(cbmeters);
        if (isNaN(cbmeters)) return NanUnit();  // ISSUE: Should return `new NanUnit()`

        const unit = this.volumeUnit(cbmeters, opts);
        const val = unit.factor * cbmeters;
        return new ValueUnit(val, unit);
    }

    /**
     * Convert temperature from Celsius to appropriate unit in this system
     * Note: Uses conversion functions instead of factors
     */
    temperature(celsius, opts = {}) {
        celsius = parseFloat(celsius);
        if (isNaN(celsius)) return NanUnit();  // ISSUE: Should return `new NanUnit()`

        const unit = this.temperatureUnit(celsius, opts);
        
        // Temperature uses conversion functions, not factors
        const val = unit.conversion.forward(celsius);
        return new ValueUnit(val, unit);
    }
}

/**
 * Convert any value/unit combination back to metric base units
 * This is the inverse operation - going from any unit back to the base unit
 * 
 * @param {number|ValueUnit} valueUnit - Either a number or ValueUnit object
 * @param {Object} unit - Unit object (required if valueUnit is a number)
 * @returns {ValueUnit} Value in base metric units
 */
function toMetric(valueUnit, unit) {
    let value = NaN;
    
    // Handle both overloaded signatures:
    // 1. toMetric(valueUnitObject)
    // 2. toMetric(value, unit)
    if (typeof valueUnit === "object" && unit === undefined) {
        value = valueUnit.value;
        unit = valueUnit.unit;
    } else {
        value = parseFloat(valueUnit);
    }
    
    if (isNaN(value)) return NanUnit();  // ISSUE: Should return `new NanUnit()`

    let val;
    
    // Determine conversion method based on unit type
    if (unit.factor !== undefined) {
        // Simple multiplication for most units
        // Since factor converts FROM base TO unit, we divide to go back
        val = value / unit.factor;
    } else if (unit.conversion !== undefined) {
        // Use backward conversion function for temperature
        val = unit.conversion.backward(value);
    } else {
        throw new Error(`No unit factor or conversion: ${unit.type}`);
    }

    // Return appropriate base unit based on type
    // ISSUE: There's a bug here - units.sqmeters is undefined, should be units.sqmeters
    if (unit.type === types.LENGTH) {
        return new ValueUnit(val, units.meters);
    } else if (unit.type === types.AREA) {
        return new ValueUnit(val, unit.sqmeters);  // BUG: Should be units.sqmeters
    } else if (unit.type === types.VOLUME) {
        return new ValueUnit(val, unit.cbmeters);  // BUG: Should be units.cbmeters
    } else if (unit.type === types.TEMPERATURE) {
        return new ValueUnit(val, units.celsius);
    } else {
        throw new Error(`Unrecognized unit type: ${unit.type}`);
    }
}

/**
 * Metric System implementation
 * Uses metric units (meters, kilometers, hectares, etc.)
 */
class MetricSystem extends UnitSystem {
    getName() {
        return _("Metric");  // Translatable name for UI
    }

    getKey() {
        return "metric";  // Key for storage/retrieval
    }

    /**
     * Smart length unit selection based on magnitude
     * - Under 1m: use centimeters
     * - 1m to 1000m: use meters  
     * - 1000m+: use kilometers
     * Unless fixedUnit option forces meters
     */
    lengthUnit(meters, opts = {}) {
        if (opts.fixedUnit) return units.meters;

        if (meters < 1) return units.centimeters;
        else if (meters >= 1000) return units.kilometers;
        else return units.meters;
    }

    /**
     * Smart area unit selection
     * - Under 10,000 m²: use square meters
     * - 10,000 to 1,000,000 m²: use hectares
     * - 1,000,000+ m²: use square kilometers
     */
    areaUnit(sqmeters, opts = {}) {
        if (opts.fixedUnit) return units.sqmeters;

        if (sqmeters >= 10000 && sqmeters < 1000000) return units.hectares;
        else if (sqmeters >= 1000000) return units.sqkilometers;
        return units.sqmeters;
    }

    /**
     * Volume always uses cubic meters in metric
     */
    volumeUnit(cbmeters, opts = {}) {
        return units.cbmeters;
    }

    /**
     * Temperature always uses Celsius in metric
     */
    temperatureUnit(celsius, opts = {}) {
        return units.celsius;
    }
}

/**
 * Imperial System implementation  
 * Uses imperial units (feet, miles, acres, etc.) with international foot standard
 */
class ImperialSystem extends UnitSystem {
    getName() {
        return _("Imperial");
    }

    getKey() {
        return "imperial";
    }

    // Helper methods to get the correct unit variants
    // These allow subclasses to override which specific units to use
    feet() {
        return units.feet;
    }

    sqfeet() {
        return units.sqfeet;
    }

    miles() {
        return units.miles;
    }

    sqmiles() {
        return units.sqmiles;
    }

    acres() {
        return units.acres;
    }

    cbyards() {
        return units.cbyards;
    }
    
    /**
     * Smart length unit selection
     * - Under 5280 feet (1 mile): use feet
     * - 5280+ feet: use miles
     */
    lengthUnit(meters, opts = {}) {
        if (opts.fixedUnit) return this.feet();

        const feet = this.feet().factor * meters;
        if (feet >= 5280) return this.miles();
        else return this.feet();
    }

    /**
     * Smart area unit selection
     * - Under 43,560 ft² (1 acre): use square feet
     * - 43,560 to 27,878,400 ft² (1 sq mile): use acres
     * - 27,878,400+ ft²: use square miles
     * 
     * Note: 27,878,400 = 43,560 × 640 (640 acres = 1 sq mile)
     */
    areaUnit(sqmeters, opts = {}) {
        if (opts.fixedUnit) return this.sqfeet();

        const sqfeet = this.sqfeet().factor * sqmeters;
        if (sqfeet >= 43560 && sqfeet < 27878400) return this.acres();
        else if (sqfeet >= 27878400) return this.sqmiles();
        else return this.sqfeet();
    }

    /**
     * Volume always uses cubic yards in imperial
     */
    volumeUnit(cbmeters, opts = {}) {
        return this.cbyards();
    }

    /**
     * Temperature always uses Fahrenheit in imperial
     */
    temperatureUnit(celsius, opts = {}) {
        return units.fahrenheit;
    }
}

/**
 * Imperial US System implementation
 * Similar to Imperial but uses US Survey foot standard
 * The US Survey foot is slightly different from the international foot
 */
class ImperialUSSystem extends ImperialSystem {
    getName() {
        return _("Imperial (US)");
    }

    getKey() {
        return "imperialUS";
    }

    // Override parent methods to return US variants of units
    feet() {
        return units.feet_us;
    }

    sqfeet() {
        return units.sqfeet_us;
    }

    miles() {
        return units.miles_us;
    }

    sqmiles() {
        return units.sqmiles_us;
    }

    acres() {
        return units.acres_us;
    }

    cbyards() {
        return units.cbyards_us;
    }
}

/**
 * Registry of all available unit systems
 * Allows lookup by key
 */
const systems = {
    metric: new MetricSystem(),
    imperial: new ImperialSystem(),
    imperialUS: new ImperialUSSystem()
}

// ===========================================================================
// PUBLIC API - Functions for managing user's unit system preference
// Uses localStorage for persistence and custom events for change notification
// ===========================================================================

/**
 * Get the currently selected unit system key
 * Defaults to "metric" if not set in localStorage
 */
function getUnitSystem() {
    return localStorage.getItem("unit_system") || "metric";
}

/**
 * Set the active unit system and notify listeners of changes
 * @param {string} system - Key of the system to activate ("metric", "imperial", or "imperialUS")
 */
function setUnitSystem(system) {
    let prevSystem = getUnitSystem();
    localStorage.setItem("unit_system", system);
    
    // Fire change event only if system actually changed
    if (prevSystem !== system) {
        // Custom event allows other parts of the app to react to unit system changes
        document.dispatchEvent(new CustomEvent("onUnitSystemChanged", { detail: system }));
    }
}

/**
 * Register a callback to be notified when unit system changes
 * @param {Function} callback - Function to call when system changes
 */
function onUnitSystemChanged(callback) {
    document.addEventListener("onUnitSystemChanged", callback);
}

/**
 * Unregister a previously registered change callback
 * @param {Function} callback - The same function reference passed to onUnitSystemChanged
 */
function offUnitSystemChanged(callback) {
    document.removeEventListener("onUnitSystemChanged", callback);
}

/**
 * Get the current UnitSystem instance based on user preference
 * @returns {UnitSystem} The active unit system object
 */
function unitSystem() {
    return systems[getUnitSystem()];
}

// Export public API
export {
    systems,
    types,
    toMetric,
    unitSystem,
    getUnitSystem,
    setUnitSystem,
    onUnitSystemChanged,
    offUnitSystemChanged
};
