from app.plugins import MountPoint, PluginBase

from .api import TaskObjDetect, TaskObjDownload


class Plugin(PluginBase):
    def include_js_files(self):
        return ['main.js']
        
    def build_jsx_components(self):
        return ['ObjDetect.jsx']

    def api_mount_points(self):
        return [
            MountPoint('task/(?P<pk>[^/.]+)/detect', TaskObjDetect.as_view()),
            MountPoint('task/[^/.]+/download/(?P<celery_task_id>.+)', TaskObjDownload.as_view()),
        ]