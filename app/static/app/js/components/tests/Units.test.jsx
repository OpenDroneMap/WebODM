import { systems } from '../../classes/Units';

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
  })
});

describe('Imperial system', () => {
  it('it should display units properly', () => {

    const { imperial } = systems;

    const lengths = [
        [1, "3.2808 ft"],
        [0.01, "0.0328 ft"],
        [0.0154, "0.0505 ft"],
        [1609, "5,278.8716 ft"],
        [1609.344, "1 mi"],
        [3218.69, "2 mi"]
    ];
    
    lengths.forEach(l => {
        expect(imperial.length(l[0]).toString()).toBe(l[1]);
    });

    const areas = [
        [1, "10.76 ft²"],
        [9999, "2.47081 ac"],
        [4046.86, "1 ac"],
        [2587398.1, "639.35999 ac"],
        [2.59e+6, "1 mi²"]
    ];

    areas.forEach(a => {
        expect(imperial.area(a[0]).toString()).toBe(a[1]);
    });
  })
});