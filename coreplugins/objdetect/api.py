import os
import json
from rest_framework import status
from rest_framework.response import Response
from app.plugins.views import TaskView, CheckTask, GetTaskResult, TaskResultOutputError
from app.plugins.worker import run_function_async
from django.utils.translation import gettext_lazy as _

def detect(orthophoto, model):
    import os
    from webodm import settings

    try:
        from geodeep import detect as gdetect, models
        models.cache_dir = os.path.join(settings.MEDIA_ROOT, "CACHE", "detection_models")
    except ImportError:
        return {'error': "GeoDeep library is missing"}

    try:
         return {'output': gdetect(orthophoto, model, output_type='geojson')}
    except Exception as e:
        return {'error': str(e)}
     
class TaskObjDetect(TaskView):
    def post(self, request, pk=None):
        task = self.get_and_check_task(request, pk)

        if task.orthophoto_extent is None:
            return Response({'error': _('No orthophoto is available.')})

        orthophoto = os.path.abspath(task.get_asset_download_path("orthophoto.tif"))
        model = request.data.get('model', 'cars')

        if not model in ['cars', 'trees']:
            return Response({'error': 'Invalid model'}, status=status.HTTP_200_OK)

        celery_task_id = run_function_async(detect, orthophoto, model).task_id
        return Response({'celery_task_id': celery_task_id}, status=status.HTTP_200_OK)

class TaskObjCheck(CheckTask):
    pass

class TaskObjDownload(GetTaskResult):
    def handle_output(self, output, result, **kwargs):
        try:
            return json.loads(output)
        except:
            raise TaskResultOutputError("Invalid GeoJSON")
