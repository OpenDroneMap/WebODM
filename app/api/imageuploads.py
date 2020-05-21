import os

import io

from .tasks import TaskNestedView
from rest_framework import exceptions
from app.models import ImageUpload
from app.models.task import assets_directory_path
from PIL import Image
from django.http import HttpResponse
from .tasks import download_file_response
import numpy as np

def normalize(img):
    """
    Linear normalization
    http://en.wikipedia.org/wiki/Normalization_%28image_processing%29
    """
    arr = np.array(img).astype('float')

    minval = arr.min()
    maxval = arr.max()
    if minval != maxval:
        arr -= minval
        arr *= (255.0/(maxval-minval))

    return Image.fromarray(arr)

class Thumbnail(TaskNestedView):
    def get(self, request, pk=None, project_pk=None, image_filename=""):
        """
        Generate a thumbnail on the fly for a particular task's image
        """
        task = self.get_and_check_task(request, pk)
        image = ImageUpload.objects.filter(task=task, image=assets_directory_path(task.id, task.project.id, image_filename)).first()

        if image is None:
            raise exceptions.NotFound()

        image_path = image.path()
        if not os.path.isfile(image_path):
            raise exceptions.NotFound()

        try:
            thumb_size = int(self.request.query_params.get('size', 512))
            if thumb_size < 1:
                raise ValueError()

            quality = int(self.request.query_params.get('quality', 75))
            if quality < 0 or quality > 100:
                raise ValueError()

        except ValueError:
            raise exceptions.ValidationError("Invalid query parameters")

        with Image.open(image_path) as img:
            if img.mode != 'RGB':
                img = normalize(img)
                img = img.convert('RGB')
            img.thumbnail((thumb_size, thumb_size))
            output = io.BytesIO()
            img.save(output, format='JPEG', quality=quality)

            res = HttpResponse(content_type="image/jpeg")
            res['Content-Disposition'] = 'inline'
            res.write(output.getvalue())
            output.close()

            return res

class ImageDownload(TaskNestedView):
    def get(self, request, pk=None, project_pk=None, image_filename=""):
        """
        Download a task's image
        """
        task = self.get_and_check_task(request, pk)
        image = ImageUpload.objects.filter(task=task, image=assets_directory_path(task.id, task.project.id, image_filename)).first()

        if image is None:
            raise exceptions.NotFound()

        image_path = image.path()
        if not os.path.isfile(image_path):
            raise exceptions.NotFound()

        return download_file_response(request, image_path, 'attachment')