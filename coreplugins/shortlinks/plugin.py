from app.plugins import PluginBase, Menu, MountPoint
from django.shortcuts import render
from django.contrib.auth.decorators import login_required
from django.utils.translation import gettext as _
from .api import GetShortLink, HandleShortLink

class Plugin(PluginBase):
    def build_jsx_components(self):
        return ['SLCheckbox.jsx']
    
    def include_js_files(self):
        return ['main.js']

    def root_mount_points(self):
        return [
            MountPoint(r'^s(?P<view_type>[m3])(?P<short_id>[a-z0-9]+)/?$', HandleShortLink)
        ]

    def api_mount_points(self):
        return [
            MountPoint('task/(?P<pk>[^/.]+)/shortlink', GetShortLink.as_view()),
        ]

