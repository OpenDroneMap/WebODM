from app.plugins import PluginBase
from app.plugins import MountPoint
from .api import TaskChangeMapGenerate
from .api import TaskChangeMapCheck
from .api import TaskChangeMapDownload

class Plugin(PluginBase):
    def include_js_files(self):
        return ['main.js']

    def build_jsx_components(self):
        return ['ChangeDetection.jsx']

    def api_mount_points(self):
        return [
            MountPoint('task/(?P<pk>[^/.]+)/changedetection/generate', TaskChangeMapGenerate.as_view()),
            MountPoint('task/(?P<pk>[^/.]+)/changedetection/check/(?P<celery_task_id>.+)', TaskChangeMapCheck.as_view()),
            MountPoint('task/(?P<pk>[^/.]+)/changedetection/download/(?P<celery_task_id>.+)', TaskChangeMapDownload.as_view()),
        ]
