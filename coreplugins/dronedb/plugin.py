from app.plugins import PluginBase, Menu, MountPoint, logger

from .api_views import ImportDatasetTaskView, CheckUrlTaskView
#from .app_views import HomeView, LoadButtonsView
#from .platform_helper import get_all_extended_platforms
from django.contrib import messages
from django.shortcuts import render
from django.contrib.auth.decorators import login_required
from django import forms

class SettingsForm(forms.Form):
    registry_url = forms.CharField(label='Registry Url', required=False, max_length=1024, widget=forms.TextInput(attrs={'placeholder': 'Registry Url'}))
    username = forms.CharField(label='Username', required=False, max_length=1024, widget=forms.TextInput(attrs={'placeholder': 'Username'}))
    password = forms.CharField(label='Password', required=False, max_length=1024, widget=forms.PasswordInput(attrs={'placeholder': 'Password'}))

class Plugin(PluginBase):
    def __init__(self, *args, **kwargs):
        super().__init__(*args, **kwargs)

    def main_menu(self):
        return [Menu("DroneDB", self.public_url(""), "fas fa-cloud fa-fw")]

    def include_js_files(self):
        return ["load_buttons.js"]

    def include_css_files(self):
        return ["build/ImportView.css", "build/TaskView.css"]

    def build_jsx_components(self):
        return ["ImportView.jsx", "TaskView.jsx"]

    def api_mount_points(self):
        #api_views = [api_view for platform in get_all_extended_platforms() for api_view in platform.get_api_views()]
        # mount_points = [MountPoint(path, view) for (path, view) in api_views]
        # Add mount points for each extended platform that might require us to do so

        return [
            MountPoint("projects/(?P<project_pk>[^/.]+)/tasks/(?P<pk>[^/.]+)/import", ImportDatasetTaskView.as_view()),
            MountPoint("projects/(?P<project_pk>[^/.]+)/tasks/(?P<pk>[^/.]+)/checkforurl", CheckUrlTaskView.as_view()),
            MountPoint("platforms/(?P<platform_name>[^/.]+)/verify", PlatformsVerifyTaskView.as_view()),
            MountPoint("platforms", PlatformsTaskView.as_view()),
        ] 

    def HomeView(self):
        @login_required
        def home(request):
            ds = self.get_user_data_store(request.user)

            # if this is a POST request we need to process the form data
            if request.method == 'POST':
                form = SettingsForm(request.POST)
                if form.is_valid():
                    ds.set_string('registry_url', form.cleaned_data['registry_url'])
                    ds.set_string('username', form.cleaned_data['username'])
                    ds.set_string('password', form.cleaned_data['password'])
                    messages.success(request, 'Settings updated.')

            form = SettingsForm(initial={'username': ds.get_string('username', default=""), 
                                         'password': ds.get_string('password', default=""), 
                                         'registry_url': ds.get_string('registry_url', default="https://hub.dronedb.app")})

            return render(request, self.template_path("app.html"), {
                'title': 'DroneDB',
                'form': form
            })

        return home
    
    def app_mount_points(self):
        return [
            MountPoint("$", self.HomeView()),
            MountPoint("load_buttons.js$", LoadButtonsView(self)),
        ]