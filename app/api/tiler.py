import rasterio
from rasterio.enums import ColorInterp
import urllib
import os
from django.http import HttpResponse
from rio_tiler.errors import TileOutsideBounds
from rio_tiler.mercator import get_zooms
from rio_tiler import main
from rio_tiler.utils import array_to_image, get_colormap, expression, linear_rescale, _chunks, _apply_discrete_colormap, has_alpha_band, \
    non_alpha_indexes
from rio_tiler.profiles import img_profiles

import numpy as np

from app.raster_utils import export_raster_index
from .hsvblend import hsv_blend
from .hillshade import LightSource
from .formulas import lookup_formula, get_algorithm_list
from .tasks import TaskNestedView
from rest_framework import exceptions
from rest_framework.response import Response
from worker.tasks import export_raster_index

ZOOM_EXTRA_LEVELS = 2

def get_zoom_safe(src_dst):
    minzoom, maxzoom = get_zooms(src_dst)
    if maxzoom < minzoom:
        maxzoom = minzoom

    return minzoom, maxzoom

def get_tile_url(task, tile_type, query_params):
    url = '/api/projects/{}/tasks/{}/{}/tiles/{{z}}/{{x}}/{{y}}.png'.format(task.project.id, task.id, tile_type)
    params = {}

    for k in ['formula', 'bands', 'rescale', 'color_map', 'hillshade']:
        if query_params.get(k):
            params[k] = query_params.get(k)

    if len(params) > 0:
        url = url + '?' + urllib.parse.urlencode(params)

    return url

def get_extent(task, tile_type):
    extent_map = {
        'orthophoto': task.orthophoto_extent,
        'dsm': task.dsm_extent,
        'dtm': task.dtm_extent,
    }

    if not tile_type in extent_map:
        raise exceptions.NotFound()

    extent = extent_map[tile_type]

    if extent is None:
        raise exceptions.NotFound()

    return extent

def get_raster_path(task, tile_type):
    return task.get_asset_download_path(tile_type + ".tif")


def rescale_tile(tile, mask, rescale = None):
    if rescale:
        try:
            rescale_arr = list(map(float, rescale.split(",")))
        except ValueError:
            raise exceptions.ValidationError("Invalid rescale value")

        rescale_arr = list(_chunks(rescale_arr, 2))
        if len(rescale_arr) != tile.shape[0]:
            rescale_arr = ((rescale_arr[0]),) * tile.shape[0]

        for bdx in range(tile.shape[0]):
            if mask is not None:
                tile[bdx] = np.where(
                    mask,
                    linear_rescale(
                        tile[bdx], in_range=rescale_arr[bdx], out_range=[0, 255]
                    ),
                    0,
                )
            else:
                tile[bdx] = linear_rescale(
                    tile[bdx], in_range=rescale_arr[bdx], out_range=[0, 255]
                )
        tile = tile.astype(np.uint8)

    return tile, mask


def apply_colormap(tile, color_map = None):
    if color_map is not None and isinstance(color_map, dict):
        tile = _apply_discrete_colormap(tile, color_map)
    elif color_map is not None:
        tile = np.transpose(color_map[tile][0], [2, 0, 1]).astype(np.uint8)

    return tile

class TileJson(TaskNestedView):
    def get(self, request, pk=None, project_pk=None, tile_type=""):
        """
        Get tile.json for this tasks's asset type
        """
        task = self.get_and_check_task(request, pk)

        raster_path = get_raster_path(task, tile_type)
        if not os.path.isfile(raster_path):
            raise exceptions.NotFound()

        with rasterio.open(raster_path) as src_dst:
            minzoom, maxzoom = get_zoom_safe(src_dst)

        return Response({
            'tilejson': '2.1.0',
            'name': task.name,
            'version': '1.0.0',
            'scheme': 'xyz',
            'tiles': [get_tile_url(task, tile_type, self.request.query_params)],
            'minzoom': minzoom - ZOOM_EXTRA_LEVELS,
            'maxzoom': maxzoom + ZOOM_EXTRA_LEVELS,
            'bounds': get_extent(task, tile_type).extent
        })

class Bounds(TaskNestedView):
    def get(self, request, pk=None, project_pk=None, tile_type=""):
        """
        Get the bounds for this tasks's asset type
        """
        task = self.get_and_check_task(request, pk)

        return Response({
            'url': get_tile_url(task, tile_type, self.request.query_params),
            'bounds': get_extent(task, tile_type).extent
        })

class Metadata(TaskNestedView):
    def get(self, request, pk=None, project_pk=None, tile_type=""):
        """
        Get the metadata for this tasks's asset type
        """
        task = self.get_and_check_task(request, pk)

        formula = self.request.query_params.get('formula')
        bands = self.request.query_params.get('bands')

        if formula == '': formula = None
        if bands == '': bands = None

        try:
            expr, hrange = lookup_formula(formula, bands)
        except ValueError as e:
            raise exceptions.ValidationError(str(e))

        pmin, pmax = 2.0, 98.0
        raster_path = get_raster_path(task, tile_type)

        if not os.path.isfile(raster_path):
            raise exceptions.NotFound()

        try:
            with rasterio.open(raster_path, "r") as src:
                band_count = src.meta['count']
                if has_alpha_band(src):
                    band_count -= 1

                nodata = None
                # Workaround for https://github.com/OpenDroneMap/WebODM/issues/894
                if tile_type == 'orthophoto':
                    nodata = 0

                info = main.metadata(src, pmin=pmin, pmax=pmax, histogram_bins=255, histogram_range=hrange, expr=expr, nodata=nodata)
        except IndexError as e:
            # Caught when trying to get an invalid raster metadata
            raise exceptions.ValidationError("Cannot retrieve raster metadata: %s" % str(e))

        # Override min/max
        if hrange:
            for b in info['statistics']:
                info['statistics'][b]['min'] = hrange[0]
                info['statistics'][b]['max'] = hrange[1]

        cmap_labels = {
            "jet": "Jet",
            "terrain": "Terrain",
            "gist_earth": "Earth",
            "rdylgn": "RdYlGn",
            "rdylgn_r": "RdYlGn (Reverse)",
            "spectral": "Spectral",
            "spectral_r": "Spectral (Reverse)",
            "pastel1": "Pastel",
        }

        colormaps = []
        algorithms = []
        if tile_type in ['dsm', 'dtm']:
            colormaps = ['jet', 'terrain', 'gist_earth', 'pastel1']
        elif formula and bands:
            colormaps = ['rdylgn', 'spectral', 'rdylgn_r', 'spectral_r']
            algorithms = *get_algorithm_list(band_count),

        info['color_maps'] = []
        info['algorithms'] = algorithms

        if colormaps:
            for cmap in colormaps:
                try:
                    info['color_maps'].append({
                        'key': cmap,
                        'color_map': get_colormap(cmap, format="gdal"),
                        'label': cmap_labels.get(cmap, cmap)
                    })
                except FileNotFoundError:
                    raise exceptions.ValidationError("Not a valid color_map value: %s" % cmap)

        del info['address']
        info['name'] = task.name
        info['scheme'] = 'xyz'
        info['tiles'] = [get_tile_url(task, tile_type, self.request.query_params)]

        if info['maxzoom'] < info['minzoom']:
            info['maxzoom'] = info['minzoom']
        info['maxzoom'] += ZOOM_EXTRA_LEVELS
        info['minzoom'] -= ZOOM_EXTRA_LEVELS

        return Response(info)

def get_elevation_tiles(elevation, url, x, y, z, tilesize, nodata, resampling, padding):
    tile = np.full((tilesize * 3, tilesize * 3), nodata, dtype=elevation.dtype)

    try:
        left, _ = main.tile(url, x - 1, y, z, indexes=1, tilesize=tilesize, nodata=nodata,
                            resampling_method=resampling, tile_edge_padding=padding)
        tile[tilesize:tilesize*2,0:tilesize] = left
    except TileOutsideBounds:
        pass

    try:
        right, _ = main.tile(url, x + 1, y, z, indexes=1, tilesize=tilesize, nodata=nodata,
                             resampling_method=resampling, tile_edge_padding=padding)
        tile[tilesize:tilesize*2,tilesize*2:tilesize*3] = right
    except TileOutsideBounds:
        pass

    try:
        bottom, _ = main.tile(url, x, y + 1, z, indexes=1, tilesize=tilesize, nodata=nodata,
                              resampling_method=resampling, tile_edge_padding=padding)
        tile[tilesize*2:tilesize*3,tilesize:tilesize*2] = bottom
    except TileOutsideBounds:
        pass

    try:
        top, _ = main.tile(url, x, y - 1, z, indexes=1, tilesize=tilesize, nodata=nodata,
                           resampling_method=resampling, tile_edge_padding=padding)
        tile[0:tilesize,tilesize:tilesize*2] = top
    except TileOutsideBounds:
        pass

    tile[tilesize:tilesize*2,tilesize:tilesize*2] = elevation

    return tile


class Tiles(TaskNestedView):
    def get(self, request, pk=None, project_pk=None, tile_type="", z="", x="", y="", scale=1):
        """
        Get a tile image
        """
        task = self.get_and_check_task(request, pk)

        z = int(z)
        x = int(x)
        y = int(y)

        scale = int(scale)
        ext = "png"
        driver = "jpeg" if ext == "jpg" else ext

        indexes = None
        nodata = None

        formula = self.request.query_params.get('formula')
        bands = self.request.query_params.get('bands')
        rescale = self.request.query_params.get('rescale')
        color_map = self.request.query_params.get('color_map')
        hillshade = self.request.query_params.get('hillshade')

        if formula == '': formula = None
        if bands == '': bands = None
        if rescale == '': rescale = None
        if color_map == '': color_map = None
        if hillshade == '' or hillshade == '0': hillshade = None

        try:
            expr, _ = lookup_formula(formula, bands)
        except ValueError as e:
            raise exceptions.ValidationError(str(e))

        if tile_type in ['dsm', 'dtm'] and rescale is None:
            rescale = "0,1000"

        if tile_type in ['dsm', 'dtm'] and color_map is None:
            color_map = "gray"

        if tile_type == 'orthophoto' and formula is not None:
            if color_map is None:
                color_map = "gray"
            if rescale is None:
                rescale = "-1,1"

        if nodata is not None:
            nodata = np.nan if nodata == "nan" else float(nodata)
        tilesize = scale * 256

        url = get_raster_path(task, tile_type)

        if not os.path.isfile(url):
            raise exceptions.NotFound()

        with rasterio.open(url) as src:
            minzoom, maxzoom = get_zoom_safe(src)
            has_alpha = has_alpha_band(src)
            if z < minzoom - ZOOM_EXTRA_LEVELS or z > maxzoom + ZOOM_EXTRA_LEVELS:
                raise exceptions.NotFound()

            # Handle N-bands datasets for orthophotos (not plant health)
            if tile_type == 'orthophoto' and expr is None:
                ci = src.colorinterp

                # More than 4 bands?
                if len(ci) > 4:
                    # Try to find RGBA band order
                    if ColorInterp.red in ci and \
                        ColorInterp.green in ci and \
                        ColorInterp.blue in ci:
                        indexes = (ci.index(ColorInterp.red) + 1,
                                   ci.index(ColorInterp.green) + 1,
                                   ci.index(ColorInterp.blue) + 1,)
                    else:
                        # Fallback to first three
                        indexes = (1, 2, 3, )
                elif has_alpha:
                    indexes = non_alpha_indexes(src)
            
            # Workaround for https://github.com/OpenDroneMap/WebODM/issues/894
            if nodata is None and tile_type =='orthophoto':
                nodata = 0

        resampling="nearest"
        padding=0
        if tile_type in ["dsm", "dtm"]:
            resampling="bilinear"
            padding=16

        try:
            if expr is not None:
                tile, mask = expression(
                    url, x, y, z, expr=expr, tilesize=tilesize, nodata=nodata, tile_edge_padding=padding, resampling_method=resampling
                )
            else:
                tile, mask = main.tile(
                    url, x, y, z, indexes=indexes, tilesize=tilesize, nodata=nodata, tile_edge_padding=padding, resampling_method=resampling
                )
        except TileOutsideBounds:
            raise exceptions.NotFound("Outside of bounds")

        if color_map:
            try:
                color_map = get_colormap(color_map, format="gdal")
            except FileNotFoundError:
                raise exceptions.ValidationError("Not a valid color_map value")

        intensity = None

        if hillshade is not None:
            try:
                hillshade = float(hillshade)
                if hillshade <= 0:
                    hillshade = 1.0
            except ValueError:
                raise exceptions.ValidationError("Invalid hillshade value")

            if tile.shape[0] != 1:
                raise exceptions.ValidationError("Cannot compute hillshade of non-elevation raster (multiple bands found)")

            delta_scale = (maxzoom + ZOOM_EXTRA_LEVELS + 1 - z) * 4
            dx = src.meta["transform"][0] * delta_scale
            dy = -src.meta["transform"][4] * delta_scale

            ls = LightSource(azdeg=315, altdeg=45)

            # Hillshading is not a local tile operation and
            # requires neighbor tiles to be rendered seamlessly
            elevation = get_elevation_tiles(tile[0], url, x, y, z, tilesize, nodata, resampling, padding)
            intensity = ls.hillshade(elevation, dx=dx, dy=dy, vert_exag=hillshade)
            intensity = intensity[tilesize:tilesize*2,tilesize:tilesize*2]


        rgb, rmask = rescale_tile(tile, mask, rescale=rescale)
        rgb = apply_colormap(rgb, color_map)

        if intensity is not None:
            # Quick check
            if rgb.shape[0] != 3:
                raise exceptions.ValidationError("Cannot process tile: intensity image provided, but no RGB data was computed.")

            intensity = intensity * 255.0
            rgb = hsv_blend(rgb, intensity)

        options = img_profiles.get(driver, {})
        return HttpResponse(
            array_to_image(rgb, rmask, img_format=driver, **options),
            content_type="image/{}".format(ext)
        )

class Export(TaskNestedView):
    def post(self, request, pk=None, project_pk=None):
        """
        Export an orthophoto after applying a formula
        """
        task = self.get_and_check_task(request, pk)

        formula = request.data.get('formula')
        bands = request.data.get('bands')
        # rescale = request.data.get('rescale')

        if formula == '': formula = None
        if bands == '': bands = None
        # if rescale == '': rescale = None

        if not formula:
            raise exceptions.ValidationError("You need to specify a formula parameter")

        if not bands:
            raise exceptions.ValidationError("You need to specify a bands parameter")

        try:
            expr, _ = lookup_formula(formula, bands)
        except ValueError as e:
            raise exceptions.ValidationError(str(e))

        # if formula is not None and rescale is None:
        #     rescale = "-1,1"

        url = get_raster_path(task, "orthophoto")

        if not os.path.isfile(url):
            raise exceptions.NotFound()

        celery_task_id = export_raster_index.delay(url, expr).task_id
        return Response({'celery_task_id': celery_task_id})