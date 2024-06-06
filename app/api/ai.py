from rest_framework.views import APIView
from rest_framework.permissions import IsAuthenticated, AllowAny
from rest_framework.response import Response
from rest_framework import exceptions
from rest_framework import status
from django.core.exceptions import ObjectDoesNotExist
from rest_framework import exceptions

from app import models
import requests

from webodm.settings import DISABLE_PERMISSIONS, AGROSMART_API_ADDRESS

import json

def crash_with_style(message: str, status):
    return Response({
        'detail': message
    }, status = status)

def send_post_to_processing(typ: str, subtype: str, project_pk, pk, payload: dict):
    if not AGROSMART_API_ADDRESS:
        return crash_with_style('No <AGROSMART_API_ADDRESS> was supplied.', status.HTTP_500_INTERNAL_SERVER_ERROR)

    url = f'{AGROSMART_API_ADDRESS}/process/{typ}'
    if subtype:
        url += f'/{subtype}'
    headers = {'content-type': 'application/json'}
    params = {
        'project_id': project_pk,
        'task_id' : pk
    }
    response = requests.post(url=url, params=params, data=json.dumps(payload), headers=headers)
    try:
        res = response.json()
        return Response(res, status=response.status_code)
    except ValueError:
        url_tail = f'{typ}'
        if subtype:
            url_tail += f'/{subtype}'
        return crash_with_style(f"The '/{url_tail}' endpoint does not exist!", status.HTTP_400_BAD_REQUEST)

class AiProcessing(APIView):

    permission_classes = (IsAuthenticated,)

    def post(self, request, project_pk, pk):

        project = None
        if not DISABLE_PERMISSIONS:
            try:
                project = models.Project.objects.get(pk=project_pk, deleting=False)
                if not request.user.has_perm('view_project', project): raise ObjectDoesNotExist()
            except ObjectDoesNotExist:
                raise exceptions.NotFound()

        if request.user.is_staff or request.user.has_perm('change_project', project) or DISABLE_PERMISSIONS:
            typ = request.data.get('type', "")
            if not typ:
                return crash_with_style("Required <type> was not provided in the body.", status=status.HTTP_400_BAD_REQUEST)
            sub_type = request.data.get('subtype', "")
            payload = request.data.get('payload', "")
            return send_post_to_processing(typ, sub_type, project_pk, pk, payload)
        else:
            return crash_with_style(f"You don't have permission to access project: {project_pk}", status.HTTP_401_UNAUTHORIZED) 