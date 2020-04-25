import rasterio as rio
from rasterio import warp, transform
import numpy as np
import cv2
import json
from geojson import Feature, FeatureCollection, dumps, Polygon
from rasteralign import align, align_altitudes

KERNEL_10_10 = cv2.getStructuringElement(cv2.MORPH_ELLIPSE, (10, 10))
KERNEL_20_20 = cv2.getStructuringElement(cv2.MORPH_ELLIPSE, (20, 20))

def compare(reference_dsm_path, reference_dtm_path, compare_dsm_path, compare_dtm_path, epsg, resolution, display_type, min_height, min_area):
    # Read DEMs and align them
    with rio.open(reference_dsm_path) as reference_dsm, \
         rio.open(reference_dtm_path) as reference_dtm, \
         rio.open(compare_dsm_path) as compare_dsm, \
         rio.open(compare_dtm_path) as compare_dtm:
        reference_dsm, reference_dtm, compare_dsm, compare_dtm = align(reference_dsm, reference_dtm, compare_dsm, compare_dtm, resolution=resolution)
        reference_dsm, reference_dtm, compare_dsm, compare_dtm = align_altitudes(reference_dsm, reference_dtm, compare_dsm, compare_dtm)

    # Get arrays from DEMs
    reference_dsm_array = reference_dsm.read(1, masked=True)
    reference_dtm_array = reference_dtm.read(1, masked=True)
    compare_dsm_array = compare_dsm.read(1, masked=True)
    compare_dtm_array = compare_dtm.read(1, masked=True)

    # Calculate CHMs
    chm_reference = reference_dsm_array - reference_dtm_array
    chm_compare = compare_dsm_array - compare_dtm_array

    # Calculate diff between CHMs
    diff = chm_reference - chm_compare

    # Add to the mask everything below the min height
    diff.mask = np.ma.mask_or(diff.mask, diff < min_height)

    # Copy the diff, and set everything on the mask to 0
    process = np.copy(diff)
    process[diff.mask] = 0

    # Apply open filter to filter out noise
    process = cv2.morphologyEx(process, cv2.MORPH_OPEN, KERNEL_10_10)

    # Apply close filter to fill little areas
    process = cv2.morphologyEx(process, cv2.MORPH_CLOSE, KERNEL_20_20)

    # Transform to uint8
    process = process.astype(np.uint8)

    if display_type == 'contours':
        return calculate_contours(process, reference_dsm, epsg, min_height, min_area)
    else:
        return calculate_heatmap(process, diff.mask, reference_dsm, epsg, min_height)

def calculate_contours(diff, reference_dem, epsg, min_height, min_area):
     # Calculate contours
    contours, _ = cv2.findContours(diff, cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_SIMPLE)

    # Convert contours into features
    features = [map_contour_to_geojson_feature(contour, diff, epsg, reference_dem, min_height) for contour in contours]

    # Keep features that meet the threshold
    features = [feature for feature in features if feature.properties['area'] >= min_area]

    # Write the GeoJSON to a string
    return dumps(FeatureCollection(features))

def map_contour_to_geojson_feature(contour, diff_array, epsg, reference_dem, min_height):
    # Calculate how much area is inside a pixel
    pixel_area = reference_dem.res[0] * reference_dem.res[1]

    # Calculate the area of the contour
    area = cv2.contourArea(contour) * pixel_area

    # Calculate the indices of the values inside the contour
    cimg = np.zeros_like(diff_array)
    cv2.drawContours(cimg, [contour], 0, color=255, thickness=-1)
    indices = cimg == 255

    # Calculate values inside the contour
    values = diff_array[indices]
    masked_values = np.ma.masked_array(values, values < min_height)

    # Calculate properties regarding the difference values
    avg = float(masked_values.mean())
    min = float(masked_values.min())
    max = float(masked_values.max())
    std = float(masked_values.std())

    # Map the contour to pixels
    pixels = to_pixel_format(contour)

    rows = [row for (row, _) in pixels]
    cols = [col for (_, col) in pixels]

    # Map from pixels to coordinates
    xs, ys = map_pixels_to_coordinates(reference_dem, epsg, rows, cols)
    coords = [(x, y) for x, y in zip(xs, ys)]

    # Build polygon, based on the contour
    polygon = Polygon([coords])

    # Build the feature
    feature = Feature(geometry = polygon, properties = { 'area': area, 'avg': avg, 'min': min, 'max': max, 'std': std })

    return feature


def calculate_heatmap(diff, mask, dem, epsg, min_height):
    # Calculate the pixels of valid values
    pixels = np.argwhere(~mask)
    xs = pixels[:, 0]
    ys = pixels[:, 1]

    # Map pixels to coordinates
    coords_xs, coords_ys = map_pixels_to_coordinates(dem, epsg, xs, ys)

    # Calculate the actual values
    values = diff[~mask]

    # Substract the min, so all values are between 0 and max
    values = values - np.min(values)

    array = np.column_stack((coords_ys, coords_xs, values))
    return json.dumps({ 'values': array.tolist(), 'max': float(max(values)) })


def map_pixels_to_coordinates(reference_tiff, dst_epsg, rows, cols):
    xs, ys = transform.xy(reference_tiff.transform, rows, cols)
    dst_crs = rio.crs.CRS.from_epsg(dst_epsg)
    return map_to_new_crs(reference_tiff.crs, dst_crs, xs, ys)

def map_to_new_crs(src_crs, target_crs, xs, ys):
    """Map the given arrays from one crs to the other"""
    return warp.transform(src_crs, target_crs, xs, ys)

def to_pixel_format(contour):
    """OpenCV contours have a weird format. We are converting them to (row, col)"""
    return [(pixel[0][1], pixel[0][0]) for pixel in contour]
