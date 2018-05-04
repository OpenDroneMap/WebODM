import os

import json
from rest_framework import serializers
from rest_framework import status
from rest_framework.response import Response

from app.api.tasks import TaskNestedView

from worker.tasks import execute_grass_script

from app.plugins.grass_engine import grass, GrassEngineException
from geojson import Feature, Point, FeatureCollection

class GeoJSONSerializer(serializers.Serializer):
    area = serializers.JSONField(help_text="Polygon contour defining the volume area to compute")


class TaskVolume(TaskNestedView):
    def post(self, request, pk=None):
        task = self.get_and_check_task(request, pk)
        if task.dsm_extent is None:
            return Response({'error': 'No surface model available'})

        serializer = GeoJSONSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        area = serializer['area'].value
        points = FeatureCollection([Feature(geometry=Point(coords)) for coords in area['geometry']['coordinates'][0]])
        dsm = os.path.abspath(task.get_asset_download_path("dsm.tif"))

        try:
            context = grass.create_context()
            context.add_file('area_file.geojson', json.dumps(area))
            context.add_file('points_file.geojson', str(points))
            context.add_param('dsm_file', dsm)
            context.set_location(dsm)

            output = execute_grass_script.delay(os.path.join(
                os.path.dirname(os.path.abspath(__file__)),
                "calc_volume.grass"
            ), context.serialize()).get()
            if isinstance(output, dict) and 'error' in output: raise GrassEngineException(output['error'])

            cols = output.split(':')
            if len(cols) == 7:
                return Response({'volume': str(abs(float(cols[6])))}, status=status.HTTP_200_OK)
            else:
                raise GrassEngineException(output)
        except GrassEngineException as e:
            return Response({'error': str(e)}, status=status.HTTP_200_OK)




