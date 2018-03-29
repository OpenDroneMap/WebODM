import os

from rest_framework import serializers
from rest_framework import status
from rest_framework.response import Response

from app.api.tasks import TaskNestedView

from app.plugins.grass_engine import grass


class GeoJSONSerializer(serializers.Serializer):
    area = serializers.JSONField(help_text="Polygon contour defining the volume area to compute")


class TaskVolume(TaskNestedView):
    def post(self, request, pk=None):
        task = self.get_and_check_task(request, pk)
        if task.dsm_extent is None:
            return Response({'error': 'No surface model available'})

        serializer = GeoJSONSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)


        # context = grass.create_context()
        # context.add_file('area_file.geojson', serializer['area'])
        # context.add_file('points_file.geojson', 'aaa')
        # context.add_param('dsm_file', os.path.abspath(task.get_asset_download_path("dsm.tif")))
        # context.execute(os.path.join(
        #     os.path.dirname(os.path.abspath(__file__),
        #     "calc_volume.grass"
        # )))

        print(serializer['area'])
        return Response(30, status=status.HTTP_200_OK)



