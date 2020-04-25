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

class TaskChangeMapGenerate(TaskView):
    def post(self, request, pk=None):

        role = request.data.get('role', 'reference')
        if role == 'reference':
            reference_pk = pk
            compare_task_pk = request.data.get('other_task', None)
        else:
            reference_pk = request.data.get('other_task', None)
            compare_task_pk = pk

        reference_task = self.get_and_check_task(request, reference_pk)
        if compare_task_pk is None:
            return Response({'error': 'You must select a task to compare to.'}, status=status.HTTP_400_BAD_REQUEST)
        compare_task = self.get_and_check_task(request, compare_task_pk)

        reference_pc = os.path.abspath(reference_task.get_asset_download_path("georeferenced_model.laz"))
        reference_dsm = os.path.abspath(reference_task.get_asset_download_path("dsm.tif"))
        reference_dtm = os.path.abspath(reference_task.get_asset_download_path("dtm.tif"))

        compare_pc = os.path.abspath(compare_task.get_asset_download_path("georeferenced_model.laz"))
        compare_dsm = os.path.abspath(compare_task.get_asset_download_path("dsm.tif"))
        compare_dtm = os.path.abspath(compare_task.get_asset_download_path("dtm.tif"))

        plugin = get_current_plugin()

        # We store the aligned DEMs on the persistent folder, to avoid recalculating them in the future
        aligned_dsm = plugin.get_persistent_path("{}_{}_dsm.tif".format(pk, compare_task_pk))
        aligned_dtm = plugin.get_persistent_path("{}_{}_dtm.tif".format(pk, compare_task_pk))

        try:
            context = grass.create_context({'auto_cleanup' : False, 'location': 'epsg:3857', 'python_path': plugin.get_python_packages_path()})
            format = request.data.get('format', 'GPKG')
            epsg = int(request.data.get('epsg', '3857'))
            supported_formats = ['GPKG', 'ESRI Shapefile', 'DXF', 'GeoJSON']
            if not format in supported_formats:
                raise GrassEngineException("Invalid format {} (must be one of: {})".format(format, ",".join(supported_formats)))
            min_area = float(request.data.get('min_area', 40))
            min_height = float(request.data.get('min_height', 5))
            resolution = float(request.data.get('resolution', 0.5))
            display_type = request.data.get('display_type', 'contour')
            can_align_and_rasterize = request.data.get('align', 'false')

            current_dir = os.path.dirname(os.path.abspath(__file__))
            context.add_param('reference_pc', reference_pc)
            context.add_param('compare_pc', compare_pc)
            context.add_param('reference_dsm', reference_dsm)
            context.add_param('reference_dtm', reference_dtm)
            context.add_param('compare_dsm', compare_dsm)
            context.add_param('compare_dtm', compare_dtm)
            context.add_param('aligned_dsm', aligned_dsm)
            context.add_param('aligned_dtm', aligned_dtm)
            context.add_param('format', format)
            context.add_param('epsg', epsg)
            context.add_param('display_type', display_type)
            context.add_param('resolution', resolution)
            context.add_param('min_area', min_area)
            context.add_param('min_height', min_height)
            context.add_param('can_align_and_rasterize', can_align_and_rasterize)

            celery_task_id = execute_grass_script.delay(os.path.join(current_dir, "changedetection.py"), context.serialize()).task_id

            return Response({'celery_task_id': celery_task_id}, status=status.HTTP_200_OK)
        except GrassEngineException as e:
            return Response({'error': str(e)}, status=status.HTTP_200_OK)

class TaskChangeMapCheck(TaskView):
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

            request.session['change_detection_' + celery_task_id] = output
            return Response({'ready': True})


class TaskChangeMapDownload(TaskView):
    def get(self, request, pk=None, celery_task_id=None):
        change_detection_file = request.session.get('change_detection_' + celery_task_id, None)

        if change_detection_file is not None:
            filename = os.path.basename(change_detection_file)
            filesize = os.stat(change_detection_file).st_size

            f = open(change_detection_file, "rb")

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
            return Response({'error': 'Invalid change_detecton download id'})
