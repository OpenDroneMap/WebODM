from app.plugins import MountPoint, PluginBase

from .api import TaskVolume, TaskVolumeResult


class Plugin(PluginBase):
    def include_js_files(self):
        return ['main.js']

    def build_jsx_components(self):
        return ['app.jsx']

    def api_mount_points(self):
        return [
            MountPoint('task/(?P<pk>[^/.]+)/volume$', TaskVolume.as_view()),
            MountPoint('task/(?P<pk>[^/.]+)/volume/get/(?P<celery_task_id>.+)$', TaskVolumeResult.as_view()),
        ]
