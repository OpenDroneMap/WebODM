import { systems, toMetric } from '../../classes/Units';

describe('Metric system', () => {
  it('it should display units properly', () => {

    const { metric } = systems;

    const lengths = [
        [1, "1 m"],
        [0.01, "1 cm"],
        [0.0154, "1.5 cm"],
        [0.99, "99 cm"],
        [0.995555, "99.6 cm"],
        [1.01, "1.01 m"],
        [999, "999 m"],
        [1000, "1 km"],
        [1001, "1.001 km"],
        [1000010, "1,000.01 km"],
        [1000012.349, "1,000.01235 km"],
    ];
    
    lengths.forEach(l => {
        expect(metric.length(l[0]).toString()).toBe(l[1]);
    });

    const areas = [
        [1, "1 m²"],
        [9999, "9,999 m²"],
        [10000, "1 ha"],
        [11005, "1.1005 ha"],
        [11005, "1.1005 ha"],
        [999999, "99.9999 ha"],
        [1000000, "1 km²"],
        [1000000000, "1,000 km²"],
        [1000255558, "1,000.25556 km²"]   
    ];

    areas.forEach(a => {
        expect(metric.area(a[0]).toString()).toBe(a[1]);
    });

    const volumes = [
      [1, "1 m³"],
      [9000, "9,000 m³"],
      [9000.25559, "9,000.2556 m³"],
    ];

    volumes.forEach(v => {
      expect(metric.volume(v[0]).toString()).toBe(v[1]);
    });

    expect(metric.area(11005.09, { fixedUnit: true }).toString({precision: 1})).toBe("11,005.1 m²");

    const temperatures = [
      [1, "1 °C"],
      [100.255, "100.3 °C"]
    ];

    temperatures.forEach(v => {
      expect(metric.temperature(v[0]).toString()).toBe(v[1]);
    });
  })
});

describe('Imperial systems', () => {
  it('it should display units properly', () => {

    const { imperial, imperialUS } = systems;

    const lengths = [
        [1, "3.2808 ft", "3.2808 ft (US)"],
        [0.01, "0.0328 ft", "0.0328 ft (US)"],
        [0.0154, "0.0505 ft", "0.0505 ft (US)"],
        [1609, "5,278.8714 ft", "5,278.8608 ft (US)"],
        [1609.344, "1 mi", "5,279.9894 ft (US)"],
        [1609.3472187, "1 mi", "1 mi (US)"],
        [3218.69, "2 mi", "2 mi (US)"]
    ];
    
    lengths.forEach(l => {
      expect(imperial.length(l[0]).toString()).toBe(l[1]);
      expect(imperialUS.length(l[0]).toString()).toBe(l[2]);
    });

    const areas = [
        [1, "10.76 ft²", "10.76 ft² (US)"],
        [9999, "2.47081 ac", "2.4708 ac (US)"],
        [4046.86, "1 ac", "43,559.86 ft² (US)"],
        [4046.87261, "1 ac", "1 ac (US)"],
        [2587398.1, "639.35999 ac", "639.35744 ac (US)"],
        [2.59e+6, "1 mi²", "1 mi² (US)"]
    ];

    areas.forEach(a => {
      expect(imperial.area(a[0]).toString()).toBe(a[1]);
      expect(imperialUS.area(a[0]).toString()).toBe(a[2]);
    });

    const volumes = [
      [1, "1.308 yd³", "1.3079 yd³ (US)"],
      [1000, "1,307.9506 yd³", "1,307.9428 yd³ (US)"]
    ];

    volumes.forEach(v => {
      expect(imperial.volume(v[0]).toString()).toBe(v[1]);
      expect(imperialUS.volume(v[0]).toString()).toBe(v[2]);
    });

    expect(imperial.area(9999, { fixedUnit: true }).toString({precision: 1})).toBe("107,628.3 ft²");

    const temperatures = [
      [1, "33.8 °F"],
      [100.255, "212.5 °F"]
    ];

    temperatures.forEach(v => {
      expect(imperial.temperature(v[0]).toString()).toBe(v[1]);
    });
  });
});

describe('Metric conversion', () => {
  it('it should convert units properly', () => {
    const { metric, imperial } = systems;

    const km = metric.length(2000);
    const mi = imperial.length(3220);

    expect(km.unit.abbr).toBe("km");
    expect(km.value).toBe(2);
    expect(mi.unit.abbr).toBe("mi");
    expect(Math.round(mi.value)).toBe(2)

    expect(toMetric(km).toString()).toBe("2,000 m");
    expect(toMetric(mi).toString()).toBe("3,220 m");

    expect(toMetric(km).value).toBe(2000);
    expect(toMetric(mi).value).toBe(3220);

    const celsius = metric.temperature(50);
    const fahrenheit = imperial.temperature(50);

    expect(celsius.unit.abbr).toBe("°C");
    expect(fahrenheit.unit.abbr).toBe("°F");
    expect(toMetric(celsius).value).toBe(50);
    expect(toMetric(fahrenheit).value).toBe(50);
  });
});
