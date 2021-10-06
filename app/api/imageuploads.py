import os
import io
import math

from .tasks import TaskNestedView
from rest_framework import exceptions
from app.models import ImageUpload
from app.models.task import assets_directory_path
from PIL import Image, ImageDraw, ImageOps
from django.http import HttpResponse
from .tasks import download_file_response
from .common import hex2rgb
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
                    'radius': float(point_radiuses[i]) if i < len(point_radiuses) else 1.0,
                })

                i += 1
            
            zoom = float(self.request.query_params.get('zoom', '1'))
            if zoom < 0.1 or zoom > 10:
                raise ValueError()

        except ValueError:
            raise exceptions.ValidationError("Invalid query parameters")

        with Image.open(image_path) as img:
            if img.mode != 'RGB':
                img = normalize(img)
                img = img.convert('RGB')
            w, h = img.size
            thumb_size = min(max(w, h), thumb_size)
            
            # Move image center
            if center_x != 0.5 or center_y != 0.5:
                img = img.crop((
                        w * (center_x - 0.5),
                        h * (center_y - 0.5),
                        w * (center_x + 0.5),
                        h * (center_y + 0.5)
                    ))
            
            # Scale
            scale_factor = 1
            off_x = 0
            off_y = 0

            if zoom != 1:
                scale_factor = (2 ** (zoom - 1))
                off_x = w / 2.0 - w / scale_factor / 2.0
                off_y = h / 2.0 - h / scale_factor / 2.0
                win = img.crop((off_x, off_y, 
                                off_x + (w / scale_factor),
                                off_y + (h / scale_factor)
                    ))
                img = ImageOps.scale(win, scale_factor, Image.NEAREST)

            sw, sh = w * scale_factor, h * scale_factor

            # Draw points
            for p in points:
                d = ImageDraw.Draw(img)
                r = p['radius'] * max(w, h) / 100.0
                
                sx = (p['x'] + (0.5 - center_x)) * sw
                sy = (p['y'] + (0.5 - center_y)) * sh
                x = sx - off_x * scale_factor
                y = sy - off_y * scale_factor

                d.ellipse([(x - r, y - r), 
                           (x + r, y + r)], outline=p['color'], width=int(max(1.0, math.floor(r / 3.0))))
            
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