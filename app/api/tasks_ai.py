import os
import re
import shutil
from wsgiref.util import FileWrapper
import json


import mimetypes

from shutil import copyfileobj, move
from django.core.exceptions import ObjectDoesNotExist, SuspiciousFileOperation, ValidationError
from django.core.files.uploadedfile import InMemoryUploadedFile
from django.db import transaction
from django.http import FileResponse
from django.http import HttpResponse
from rest_framework import status, serializers, viewsets, filters, exceptions, permissions, parsers
from rest_framework.decorators import action
from rest_framework.permissions import AllowAny
from rest_framework.response import Response
from rest_framework.views import APIView

from webodm import settings

from .tasks import TaskNestedView



class TaskAiDetectionCattle(TaskNestedView):
    """
        Retrive the cattle detection geojson file for a task
    """

    def get(self, request, pk=None, project_pk=None):
        task = pk
        

        # Get the path to the cattle detection file (it is on /webodm/app/media/project/project_pk/task/pk/assets/ai_detections/cattle/cattle_detection.geojson)

        

        cattle_detection_path = os.path.join(settings.MEDIA_ROOT, 'project', str(project_pk),'task', str(task), 'assets', 'ai_detections', 'cattle', 'cattle_detection.geojson')
        # print(f'THE CATTLE DETECTION PATH IS {cattle_detection_path}')

        # Check if the folder exists
        if not os.path.exists(cattle_detection_path):
            raise exceptions.NotFound(detail="Cattle detection folder not found")
        
        # Open the file

        # check if file exists
        if not os.path.exists(cattle_detection_path):
            raise exceptions.NotFound(detail="Cattle detection file not found")

        with open(cattle_detection_path, 'rb') as f:
            # the response is a json with the content of the file
            # it should not download the file. it should be read and returned as a json
            response = HttpResponse(f.read(), content_type='application/json')
            response['Content-Disposition'] = 'inline; filename=cattle_detection.geojson'
            return response


class SoyDetectionSerializer(serializers.Serializer):
    field_number = serializers.CharField()
    content = serializers.CharField()

class TaskAiDetectionSoy(TaskNestedView):
    """Retrieves a list of geojson files for soy detection"""


    def get(self, request, pk=None, project_pk=None):
        task = pk
        # Get the path to the soy detection files (they are on /webodm/app/media/project/project_pk/task/pk/assets/ai_detections/soy/soy_detection_<filed_number>.geojson)

        soy_detection_path = os.path.join(settings.MEDIA_ROOT, 'project', str(project_pk),'task', str(task), 'assets', 'ai_detections', 'soy')

        # Check if the directory exists
        if not os.path.exists(soy_detection_path):
            raise exceptions.NotFound(detail="Soy detection folder not found")
    
        # Get all the files in the directory
        files = os.listdir(soy_detection_path)
        soy_files = []
        for file in files:
            if file.startswith('soy_detection_') and file.endswith('.geojson'):
                soy_files.append(file)
        

        # Check if there are any files
        if not soy_files:
            raise exceptions.NotFound(detail="Soy detection files not found")
        
        # Open the files
        soy_files_content  = []
        
        for file in soy_files:
            with open(os.path.join(soy_detection_path, file), 'rb') as f:
                soy_files_content.append({
                    'field_number': file.split('_')[2].split('.')[0],
                    'content': f.read()
                })

        return Response(SoyDetectionSerializer(soy_files_content, many=True).data)