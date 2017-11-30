import json
from django.http import Http404
from django.shortcuts import get_object_or_404
from django.utils.translation import ugettext as _
from django.shortcuts import render

from app.models import Task


def get_public_task(public_uuid):
    """
    Get a task and raise a 404 if it's not public
    """
    task = get_object_or_404(Task, public_uuid=public_uuid)
    #if not task.public:
    #    raise Http404()
    return task


def map(request, task_public_uuid=None):
    task = get_public_task(task_public_uuid)

    return render(request, 'app/map.html', {
        'title': _("Map"),
        'params': {
            'map-items': json.dumps([task.get_map_items()]),
            'title': task.name
        }.items()
    })