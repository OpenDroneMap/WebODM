import rasterio
from rio_tiler.mercator import get_zooms

from .tasks import TaskNestedView
from rest_framework import exceptions
from rest_framework.response import Response

class TileJson(TaskNestedView):
    def get(self, request, pk=None, project_pk=None, tile_type=""):
        """
        Get tile.json for this tasks's asset type
        """
        task = self.get_and_check_task(request, pk)

        extent_map = {
            'orthophoto': task.orthophoto_extent,
            'dsm': task.dsm_extent,
            'dtm': task.dtm_extent,
        }

        if not tile_type in extent_map:
            raise exceptions.ValidationError("Type {} is not a valid tile type".format(tile_type))

        extent = extent_map[tile_type]

        if extent is None:
            raise exceptions.ValidationError("A {} has not been processed for this task. Tiles are not available.".format(tile_type))

        raster_path = task.get_asset_download_path(tile_type + ".tif")
        with rasterio.open(raster_path) as src_dst:
            minzoom, maxzoom = get_zooms(src_dst)

        return Response({
            'tilejson': '2.1.0',
            'name': task.name,
            'version': '1.0.0',
            'scheme': 'tms',
            'tiles': ['/api/projects/{}/tasks/{}/{}/tiles/{{z}}/{{x}}/{{y}}.png'.format(task.project.id, task.id, tile_type)],
            'minzoom': minzoom,
            'maxzoom': maxzoom,
            'bounds': extent.extent
        })




