from rasterio.io import MemoryFile
from rasterio.transform import from_origin
from rasterio.warp import aligned_target, reproject
import rasterio as rio
import numpy as np

def align(reference, other, *more_others, **kwargs):
    others = [other] + list(more_others)
    assert_same_crs(reference, others)
    reference, others = build_complex_rasters(reference, others)
    match_pixel_size(reference, others, kwargs)
    intersect_rasters(reference, others)
    return [reference.raster] + [other.raster for other in others]

def align_altitudes(reference, other, *more_others):
    others = [other] + list(more_others)
    reference, others = build_complex_rasters(reference, others)

    reference.align_altitude_to_zero()
    for other in others:
        other.align_altitude_to_zero()

    return [reference.raster] + [other.raster for other in others]

def assert_same_crs(reference, others):
    for other in others:
        assert reference.crs == other.crs, "All rasters should have the same CRS."

def build_complex_rasters(reference, others):
    """Build Raster objects from the rasterio rasters"""
    return Raster(reference), [Raster(other) for other in others]

def match_pixel_size(reference, others, kwargs):
    """Take two or more rasters and modify them so that they have the same pixel size"""
    rasters = [reference] + others
    max_xres = max([raster.xres for raster in rasters])
    max_yres = max([raster.yres for raster in rasters])

    if 'resolution' in kwargs:
        max_xres = max(max_xres, kwargs['resolution'])
        max_yres = max(max_yres, kwargs['resolution'])

    reference.match_pixel_size(max_xres, max_yres)
    for other in others:
        other.match_pixel_size(max_xres, max_yres)

def intersect_rasters(reference, others):
    """Take two or more rasters with the same size per pixel, and calculate the areas where they intersect, based on their position. Then, we keep only those areas, discarding the other pixels."""
    final_bounds = reference.get_bounds()

    for other in others:
        final_bounds = final_bounds.intersection(other.get_bounds())

    reference.reduce_to_bounds(final_bounds)
    for other in others:
        other.reduce_to_bounds(final_bounds)


class Raster:
    def __init__(self, raster):
        self.raster = raster
        self.xres, self.yres = raster.res

    def get_bounds(self):
        (left, bottom, right, top) = self.raster.bounds
        return Bounds(left, bottom, right, top)

    def get_window(self):
        print(self.raster.bounds)
        (left, bottom, right, top) = self.raster.bounds
        return self.raster.window(left, bottom, right, top)

    def match_pixel_size(self, xres, yres):
        dst_transform, dst_width, dst_height = aligned_target(self.raster.transform, self.raster.width, self.raster.height, (xres, yres))
        with MemoryFile() as mem_file:
            aligned = mem_file.open(driver = 'GTiff', height = dst_height, width = dst_width, count = self.raster.count, dtype = self.raster.dtypes[0], crs = self.raster.crs, transform = dst_transform, nodata = self.raster.nodata)
            for band in range(1, self.raster.count + 1):
                reproject(rio.band(self.raster, band), rio.band(aligned, band))
            self.raster = aligned

    def reduce_to_bounds(self, bounds):
        """Take some bounds and remove the pixels outside of it"""
        (left, bottom, right, top) = bounds.as_tuple()
        window = self.raster.window(left, bottom, right, top)
        with MemoryFile() as mem_file:
            raster = mem_file.open(driver = 'GTiff', height = window.height, width = window.width, count = self.raster.count, dtype = self.raster.dtypes[0], crs = self.raster.crs, transform = self.raster.window_transform(window), nodata = self.raster.nodata)
            for band in range(1, self.raster.count + 1):
                band_array = self.raster.read(band, window = window)
                raster.write(band_array, band)
            self.raster = raster

    def align_altitude_to_zero(self):
        with MemoryFile() as mem_file:
            raster = mem_file.open(driver = 'GTiff', height = self.raster.height, width = self.raster.width, count = self.raster.count, dtype = self.raster.dtypes[0], crs = self.raster.crs, transform = self.raster.transform, nodata = self.raster.nodata)
            for band in range(1, self.raster.count + 1):
                band_array = self.raster.read(band, masked = True)
                min = band_array.min()
                aligned = band_array - min
                raster.write(aligned, band)
            self.raster = raster

class Bounds:
    def __init__(self, left, bottom, right, top):
        self.left = left
        self.bottom = bottom
        self.right = right
        self.top = top

    def intersection(self, other_bounds):
        max_left = max(self.left, other_bounds.left)
        max_bottom = max(self.bottom, other_bounds.bottom)
        min_right = min(self.right, other_bounds.right)
        min_top = min(self.top, other_bounds.top)
        return Bounds(max_left, max_bottom, min_right, min_top)

    def as_tuple(self):
        return (self.left, self.bottom, self.right, self.top)
