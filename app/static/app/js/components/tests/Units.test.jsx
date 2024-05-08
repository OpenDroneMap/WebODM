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
        [1000000000, "1,000 km²"]        
    ];

    areas.forEach(a => {
        expect(metric.area(a[0]).toString()).toBe(a[1]);
    });
  })
});