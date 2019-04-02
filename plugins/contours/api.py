import mimetypes
import os

from django.http import FileResponse
from django.http import HttpResponse
from wsgiref.util import FileWrapper
from rest_framework import status
from rest_framework.response import Response
from app.plugins.views import TaskView
from worker.tasks import execute_grass_script
from app.plugins.grass_engine import grass, GrassEngineException, cleanup_grass_context
from worker.celery import app as celery

class TaskContoursGenerate(TaskView):
    def post(self, request, pk=None):
        task = self.get_and_check_task(request, pk)

        layer = request.data.get('layer', None)
        if layer == 'DSM' and task.dsm_extent is None:
            return Response({'error': 'No DSM layer is available.'})
        elif layer == 'DTM' and task.dtm_extent is None:
            return Response({'error': 'No DTM layer is available.'})

        try:
            if layer == 'DSM':
                dem = os.path.abspath(task.get_asset_download_path("dsm.tif"))
            elif layer == 'DTM':
                dem = os.path.abspath(task.get_asset_download_path("dtm.tif"))
            else:
                raise GrassEngineException('{} is not a valid layer.'.format(layer))

            context = grass.create_context({'auto_cleanup' : False})
            epsg = int(request.data.get('epsg', '3857'))
            interval = float(request.data.get('interval', 1))
            format = request.data.get('format', 'GPKG')
            supported_formats = ['GPKG', 'ESRI Shapefile', 'DXF', 'GeoJSON']
            if not format in supported_formats:
                raise GrassEngineException("Invalid format {} (must be one of: {})".format(format, ",".join(supported_formats)))
            simplify = float(request.data.get('simplify', 0.01))

            context.add_param('dem_file', dem)
            context.add_param('interval', interval)
            context.add_param('format', format)
            context.add_param('simplify', simplify)
            context.add_param('epsg', epsg)
            #context.set_location('epsg:' + str(epsg))
            context.set_location(dem)

            celery_task_id = execute_grass_script.delay(os.path.join(
                os.path.dirname(os.path.abspath(__file__)),
                "calc_contours.grass"
            ), context.serialize()).task_id

            return Response({'celery_task_id': celery_task_id}, status=status.HTTP_200_OK)
        except GrassEngineException as e:
            return Response({'error': str(e)}, status=status.HTTP_200_OK)

class TaskContoursCheck(TaskView):
    def get(self, request, pk=None, celery_task_id=None):
        res = celery.AsyncResult(celery_task_id)
        if not res.ready():
            return Response({'ready': False}, status=status.HTTP_200_OK)
        else:
            result = res.get()
            if result.get('error', None) is not None:
                cleanup_grass_context(result['context'])
                return Response({'ready': True, 'error': result['error']})

            contours_file = result.get('output')
            if not contours_file or not os.path.exists(contours_file):
                cleanup_grass_context(result['context'])
                return Response({'ready': True, 'error': 'Contours file could not be generated. This might be a bug.'})

            request.session['contours_' + celery_task_id] = contours_file
            return Response({'ready': True})


class TaskContoursDownload(TaskView):
    def get(self, request, pk=None, celery_task_id=None):
        contours_file = request.session.get('contours_' + celery_task_id, None)

        if contours_file is not None:
            filename = os.path.basename(contours_file)
            filesize = os.stat(contours_file).st_size

            f = open(contours_file, "rb")

            # More than 100mb, normal http response, otherwise stream
            # Django docs say to avoid streaming when possible
            stream = filesize > 1e8
            if stream:
                response = FileResponse(f)
            else:
                response = HttpResponse(FileWrapper(f),
                                        content_type=(mimetypes.guess_type(filename)[0] or "application/zip"))

            response['Content-Type'] = mimetypes.guess_type(filename)[0] or "application/zip"
            response['Content-Disposition'] = "attachment; filename={}".format(filename)
            response['Content-Length'] = filesize

            return response
        else:
            return Response({'error': 'Invalid contours download id'})
