from app.plugins import PluginBase, Menu, MountPoint
from django.shortcuts import render
from django.contrib.auth.decorators import login_required

class Plugin(PluginBase):
    def main_menu(self):
        return [Menu("Lightning Network", self.public_url(""), "fa fa-bolt fa-fw")]

    def app_mount_points(self):
        @login_required
        def main(request):
            return render(request, self.template_path("index.html"), {'title': 'Lightning Network'})

        return [
            MountPoint('$', main)
        ]


