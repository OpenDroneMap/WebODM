from app.plugins import PluginBase, Menu, MountPoint
from django.shortcuts import render

class Plugin(PluginBase):

    def main_menu(self):
        return [Menu("GCP Interface", self.public_url(""), "fa fa-map-marker fa-fw")]

    def mount_points(self):
        return [
            MountPoint('$', lambda request: render(request, self.template_path("app.html"), {'title': 'GCP Editor'}))
        ]


