import os

from rest_framework import status
from rest_framework.response import Response
from app.plugins.views import TaskView, CheckTask, GetTaskResult
from worker.tasks import execute_grass_script
from app.plugins.grass_engine import grass, GrassEngineException, cleanup_grass_context

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
            context.set_location(dem)

            celery_task_id = execute_grass_script.delay(os.path.join(
                os.path.dirname(os.path.abspath(__file__)),
                "calc_contours.py"
            ), context.serialize(), 'file').task_id

            return Response({'celery_task_id': celery_task_id}, status=status.HTTP_200_OK)
        except GrassEngineException as e:
            return Response({'error': str(e)}, status=status.HTTP_200_OK)

class TaskContoursCheck(CheckTask):
    def on_error(self, result):
        cleanup_grass_context(result['context'])

    def error_check(self, result):
        contours_file = result.get('file')
        if not contours_file or not os.path.exists(contours_file):
            return 'Contours file could not be generated. This might be a bug.'

class TaskContoursDownload(GetTaskResult):
    pass
