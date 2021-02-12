import json
from django.http import Http404
from django.http import JsonResponse
from django.shortcuts import get_object_or_404
from django.utils.translation import ugettext as _
from django.shortcuts import render

from app.api.tasks import TaskSerializer
from app.models import Task
from django.views.decorators.csrf import ensure_csrf_cookie

def get_public_task(task_pk):
    """
    Get a task and raise a 404 if it's not public
    """
    task = get_object_or_404(Task, pk=task_pk)
    if not task.public:
       raise Http404()
    return task

@ensure_csrf_cookie
def handle_map(request, template, task_pk=None, hide_title=False):
    task = get_public_task(task_pk)

    return render(request, template, {
        'title': _("Map"),
        'params': {
            'map-items': json.dumps([task.get_map_items()]),
            'title': task.name if not hide_title else '',
            'public': 'true'
        }.items()
    })

def map(request, task_pk=None):
    return handle_map(request, 'app/public/map.html', task_pk, False)

def map_iframe(request, task_pk=None):
    return handle_map(request, 'app/public/map_iframe.html', task_pk, True)

@ensure_csrf_cookie
def handle_model_display(request, template, task_pk=None):
    task = get_public_task(task_pk)

    return render(request, template, {
            'title': task.name,
            'params': {
                'task': json.dumps(task.get_model_display_params()),
                'public': 'true'
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