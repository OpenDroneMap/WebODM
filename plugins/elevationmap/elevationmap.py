#%module
#% description: This script takes a GeoTIFF file, calculates its heighmap, and outputs it as a GeoJSON
#%end
#%option
#% key: dsm
#% type: string
#% required: yes
#% multiple: no
#% description: The path for the dsm file
#%end
#%option
#% key: intervals
#% type: double
#% required: yes
#% multiple: no
#% description: The intervals used to generate the diferent elevation levels
#%end
#%option
#% key: format
#% type: string
#% required: yes
#% multiple: no
#% description: OGR output format
#%end
#%option
#% key: dtm
#% type: string
#% required: no
#% multiple: no
#% description: The path for the dtm file
#%end
#%option
#% key: epsg
#% type: string
#% required: yes
#% multiple: no
#% description: The epsg code that will be used for output
#%end
#%option
#% key: noise_filter_size
#% type: double
#% required: yes
#% multiple: no
#% description: Area in meters where we will clean up noise in the contours
#%end


import cv2, math, argparse
import numpy as np
import rasterio as rio
from rasterio import warp, transform
from geojson import Feature, FeatureCollection, MultiPolygon, dumps
import subprocess
import os
import glob
import shutil
import sys
import grass.script as grass

def main():
    ext = ""
    if opts['format'] == "GeoJSON":
        ext = "json"
    elif opts['format'] == "GPKG":
        ext = "gpkg"
    elif opts['format'] == "DXF":
        ext = "dxf"
    elif opts['format'] == "ESRI Shapefile":
        ext = "shp"

    # Open dsm
    dsm = rio.open(opts['dsm'])
    # Read the tiff as an numpy masked array
    dsm_array = dsm.read(1, masked = True)
    # Create a kernel based on the parameter 'noise_filter_size' and the tiff resolution
    kernel = get_kernel(float(opts['noise_filter_size']), dsm)
    
    # Check if we want to use the dtm also
    if opts['dtm'] != '':
        # Open the dtm
        dtm = rio.open(opts['dtm'])
        # Assert that the dtm and dsm have the same bounds and resolution
        assert_same_bounds_and_resolution(dsm, dtm)
        # Calculate the different between the dsm and dtm
        array = calculate_difference(dsm_array, dtm)
    else:
        array = dsm_array    
    
    # Calculate the ranges based on the parameter 'intervals' and the elevation array
    ranges = calculate_ranges(opts['intervals'], array)
        
    features = []
    
    for bottom, top in ranges:
        # Binarize the image. Everything in [bottom, top) is white. Everything else is black
        surface_array = np.ma.where((bottom <= array) & (array < top), 255, 0).astype(np.uint8)
        # Apply kernel to reduce noise
        without_noise = cv2.morphologyEx(surface_array, cv2.MORPH_CLOSE, kernel) if kernel is not None else surface_array
        # Find contours
        contours, hierarchy = cv2.findContours(without_noise, cv2.RETR_CCOMP, cv2.CHAIN_APPROX_SIMPLE)
        # Check if we found something
        if len(contours) > 0:
            # Transform contours from pixels to coordinates
            mapped_contours = [map_pixels_to_coordinates(dsm, opts['epsg'], to_pixel_format(contour)) for contour in contours]
            # Build the MultiPolygon for based on the contours and their hierarchy
            built_multi_polygon = LevelBuilder(bottom, top, mapped_contours, hierarchy[0]).build_multi_polygon()
            features.append(built_multi_polygon)
    
    # Write the GeoJSON to a file
    dump = dumps(FeatureCollection(features))
    with open("output.json", 'w+') as output:
        output.write(dump)

    if ext != "json":
        subprocess.check_call(["ogr2ogr", "-f", opts['format'], "output.%s" % ext, "output.json"], stdout=subprocess.DEVNULL)

    if os.path.isfile("output.%s" % ext):
        if opts['format'] == "ESRI Shapefile":
            ext="zip"
            os.makedirs("contours")
            contour_files = glob.glob("output.*")
            for cf in contour_files:
                shutil.move(cf, os.path.join("contours", os.path.basename(cf)))

            shutil.make_archive('output', 'zip', 'contours/')

        print(os.path.join(os.getcwd(), "output.%s" % ext))
    else:
        print("error")

def get_kernel(noise_filter_size, dsm):
    """Generate a kernel for noise filtering. Will return none if the noise_filter_size isn't positive"""
    if noise_filter_size <= 0:
        return None
    if dsm.crs.linear_units != 'metre':
        noise_filter_size *= 3.2808333333465 # Convert meter to feets
    return cv2.getStructuringElement(cv2.MORPH_ELLIPSE, (round(noise_filter_size / dsm.res[0]), round(noise_filter_size / dsm.res[1])))    

def assert_same_bounds_and_resolution(dsm, dtm):
    if dtm.bounds != dsm.bounds or dtm.res != dsm.res:
        raise Exception("DTM and DSM have differenct bounds or resolution.")

def calculate_difference(dsm_array, dtm):
    """Calculate the difference between the dsm and dtm"""
    dtm_array = dtm.read(1, masked = True)
    difference = dsm_array - dtm_array
    difference.data[difference < 0] = 0 # We set to 0 anything that might have been negative
    return difference

def calculate_ranges(interval_text, array):
    """Calculate the ranges based on the provided 'interval_text'"""
    if is_number(interval_text):
        # If it is a number, then consider it the step
        min_elevation = math.floor(np.amin(array))
        max_elevation = math.ceil(np.amax(array))
        interval = float(interval_text)
        return [(bottom, bottom + interval) for bottom in np.arange(min_elevation, max_elevation, interval)]
    else:
        # If it is not a number, then we consider the text the intervals. We are going to validate them
        ranges = [validate_and_convert_to_range(range) for range in interval_text.split(',')]
        if len(ranges) == 0:
            raise Exception('Please add a range.')
        elif len(ranges) > 1:
            ranges.sort()
            for i in range(len(ranges) - 1):
                if ranges[i][1] > ranges[i + 1][0]:
                    raise Exception('Please make sure that the ranges don\'t overlap.')        
        return ranges  

def to_pixel_format(contour):
    """OpenCV contours have a weird format. We are converting them to (row, col)"""
    return [(pixel[0][1], pixel[0][0]) for pixel in contour]   

def map_pixels_to_coordinates(reference_tiff, dst_epsg, pixels):
    """We are assuming that the pixels are a list of tuples. For example: [(row1, col1), (row2, col2)]"""
    rows = [row for (row, _) in pixels]
    cols = [col for (_, col) in pixels]
    xs, ys = transform.xy(reference_tiff.transform, rows, cols)
    dst_crs = rio.crs.CRS.from_epsg(dst_epsg)
    return map_to_new_crs(reference_tiff.crs, dst_crs, xs, ys)
    
def map_to_new_crs(src_crs, target_crs, xs, ys):
    """Map the given arrays from one crs to the other"""
    transformed = warp.transform(src_crs, target_crs, xs, ys)
    return [(x, y) for x, y in zip(transformed[0], transformed[1])]  

def is_number(text):
    try:
        float(text)
        return True
    except ValueError:
        return False
    
def validate_and_convert_to_range(range):
    """Validate the given range and return a tuple (start, end) if it is valid"""
    range = range.strip().split('-')
    if len(range) != 2:
        raise Exception('Ranges must have a beggining and an end.')
    if not is_number(range[0]) or not is_number(range[1]):
        raise Exception('Please make sure that both the beggining and end of the range are numeric.')
    range = (float(range[0]), float(range[1]))    
    if (range[0] >= range[1]):
        raise Exception('The end of the range must be greater than the beggining.')
    return range             

class LevelBuilder:
    def __init__(self, bottom, top, contours, hierarchy):
        self.bottom = bottom
        self.top = top
        self.contours = contours
        self.hierarchy = hierarchy

    def build_polygon(self, idx):
        polygon_contours = [self.contours[idx]]
        [_, _, child, _] = self.hierarchy[idx]
        while child >= 0:
            polygon_contours.append(self.contours[child])
            next, _, _, _ = self.hierarchy[child]
            child = next
        return polygon_contours

    def build_multi_polygon(self):
        polygons = []
        idx = 0
        while idx >= 0:
            polygons.append(self.build_polygon(idx))
            [next, _, _, _] = self.hierarchy[idx]
            idx = next
        multi_polygon = MultiPolygon(polygons)
        return Feature(geometry = multi_polygon, properties = { 'bottom': int(self.bottom), 'top': int(self.top) })  


if __name__ == "__main__":
    opts, _ = grass.parser()
    sys.exit(main())
