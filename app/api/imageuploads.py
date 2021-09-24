import os
import io
import math

from .tasks import TaskNestedView
from rest_framework import exceptions
from app.models import ImageUpload
from app.models.task import assets_directory_path
from PIL import Image, ImageDraw
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

def hex2rgb(hex_color):
    """
    Adapted from https://stackoverflow.com/questions/29643352/converting-hex-to-rgb-value-in-python/29643643
    """
    hex_color = hex_color.lstrip('#')
    if len(hex_color) != 6:
        return tuple((255, 255, 255))
    try:
        return tuple(int(hex_color[i:i+2], 16) for i in (0, 2, 4))
    except ValueError:
        return tuple((255, 255, 255))

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
                
            center_x = float(self.request.query_params.get('center_x', '0.5'))
            center_y = float(self.request.query_params.get('center_y', '0.5'))
            if center_x < -0.5 or center_x > 1.5 or center_y < -0.5 or center_y > 1.5:
                raise ValueError()

            draw_points = self.request.query_params.getlist('draw_point')
            point_colors = self.request.query_params.getlist('point_color')
            point_radiuses = self.request.query_params.getlist('point_radius')
            
            points = []
            i = 0
            for p in draw_points:
                coords = list(map(float, p.split(",")))
                if len(coords) != 2:
                    raise ValueError()

                points.append({
                    'x': coords[0],
                    'y': coords[1],
                    'color': hex2rgb(point_colors[i]) if i < len(point_colors) else (255, 255, 255),
                    'radius': float(point_radiuses[i]) if i < len(point_radiuses) else 1,
                })

                i += 1

        except ValueError:
            raise exceptions.ValidationError("Invalid query parameters")

        with Image.open(image_path) as img:
            if img.mode != 'RGB':
                img = normalize(img)
                img = img.convert('RGB')
            w, h = img.size
            
            # Draw points
            for p in points:
                d = ImageDraw.Draw(img)
                r = p['radius']
                d.ellipse([(p['x'] * w - r, p['y'] * h - r), 
                           (p['x'] * w + r, p['y'] * h + r)], outline=p['color'], width=max(1.0, math.floor(r / 3.0)))
            
            # Move image center
            if center_x != 0.5 or center_y != 0.5:
                img = img.crop((
                        w * (center_x - 0.5),
                        h * (center_y - 0.5),
                        w * (center_x + 0.5),
                        h * (center_y + 0.5)
                    ))
            
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