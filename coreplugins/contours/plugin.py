from app.plugins import PluginBase
from app.plugins import MountPoint
from .api import TaskContoursGenerate
from .api import TaskContoursCheck
from .api import TaskContoursDownload


class Plugin(PluginBase):
    def include_js_files(self):
        return ['main.js']
        
    def build_jsx_components(self):
        return ['Contours.jsx']

    def api_mount_points(self):
        return [
            MountPoint('task/(?P<pk>[^/.]+)/contours/generate', TaskContoursGenerate.as_view()),
            MountPoint('task/[^/.]+/contours/check/(?P<celery_task_id>.+)', TaskContoursCheck.as_view()),
            MountPoint('task/[^/.]+/contours/download/(?P<celery_task_id>.+)', TaskContoursDownload.as_view()),
        ]