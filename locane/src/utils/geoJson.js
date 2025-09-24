export  function findMinMaxFromGeoJSON(geojsonData, propertyName) {
    // Extract all property values from features
    const values = geojsonData.features.map(feature =>
        feature.properties[propertyName]
    ).filter(value => value !== null && value !== undefined);

    return {
        min: Math.min(...values),
        max: Math.max(...values)
    };
}