from app.plugins import PluginBase, Menu, MountPoint, logger

from .api_views import PlatformsTaskView, PlatformsVerifyTaskView, ImportFolderTaskView, CheckUrlTaskView
from .app_views import HomeView, LoadButtonsView
from .platform_helper import get_all_extended_platforms


class Plugin(PluginBase):
    def __init__(self, *args, **kwargs):
        super().__init__(*args, **kwargs)

    def main_menu(self):
        return [Menu("Cloud Import", self.public_url(""), "fa-cloud-download-alt fa fa-fw")]

    def include_js_files(self):
        return ["load_buttons.js"]

    def include_css_files(self):
        return ["build/ImportView.css", "build/TaskView.css"]

    def build_jsx_components(self):
        return ["ImportView.jsx", "TaskView.jsx"]

    def api_mount_points(self):
        api_views = [api_view for platform in get_all_extended_platforms() for api_view in platform.get_api_views()]
        mount_points = [MountPoint(path, view) for (path, view) in api_views]
        # Add mount points for each extended platform that might require us to do so

        return mount_points + [
            MountPoint("projects/(?P<project_pk>[^/.]+)/tasks/(?P<pk>[^/.]+)/import", ImportFolderTaskView.as_view()),
            MountPoint("projects/(?P<project_pk>[^/.]+)/tasks/(?P<pk>[^/.]+)/checkforurl", CheckUrlTaskView.as_view()),
            MountPoint("platforms/(?P<platform_name>[^/.]+)/verify", PlatformsVerifyTaskView.as_view()),
            MountPoint("platforms", PlatformsTaskView.as_view()),
        ]

    def app_mount_points(self):
        return [
            MountPoint("$", HomeView(self)),
            MountPoint("load_buttons.js$", LoadButtonsView(self)),
        ]
