import os
import json
import math
from rest_framework import serializers
from rest_framework import status
from rest_framework.response import Response
import rasterio

from app.api.workers import GetTaskResult, TaskResultOutputError, CheckTask
from app.models import Task
from app.plugins.views import TaskView

from worker.tasks import execute_grass_script

from app.plugins.grass_engine import grass, GrassEngineException, cleanup_grass_context
from geojson import Feature, Point, FeatureCollection
from django.utils.translation import gettext_lazy as _

class GeoJSONSerializer(serializers.Serializer):
    area = serializers.JSONField(help_text="Polygon contour defining the volume area to compute")


class TaskVolume(TaskView):
    def post(self, request, pk=None):
        task = self.get_and_check_task(request, pk)
        if task.dsm_extent is None:
            return Response({'error': _('No surface model available. From the Dashboard, select this task, press Edit, from the options make sure to check "dsm", then press Restart --> From DEM.')})

        serializer = GeoJSONSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        area = serializer['area'].value
        points = FeatureCollection([Feature(geometry=Point(coords)) for coords in area['geometry']['coordinates'][0]])
        dsm = os.path.abspath(task.get_asset_download_path("dsm.tif"))

        try:
            context = grass.create_context({'auto_cleanup': False})
            context.add_file('area_file.geojson', json.dumps(area))
            context.add_file('points_file.geojson', str(points))
            context.add_param('dsm_file', dsm)
            context.set_location(dsm)

            celery_task_id = execute_grass_script.delay(os.path.join(
                os.path.dirname(os.path.abspath(__file__)),
                "calc_volume.py"
            ), context.serialize()).task_id

            return Response({'celery_task_id': celery_task_id}, status=status.HTTP_200_OK)
        except GrassEngineException as e:
            return Response({'error': str(e)}, status=status.HTTP_200_OK)

class TaskVolumeCheck(CheckTask):
    def on_error(self, result):
        cleanup_grass_context(result['context'])

class TaskVolumeResult(GetTaskResult):
    def get(self, request, pk=None, celery_task_id=None):
        task = Task.objects.only('dsm_extent').get(pk=pk)
        return super().get(request, celery_task_id, task=task)

    def handle_output(self, output, result, task):
        cleanup_grass_context(result['context'])

        cols = output.split(':')
        if len(cols) == 7:
            # Legacy: we had rasters in EPSG:3857 for a while
            # This could be removed at some point in the future
            # Correct scale measurement for web mercator
            # https://gis.stackexchange.com/questions/93332/calculating-distance-scale-factor-by-latitude-for-mercator#93335
            scale_factor = 1.0
            dsm = os.path.abspath(task.get_asset_download_path("dsm.tif"))
            with rasterio.open(dsm) as dst:
                if str(dst.crs) == 'EPSG:3857':
                    latitude = task.dsm_extent.centroid[1]
                    scale_factor = math.cos(math.radians(latitude)) ** 2

            volume = abs(float(cols[6]) * scale_factor)
            return str(volume)
        else:
            raise TaskResultOutputError(output)

