import json
from osgeo import osr 


def spatialref(epsg_code):
    spatialref = osr.SpatialReference()
    spatialref.ImportFromEPSG(epsg_code)
    return spatialref

def spatialrefWQT(dataset):
    spatialref = osr.SpatialReference()
    spatialref.ImportFromWkt(dataset.GetProjectionRef())
    return spatialref

def reprojson(geojson, dataset):

    crsin= spatialref(4326)
    crsout = spatialrefWQT(dataset)

    coordinate_transformation = osr.CoordinateTransformation(crsin, crsout)

     # Define dictionary representation of output feature collection
    fc_out = {"geometry":{"type":"Polygon","coordinates":[]}}

    # Iterate through each feature of the feature collection
    new_coords = []
        # Project/transform coordinate pairs of each ring
        # (iteration required in case geometry type is MultiPolygon, or there are holes)
    for ring in geojson['geometry']['coordinates']:
        coords=[(entry[0],entry[1]) for entry in ring]
        for i in range(len(coords)):
            x2, y2, z= coordinate_transformation.TransformPoint(coords[i][0], coords[i][1])
            new_coords.append([x2, y2])
    fc_out['geometry']['coordinates'] = [new_coords]
    return fc_out
