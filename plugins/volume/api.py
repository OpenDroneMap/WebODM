from rest_framework import serializers
from rest_framework import status
from rest_framework.response import Response

from app.api.tasks import TaskNestedView


class GeoJSONSerializer(serializers.Serializer):
    geometry = serializers.JSONField(help_text="Polygon contour defining the volume area to compute")


class TaskVolume(TaskNestedView):
    def post(self, request, pk=None):
        task = self.get_and_check_task(request, pk)
        serializer = GeoJSONSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        #result=task.get_volume(serializer.geometry)
        return Response(serializer.geometry, status=status.HTTP_200_OK)



