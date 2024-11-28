from rest_framework.views import APIView
from rest_framework.permissions import IsAuthenticated, AllowAny
from rest_framework.response import Response
from rest_framework import exceptions
from rest_framework import status
from django.core.exceptions import ObjectDoesNotExist, ValidationError
from rest_framework import exceptions

from app import models
import requests

from webodm.settings import DISABLE_PERMISSIONS, AGROSMART_API_ADDRESS

import json

def crash_with_style(message: str, status):
    return Response({
        'detail': message
    }, status = status)

def send_post_to_processing(project_pk, pk, processing_requests: dict):
    if not AGROSMART_API_ADDRESS:
        return crash_with_style('No <AGROSMART_API_ADDRESS> was supplied.', status.HTTP_500_INTERNAL_SERVER_ERROR)

    url = f'{AGROSMART_API_ADDRESS}/process/sprayline'
    headers = {'content-type': 'application/json'}
    params = {
        'project_id': project_pk,
        'task_id' : pk
    }
    

    response = None
    try:
        response = requests.post(url=url, params=params, data=json.dumps({'processing_requests' : processing_requests}), headers=headers)
    except requests.exceptions.ConnectionError:
        return crash_with_style(f"The '{url}' endpoint does not exist!", status.HTTP_400_BAD_REQUEST)

    try:
        res = response.json()
        return Response(res, status=response.status_code)
    except ValueError:
        return crash_with_style(f"The response from the server was malformed on the /sprayline endpoint!", status.HTTP_400_BAD_REQUEST)

class SprayLinesProcessing(APIView):
    queryset = models.Task.objects.all().defer('orthophoto_extent', 'dtm_extent', 'dsm_extent', )
    permission_classes = (IsAuthenticated,)

    def post(self, request, project_pk, pk):

        project = None
        if not DISABLE_PERMISSIONS:
            
            task = None
            try:
                task = self.queryset.annotate().get(pk=pk)
            except (ObjectDoesNotExist, ValidationError):
                raise exceptions.NotFound()
            
            if task is None:
                raise exceptions.NotFound()
            elif not task.public:
                try:
                    project_pk = task.project.id
                    project = models.Project.objects.get(pk=project_pk, deleting=False)
                    if not request.user.has_perm('view_project', project): raise ObjectDoesNotExist()
                except ObjectDoesNotExist:
                    raise exceptions.NotFound()

        if request.user.is_staff or request.user.has_perm('change_project', project) or DISABLE_PERMISSIONS:
            processing_requests = request.data.get('processing_requests', "")
            return send_post_to_processing(project_pk, pk, processing_requests)
        else:
            return crash_with_style(f"You don't have permission to access project: {project_pk}", status.HTTP_401_UNAUTHORIZED) 