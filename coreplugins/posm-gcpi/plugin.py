from django.contrib.auth.decorators import login_required
from django.shortcuts import render
from django.utils.translation import gettext as _

from app.plugins import Menu, MountPoint, PluginBase


class Plugin(PluginBase):

    def main_menu(self):
        return [Menu(_("GCP Interface"), self.public_url(""), "fa fa-map-marker-alt fa-fw")]

    def app_mount_points(self):
        @login_required
        def gcpi(request):
            return render(request, self.template_path("app.html"), {'title': 'GCP Editor'})

        return [
            MountPoint('$', gcpi)
        ]


