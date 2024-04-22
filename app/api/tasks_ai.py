import os
import re
import shutil
from wsgiref.util import FileWrapper

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
        print(f'GETTING CATTLE DETECTION\nTHE PK IS {pk}\nTHE PROJECT PK IS {project_pk}')
        task = pk
        print(f'THE TASK IS {task}\nGETTING CATTLE DETECTION')

        # Get the path to the cattle detection file (it is on /webodm/app/media/project/project_pk/task/pk/assets/ai_detections/cattle/cattle_detection.geojson)

        task_assets_path = os.path.join(settings.MEDIA_ROOT, 'project', str(project_pk), 'task',str(task),'assets','ai_detections')

        cattle_detection_path = os.path.join(settings.MEDIA_ROOT, 'project', str(project_pk),'task', str(task), 'assets', 'ai_detections', 'cattle', 'cattle_detection.geojson')
        print(f'THE CATTLE DETECTION PATH IS {cattle_detection_path}')

        # print all the folders (only folders) in the task_assets_path
        print(f'PRINTING ALL FOLDERS IN {task_assets_path}')
        for root, dirs, files in os.walk(task_assets_path):
            print(f'ROOT: {root}')
            print(f'DIRS: {dirs}')

        # Check if the file exists
        if not os.path.exists(cattle_detection_path):
            raise exceptions.NotFound(detail="Cattle detection file not found")
        
        # Open the file
        with open(cattle_detection_path, 'rb') as f:
            response = HttpResponse(f.read(), content_type='application/json')
            response['Content-Disposition'] = 'attachment; filename="cattle_detection.geojson"'
            return response

        # return a string on a object just saying "ok" just to test
        return Response(str(pk))

        


        