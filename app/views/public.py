import json
from django.http import Http404
from django.http import JsonResponse
from django.shortcuts import get_object_or_404
from django.utils.translation import ugettext as _
from django.shortcuts import render

from app.api.tasks import TaskSerializer
from app.models import Task, Project
from app.views.utils import get_permissions
from django.views.decorators.csrf import ensure_csrf_cookie
from webodm import settings

def get_public_task(task_pk):
    """
    Get a task and raise a 404 if it's not public
    """
    task = get_object_or_404(Task, pk=task_pk)
    if not (task.public or task.project.public):
       raise Http404()
    return task

def get_public_project(public_id):
    project = get_object_or_404(Project, public_id=public_id)
    if not project.public:
        raise Http404()
    return project

@ensure_csrf_cookie
def handle_map(request, template, uuid_type=None, uuid=None, hide_title=False):
    if uuid_type == 'task':
        task = get_public_task(uuid)
        title = task.name or task.id
        mapItems = [task.get_map_items()]
        public_edit = task.public_edit
        permissions = get_permissions(request.user, task.project)
        projectInfo = None
    else:
        project = get_public_project(uuid)
        title = project.name or project.id
        mapItems = project.get_map_items()
        public_edit = project.public_edit
        permissions = get_permissions(request.user, project)
        projectInfo = project.get_public_info()

    return render(request, template, {
        'title': title,
        'params': {
            'map-items': json.dumps(mapItems),
            'title': title if not hide_title else '',
            'public': 'true',
            'public-edit': str(public_edit).lower(),
            'share-buttons': 'false' if settings.DESKTOP_MODE else 'true',
            'selected-map-type': request.GET.get('t', 'auto'),
            'permissions': json.dumps(permissions),
            'project': json.dumps(projectInfo)
        }.items()
    })

def map(request, uuid_type=None, uuid=None):
    return handle_map(request, 'app/public/map.html', uuid_type, uuid, False)

def map_iframe(request, uuid_type=None, uuid=None):
    return handle_map(request, 'app/public/map_iframe.html', uuid_type, uuid, True)

@ensure_csrf_cookie
def handle_model_display(request, template, task_pk=None):
    task = get_public_task(task_pk)

    return render(request, template, {
            'title': task.name,
            'params': {
                'task': json.dumps(task.get_model_display_params()),
                'public': 'true',
                'public-edit': str(task.public_edit).lower(),
                'share-buttons': 'false' if settings.DESKTOP_MODE else 'true',
                'model-type': request.GET.get('t', 'cloud'),
            }.items()
        })

def model_display(request, task_pk=None):
    return handle_model_display(request, 'app/public/3d_model_display.html', task_pk)

def model_display_iframe(request, task_pk=None):
    return handle_model_display(request, 'app/public/3d_model_display_iframe.html', task_pk)

def task_json(request, task_pk=None):
    task = get_public_task(task_pk)
    serializer = TaskSerializer(task)
    return JsonResponse(serializer.data)