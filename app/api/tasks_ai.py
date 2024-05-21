import os
from django.conf import settings
from django.http import HttpResponse
from rest_framework import exceptions, serializers
from rest_framework.response import Response
from rest_framework.views import APIView
import json
from .tasks import TaskNestedView

# Serializer for the Detection data
class DetectionSerializer(serializers.Serializer):
    field_number = serializers.CharField()
    content = serializers.JSONField()

# Base class for AI detection-related views
class TaskAiDetectionBase(TaskNestedView):
    """
    Base view for AI detection tasks.
    Provides common methods used across specific AI detection task views.
    """

    def get_file_path(self, project_pk, task_pk, detection_type, file_name=''):
        """
        Constructs and returns a file path for the specified AI detection type and file name.
        """
        base_path = os.path.join(settings.MEDIA_ROOT, 'project', str(project_pk), 'task', str(task_pk), 'assets', 'ai_detections', detection_type)
        return os.path.join(base_path, file_name)

    def read_geojson_file(self, file_path):
        """
        Reads and returns the content of a geojson file.
        Raises NotFound exception if the file does not exist.
        """
        if not os.path.exists(file_path):
            raise exceptions.NotFound(detail=f"File not found: {file_path}")
        
        file_content = ""
        with open(file_path, 'rb') as file:
            file_content = file.read()

        # return the content as a json string
        return file_content
        

# AI Detection for Cattle
class TaskAiDetectionCattle(TaskAiDetectionBase):
    """
    Retrieves the cattle detection geojson file for a given task.
    """

    def get(self, request, pk=None, project_pk=None):
        file_path = self.get_file_path(project_pk, pk, 'cattle', 'cattle_detection.geojson')
        file_content = self.read_geojson_file(file_path)
        response = HttpResponse(file_content, content_type='application/json')
        return response

# AI Detection for Weeds
class TaskAiDetectionWeed(TaskAiDetectionBase):
    """
    Retrieves a list of geojson files for a specified type of weed detection.
    """

    def get(self, request, pk=None, project_pk=None, detection_type=""):
        if not detection_type:
            raise exceptions.NotFound(detail="Detection type not specified")

        base_path = self.get_file_path(project_pk, pk, detection_type)
        if not os.path.exists(base_path):
            raise exceptions.NotFound(detail=f"{detection_type} detection folder not found")

        files = [f for f in os.listdir(base_path) if f.startswith(f'{detection_type}_detection_') and f.endswith('.geojson')]
        if not files:
            raise exceptions.NotFound(detail=f"No detection files found for type: {detection_type}")

        detections = [self._build_detection_data(file, base_path) for file in files]
        return Response(DetectionSerializer(detections, many=True).data)

    def _build_detection_data(self, file_name, base_path):
        """
        Builds and returns detection data dictionary for the given file.
        """
        file_path = os.path.join(base_path, file_name)
        file_content = self.read_geojson_file(file_path)
        try:
            # Converte a string JSON para um objeto Python
            json_content = json.loads(file_content.decode('utf-8'))
        except json.JSONDecodeError:
            raise exceptions.ParseError(detail="Error parsing JSON content from file")
        
        return {
            'field_number': file_name.split('_')[2].split('.')[0],
            'content': json_content
        }

# AI Detection for Field Polygon
class TaskAiDetectionField(TaskAiDetectionBase):
    """
    Retrieves a geojson file for field polygon detection.
    """

    def get(self, request, pk=None, project_pk=None):
        file_path = self.get_file_path(project_pk, pk, 'fields', 'field_detection.geojson')
        file_content = self.read_geojson_file(file_path)
        response = HttpResponse(file_content, content_type='application/json')
        response['Content-Disposition'] = 'inline; filename=field_detection.geojson'
        return response
