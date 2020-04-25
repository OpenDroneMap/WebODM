import rasterio as rio
from scipy import ndimage
import  tempfile, subprocess, os
import json
from .pdal import pdal

def rasterize_cloud(point_cloud_path, dem_type, raster_path):
    __verify_point_cloud_was_classified(point_cloud_path)
    with tempfile.NamedTemporaryFile(suffix='.tif') as temp_tif:
        if dem_type == 'dtm':
            pdal.rasterize_dtm(point_cloud_path, temp_tif.name)
        else:
            pdal.rasterize_dsm(point_cloud_path, temp_tif.name)
        __fill(temp_tif.name, raster_path)

def __verify_point_cloud_was_classified(point_cloud_path):
    info = pdal.info(point_cloud_path)
    info = json.loads(info)
    dimensions = info['stats']['statistic']
    classification = [ dimension for dimension in dimensions if dimension['name'] == 'Classification'][0]
    if 2 not in classification['values']:
        raise Exception("One of the tasks' point cloud wasn't classified. Please run again with 'pc-classify'.")

def __fill(fin, fout):
    subprocess.run(['gdal_fillnodata.py', '-q', '-b', '1', '-of', 'GTiff', fin, fin])
    __median_smoothing(fin, fout)

def __median_smoothing(input_path, output_path, smoothing_iterations = 1):
    with rio.open(input_path) as input_raster:
        dtype = input_raster.dtypes[0]
        arr = input_raster.read(1)
        mask = arr == input_raster.nodata

        # Median filter (careful, changing the value 5 might require tweaking)
        # the lines below. There's another numpy function that takes care of
        # these edge cases, but it's slower.
        for i in range(smoothing_iterations):
            arr = ndimage.median_filter(arr, size = 5, output = dtype)

        # Fill corner points with nearest value
        if arr.shape >= (4, 4):
            arr[0][:2] = arr[1][0] = arr[1][1]
            arr[0][-2:] = arr[1][-1] = arr[2][-1]
            arr[-1][:2] = arr[-2][0] = arr[-2][1]
            arr[-1][-2:] = arr[-2][-1] = arr[-2][-2]

        # Median filter leaves a bunch of zeros in nodata areas
        arr[mask == True] = input_raster.nodata

        # write output
        with rio.open(output_path, 'w', **input_raster.profile) as output_raster:
            output_raster.write(arr, 1)
