import rasterio
from django.http import HttpResponse
from rio_tiler.errors import TileOutsideBounds
from rio_tiler.mercator import get_zooms
from rio_tiler import main
from rio_tiler.utils import array_to_image, get_colormap, expression, linear_rescale, _chunks
from rio_color.operations import parse_operations
from rio_color.utils import scale_dtype, to_math_type
from rio_tiler.profiles import img_profiles

import numpy

from .tasks import TaskNestedView
from rest_framework import exceptions
from rest_framework.response import Response


def get_tile_url(task, tile_type):
    return '/api/projects/{}/tasks/{}/{}/tiles/{{z}}/{{x}}/{{y}}.png'.format(task.project.id, task.id, tile_type)

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

    return extent.extent

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
            'tiles': [get_tile_url(task, tile_type)],
            'minzoom': minzoom,
            'maxzoom': maxzoom,
            'bounds': get_extent(task, tile_type)
        })

class Bounds(TaskNestedView):
    def get(self, request, pk=None, project_pk=None, tile_type=""):
        """
        Get the bounds for this tasks's asset type
        """
        task = self.get_and_check_task(request, pk)

        return Response({
            'url': get_tile_url(task, tile_type),
            'bounds': get_extent(task, tile_type)
        })

class Metadata(TaskNestedView):
    def get(self, request, pk=None, project_pk=None, tile_type=""):
        """
        Get the metadata for this tasks's asset type
        """
        task = self.get_and_check_task(request, pk)

        raster_path = get_raster_path(task, tile_type)
        info = main.metadata(raster_path, pmin=2.0, pmax=98.0)
        info['address'] = get_tile_url(task, tile_type)
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

        indexes = self.request.query_params.get('indexes')
        expr = self.request.query_params.get('expr')
        rescale = self.request.query_params.get('rescale')
        color_formula = self.request.query_params.get('color_formula')
        color_map = self.request.query_params.get('color_map')
        nodata = self.request.query_params.get('nodata')

        if tile_type in ['dsm', 'dtm'] and rescale is None:
            #raise exceptions.ValidationError("Cannot get tiles without rescale parameter. Add ?rescale=min,max to the URL.")

            if rescale is None:
                rescale = '157.0500,164.850'

        # if tile_type == 'orthophoto':
        #     expr = '(b2-b1)/(b2+b1-b3)'
        #     rescale = "0.02,0.1"
        #     color_map = 'rdylgn'

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

        # Use alpha channel
        if tile.shape[0] == 4:
            mask = None

        rtile, rmask = postprocess(
            tile, mask, rescale=rescale, color_formula=color_formula
        )

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