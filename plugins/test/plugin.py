from app.plugins import PluginBase, Menu, MountPoint
from django.shortcuts import render

class Plugin(PluginBase):

    def main_menu(self):
        return [Menu("Test", self.public_url("menu_url/"), "test-icon")]

    def include_js_files(self):
    	return ['test.js']

    def include_css_files(self):
    	return ['test.css']

    def mount_points(self):
        return [
            MountPoint('/app_mountpoint/$', lambda request: render(request, self.template_path("app.html"), {'title': 'Test'}))
        ]


