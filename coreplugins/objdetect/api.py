import os
import json
from rest_framework import status
from rest_framework.response import Response
from app.plugins.views import TaskView, GetTaskResult, TaskResultOutputError
from app.plugins.worker import run_function_async
from django.utils.translation import gettext_lazy as _

def detect(orthophoto, model, classes=None, progress_callback=None):
    import os
    from webodm import settings

    try:
        from geodeep import detect as gdetect, models
        models.cache_dir = os.path.join(settings.MEDIA_ROOT, "CACHE", "detection_models")
    except ImportError:
        return {'error': "GeoDeep library is missing"}

    try:
        return {'output': gdetect(orthophoto, model, output_type='geojson', classes=classes, max_threads=settings.WORKERS_MAX_THREADS, progress_callback=progress_callback)}
    except Exception as e:
        return {'error': str(e)}
     
class TaskObjDetect(TaskView):
    def post(self, request, pk=None):
        task = self.get_and_check_task(request, pk)

        if task.orthophoto_extent is None:
            return Response({'error': _('No orthophoto is available.')})

        orthophoto = os.path.abspath(task.get_asset_download_path("orthophoto.tif"))
        model = request.data.get('model', 'cars')

        # model --> (modelID, classes)
        model_map = {
            'cars': ('cars', None),
            'trees': ('trees', None),
            'athletic': ('aerovision', ['tennis-court', 'track-field', 'soccer-field', 'baseball-field', 'swimming-pool', 'basketball-court']),
            'boats': ('aerovision', ['boat']),
            'planes': ('aerovision', ['plane']),
        }

        if not model in model_map:
            return Response({'error': 'Invalid model'}, status=status.HTTP_200_OK)

        model_id, classes = model_map[model]
        celery_task_id = run_function_async(detect, orthophoto, model_id, classes, with_progress=True).task_id

        return Response({'celery_task_id': celery_task_id}, status=status.HTTP_200_OK)

class TaskObjDownload(GetTaskResult):
    def handle_output(self, output, result, **kwargs):
        try:
            return json.loads(output)
        except:
            raise TaskResultOutputError("Invalid GeoJSON")
