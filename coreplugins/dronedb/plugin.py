from app.plugins import PluginBase, Menu, MountPoint, logger
from coreplugins.dronedb.app_views import LoadButtonsView
from coreplugins.dronedb.ddb import DEFAULT_HUB_URL

from .api_views import (
    CheckUrlTaskView, 
    FoldersTaskView, 
    ImportDatasetTaskView, 
    CheckCredentialsTaskView, 
    OrganizationsTaskView, 
    DatasetsTaskView, 
    StatusTaskView, 
    VerifyUrlTaskView, 
    InfoTaskView,
    ShareTaskView
)

from django.contrib import messages
from django.shortcuts import render
from django.contrib.auth.decorators import login_required
from django import forms

class SettingsForm(forms.Form):
    username = forms.CharField(label='Username', required=False, max_length=1024, widget=forms.TextInput(attrs={'placeholder': 'Username'}))
    password = forms.CharField(label='Password', required=False, max_length=1024, widget=forms.PasswordInput(attrs={'placeholder': 'Password'}))
    registry_url = forms.CharField(label='Registry URL', required=False, max_length=1024, widget=forms.TextInput(attrs={'placeholder': 'Registry Url'}))

class Plugin(PluginBase):
    def __init__(self, *args, **kwargs):
        super().__init__(*args, **kwargs)

    def main_menu(self):
        return [Menu("DroneDB", self.public_url(""), "ddb-icon fa-fw")]

    def include_js_files(self):
        return ["load_buttons.js"]

    def include_css_files(self):
        return ["build/ImportView.css", "style.css"]

    def build_jsx_components(self):
        return ["ImportView.jsx", "ShareButton.jsx"]

    def api_mount_points(self):
        return [
            MountPoint("projects/(?P<project_pk>[^/.]+)/tasks/(?P<pk>[^/.]+)/import", ImportDatasetTaskView.as_view()),
            MountPoint("projects/(?P<project_pk>[^/.]+)/tasks/(?P<pk>[^/.]+)/checkforurl", CheckUrlTaskView.as_view()),
            MountPoint("tasks/(?P<pk>[^/.]+)/status", StatusTaskView.as_view()),
            MountPoint("tasks/(?P<pk>[^/.]+)/share", ShareTaskView.as_view()),
            MountPoint("checkcredentials", CheckCredentialsTaskView.as_view()),
            MountPoint("organizations/(?P<org>[^/.]+)/datasets/(?P<ds>[^/.]+)/folders", FoldersTaskView.as_view()),
            MountPoint("organizations/(?P<org>[^/.]+)/datasets", DatasetsTaskView.as_view()),
            MountPoint("organizations", OrganizationsTaskView.as_view()),
            MountPoint("verifyurl", VerifyUrlTaskView.as_view()),
            MountPoint("info", InfoTaskView.as_view()),
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
                    ds.set_string('token', None)
                    messages.success(request, 'Settings updated.')

            form = SettingsForm(initial={'username': ds.get_string('username', default=""), 
                                         'password': ds.get_string('password', default=""), 
                                         'registry_url': ds.get_string('registry_url', default="") or DEFAULT_HUB_URL})

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