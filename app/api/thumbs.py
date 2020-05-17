import os

from .tasks import TaskNestedView
from app.security import path_traversal_check
from django.core.exceptions import SuspiciousFileOperation
from rest_framework import exceptions

class Thumbnail(TaskNestedView):
    def get(self, request, pk=None, project_pk=None, image_filename=""):
        """
        Generate a thumbnail on the fly for a particular task's image
        """
        task = self.get_and_check_task(request, pk)

        image_path = task.task_path(image_filename)

        try:
            path_traversal_check(image_path, task.task_path(""))
        except SuspiciousFileOperation:
            raise exceptions.NotFound()

        if not os.path.isfile(image_path):
            raise exceptions.NotFound()

        # TODO

        return Response({
            'tilejson': '2.1.0',
            'name': task.name,
            'version': '1.0.0',
            'scheme': 'xyz',
            'tiles': [get_tile_url(task, tile_type, self.request.query_params)],
            'minzoom': minzoom - ZOOM_EXTRA_LEVELS,
            'maxzoom': maxzoom + ZOOM_EXTRA_LEVELS,
            'bounds': get_extent(task, tile_type).extent
        })