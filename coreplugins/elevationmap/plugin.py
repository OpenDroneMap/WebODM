from app.plugins import PluginBase
from app.plugins import MountPoint
from .api import TaskElevationMapGenerate
from .api import TaskElevationMapCheck
from .api import TaskElevationMapDownload

class Plugin(PluginBase):
    def include_js_files(self):
        return ['main.js']
        
    def build_jsx_components(self):
        return ['ElevationMap.jsx']

    def api_mount_points(self):
        return [
            MountPoint('task/(?P<pk>[^/.]+)/elevationmap/generate', TaskElevationMapGenerate.as_view()),
            MountPoint('task/(?P<pk>[^/.]+)/elevationmap/check/(?P<celery_task_id>.+)', TaskElevationMapCheck.as_view()),
            MountPoint('task/(?P<pk>[^/.]+)/elevationmap/download/(?P<celery_task_id>.+)', TaskElevationMapDownload.as_view()),
        ]