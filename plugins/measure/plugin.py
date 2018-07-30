from app.plugins import MountPoint
from app.plugins import PluginBase
from .api import TaskVolume

class Plugin(PluginBase):
    def include_js_files(self):
        return ['main.js']

    def build_jsx_components(self):
        return ['app.jsx']

    def api_mount_points(self):
        return [
            MountPoint('task/(?P<pk>[^/.]+)/volume', TaskVolume.as_view())
        ]
