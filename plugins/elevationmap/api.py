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
from app.plugins import get_current_plugin

class TaskElevationMapGenerate(TaskView):
    def post(self, request, pk=None):
        task = self.get_and_check_task(request, pk)
        plugin = get_current_plugin()
        
        if task.dsm_extent is None:
            return Response({'error': 'No DSM layer is available.'}, status=status.HTTP_400_BAD_REQUEST)
        
        reference = request.data.get('reference', 'global')
        if reference.lower() == 'ground' and task.dtm_extent is None:
            return Response({'error': 'No DTM layer is available. You need one to set the ground as reference.'}, status=status.HTTP_400_BAD_REQUEST)

        try:
            context = grass.create_context({'auto_cleanup' : False, 'location': 'epsg:3857', 'python_path': plugin.get_python_packages_path()})
            dsm = os.path.abspath(task.get_asset_download_path("dsm.tif"))
            dtm = os.path.abspath(task.get_asset_download_path("dtm.tif")) if reference.lower() == 'ground' else None
            epsg = int(request.data.get('epsg', '3857'))
            interval = request.data.get('interval', '5')
            format = request.data.get('format', 'GPKG')
            supported_formats = ['GPKG', 'ESRI Shapefile', 'DXF', 'GeoJSON']
            if not format in supported_formats:
                raise GrassEngineException("Invalid format {} (must be one of: {})".format(format, ",".join(supported_formats)))
            noise_filter_size = float(request.data.get('noise_filter_size', 2))

            current_dir = os.path.dirname(os.path.abspath(__file__))
            context.add_param('dsm', dsm)
            context.add_param('interval', interval)
            context.add_param('format', format)
            context.add_param('noise_filter_size', noise_filter_size)
            context.add_param('epsg', epsg)

            if dtm != None:
                context.add_param('dtm', dtm)

            context.set_location(dsm)

            celery_task_id = execute_grass_script.delay(os.path.join(current_dir, "elevationmap.py"), context.serialize()).task_id

            return Response({'celery_task_id': celery_task_id}, status=status.HTTP_200_OK)
        except GrassEngineException as e:
            return Response({'error': str(e)}, status=status.HTTP_200_OK)

class TaskElevationMapCheck(TaskView):
    def get(self, request, pk=None, celery_task_id=None):
        res = celery.AsyncResult(celery_task_id)
        if not res.ready():
            return Response({'ready': False}, status=status.HTTP_200_OK)
        else:
            result = res.get()
            if result.get('error', None) is not None:
                cleanup_grass_context(result['context'])
                return Response({'ready': True, 'error': result['error']})

            output = result.get('output')
            if not output or not os.path.exists(output):
                cleanup_grass_context(result['context'])
                return Response({'ready': True, 'error': output})

            request.session['elevation_map_' + celery_task_id] = output
            return Response({'ready': True})


class TaskElevationMapDownload(TaskView):
    def get(self, request, pk=None, celery_task_id=None):
        elevation_map_file = request.session.get('elevation_map_' + celery_task_id, None)

        if elevation_map_file is not None:
            filename = os.path.basename(elevation_map_file)
            filesize = os.stat(elevation_map_file).st_size

            f = open(elevation_map_file, "rb")

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
            return Response({'error': 'Invalid elevation_map download id'})
