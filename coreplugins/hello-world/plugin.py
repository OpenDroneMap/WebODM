from app.plugins import PluginBase, Menu, MountPoint
from django.shortcuts import render
from django.contrib.auth.decorators import login_required
from django.utils.translation import gettext as _



class Plugin(PluginBase):
    def main_menu(self):
        return [Menu(_("Hello World"), self.public_url(""), "fa fa-cog fa-fw")]

    def app_mount_points(self):
        @login_required
        def hello_view(request):
            return render(request, self.template_path("hello.html"), {'message': "Hello!"})

        return [
            MountPoint('$', hello_view),
            # more mount points here ...
        ]
    
    def include_js_files(self):
        return ['main.js']
    
    def build_jsx_components(self):
        return ['app.jsx']

    # see also plugin_base.py for more methods
