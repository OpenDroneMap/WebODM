import re
import json

from app.plugins import PluginBase, Menu, MountPoint, logger

from .globals import PROJECT_NAME
from .api_views import ShareTaskView, RefreshIonTaskView, ClearErrorsTaskView
from .app_views import HomeView, LoadButtonView


class Plugin(PluginBase):
    def __init__(self, *args, **kwargs):
        super().__init__(*args, **kwargs)
        self.name = PROJECT_NAME

    def main_menu(self):
        return [Menu("Cesium Ion", self.public_url(""), "fa-cesium fa fa-fw")]

    def include_js_files(self):
        return ["load_buttons.js"]

    def include_css_files(self):
        return ["font.css", "build/TaskView.css"]

    def build_jsx_components(self):
        return ["TaskView.jsx"]

    def api_mount_points(self):
        return [
            MountPoint("task/(?P<pk>[^/.]+)/share", ShareTaskView.as_view()),
            MountPoint("task/(?P<pk>[^/.]+)/refresh", RefreshIonTaskView.as_view()),
            MountPoint("task/(?P<pk>[^/.]+)/clear", ClearErrorsTaskView.as_view()),
        ]

    def app_mount_points(self):
        return [
            MountPoint("$", HomeView(self)),
            MountPoint("load_buttons.js$", LoadButtonView(self)),
        ]
