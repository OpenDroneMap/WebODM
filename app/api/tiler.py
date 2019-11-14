import rasterio
import urllib
from django.http import HttpResponse
from rasterio import MemoryFile
from rio_tiler.errors import TileOutsideBounds
from rio_tiler.mercator import get_zooms
from rio_tiler import main
from rio_tiler.utils import array_to_image, get_colormap, expression, linear_rescale, _chunks
from rio_color.operations import parse_operations
from rio_color.utils import scale_dtype, to_math_type
from rio_tiler.profiles import img_profiles

import numpy
import mercantile

from .tasks import TaskNestedView
from rest_framework import exceptions
from rest_framework.response import Response


def get_tile_url(task, tile_type, query_params):
    url = '/api/projects/{}/tasks/{}/{}/tiles/{{z}}/{{x}}/{{y}}.png'.format(task.project.id, task.id, tile_type)
    params = {}

    for k in ['expr', 'rescale', 'color_map']:
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
        raise exceptions.ValidationError("Type {} is not a valid tile type".format(tile_type))

    extent = extent_map[tile_type]

    if extent is None:
        raise exceptions.ValidationError(
            "A {} has not been processed for this task. Tiles are not available.".format(tile_type))

    return extent

def get_raster_path(task, tile_type):
    return task.get_asset_download_path(tile_type + ".tif")


def postprocess(tile, mask, rescale = None, color_formula = None):
    if rescale:
        rescale_arr = list(map(float, rescale.split(",")))
        rescale_arr = list(_chunks(rescale_arr, 2))
        if len(rescale_arr) != tile.shape[0]:
            rescale_arr = ((rescale_arr[0]),) * tile.shape[0]
        for bdx in range(tile.shape[0]):
            tile[bdx] = numpy.where(
                mask,
                linear_rescale(
                    tile[bdx], in_range=rescale_arr[bdx], out_range=[0, 255]
                ),
                0,
            )
        tile = tile.astype(numpy.uint8)

    if color_formula:
        # make sure one last time we don't have
        # negative value before applying color formula
        tile[tile < 0] = 0
        for ops in parse_operations(color_formula):
            tile = scale_dtype(ops(to_math_type(tile)), numpy.uint8)

    return tile, mask


class TileJson(TaskNestedView):
    def get(self, request, pk=None, project_pk=None, tile_type=""):
        """
        Get tile.json for this tasks's asset type
        """
        task = self.get_and_check_task(request, pk)

        raster_path = get_raster_path(task, tile_type)
        with rasterio.open(raster_path) as src_dst:
            minzoom, maxzoom = get_zooms(src_dst)

        return Response({
            'tilejson': '2.1.0',
            'name': task.name,
            'version': '1.0.0',
            'scheme': 'xyz',
            'tiles': [get_tile_url(task, tile_type, self.request.query_params)],
            'minzoom': minzoom,
            'maxzoom': maxzoom,
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

        expr = self.request.query_params.get('expr')
        rescale = self.request.query_params.get('rescale', "0,1")
        color_map = self.request.query_params.get('color_map')

        pmin, pmax = 2.0, 98.0

        raster_path = get_raster_path(task, tile_type)

        if expr is not None:
            with rasterio.open(raster_path) as src:
                minzoom, maxzoom = get_zooms(src)
                centroid = get_extent(task, tile_type).centroid
                coords = mercantile.tile(centroid.x, centroid.y, minzoom)

                tile, mask = expression(
                    raster_path, coords.x, coords.y, coords.z, expr=expr, tilesize=256, nodata=None
                )

                rtile, rmask = postprocess(tile, mask, rescale=rescale)
                del tile
                del mask

                with MemoryFile() as memfile:
                    profile = src.profile
                    profile['count'] = rtile.shape[0]
                    profile.update()

                    with memfile.open(**profile) as dataset:
                        dataset.write(rtile)
                        dataset.write_mask(rmask)
                        del rtile

                    with memfile.open() as dataset:  # Reopen as DatasetReader
                        info = main.metadata(dataset, pmin=pmin, pmax=pmax)
        else:
            info = main.metadata(raster_path, pmin=pmin, pmax=pmax)

        del info['address']
        info['name'] = task.name
        info['scheme'] = 'xyz'
        info['tiles'] = [get_tile_url(task, tile_type, self.request.query_params)]

        if color_map:
            try:
                color_map = get_colormap(color_map, format="gdal")
                info['color_map'] = color_map
            except FileNotFoundError:
                raise exceptions.ValidationError("Not a valid color_map value")

        return Response(info)

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

        #indexes = self.request.query_params.get('indexes')
        # color_formula = self.request.query_params.get('color_formula')
        #nodata = self.request.query_params.get('nodata')

        indexes = None
        color_formula = None
        nodata = None

        expr = self.request.query_params.get('expr')
        rescale = self.request.query_params.get('rescale')
        color_map = self.request.query_params.get('color_map')

        # TODO: disable color_map
        # TODO: server-side expressions

        if tile_type in ['dsm', 'dtm'] and rescale is None:
            raise exceptions.ValidationError("Cannot get tiles without rescale parameter. Add ?rescale=min,max to the URL.")

        if nodata is not None:
            nodata = numpy.nan if nodata == "nan" else float(nodata)
        tilesize = scale * 256

        url = get_raster_path(task, tile_type)

        try:
            if expr is not None:
                tile, mask = expression(
                    url, x, y, z, expr=expr, tilesize=tilesize, nodata=nodata
                )
            else:
                tile, mask = main.tile(
                    url, x, y, z, indexes=indexes, tilesize=tilesize, nodata=nodata
                )
        except TileOutsideBounds:
            raise exceptions.NotFound("Outside of bounds")

        # Use alpha channel for transparency, don't use the mask if one is provided (redundant)
        if tile.shape[0] == 4:
            mask = None

        rtile, rmask = postprocess(
            tile, mask, rescale=rescale, color_formula=color_formula
        )
        del tile
        del mask

        if color_map:
            try:
                color_map = get_colormap(color_map, format="gdal")
            except FileNotFoundError:
                raise exceptions.ValidationError("Not a valid color_map value")

        options = img_profiles.get(driver, {})
        return HttpResponse(
            array_to_image(rtile, rmask, img_format=driver, color_map=color_map, **options),
            content_type="image/{}".format(ext)
        )