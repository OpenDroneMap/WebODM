from django.http import HttpResponse

from app.plugins import PluginBase, Menu, MountPoint, UserDataStore
from django.shortcuts import render
from django.contrib.auth.decorators import login_required
from django.views.decorators.http import require_POST

class Plugin(PluginBase):
    def main_menu(self):
        return [Menu("Lightning Network", self.public_url(""), "fa fa-bolt fa-fw")]

    def app_mount_points(self):
        @login_required
        def main(request):
            ds = UserDataStore('lightning', request.user)

            return render(request, self.template_path("index.html"), {
                'title': 'Lightning Network',
                'api_key': ds.get_string("api_key")
            })

        @login_required
        @require_POST
        def save_api_key(request):

            api_key = request.POST.get('api_key')
            if api_key is None:
                return HttpResponse({'error': 'api_key is required'}, content_type='application/json')

            ds = UserDataStore('lightning', request.user)
            ds.set_string('api_key', api_key)

            return HttpResponse({'success': True}, content_type='application/json')

        return [
            MountPoint('$', main),
            MountPoint('save_api_key$', save_api_key)
        ]


