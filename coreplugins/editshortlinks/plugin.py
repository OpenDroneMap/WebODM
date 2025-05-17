from app.plugins import MountPoint, PluginBase

from .api import DeleteShortLink, EditShortLink, GetShortLink, HandleShortLink


class Plugin(PluginBase):
    def build_jsx_components(self):
        return ['SLControls.jsx']
    
    def include_js_files(self):
        return ['main.js']

    def root_mount_points(self):
        return [
            MountPoint(r'^s(?P<view_type>[m3])/(?P<username>[^/]+)/(?P<short_id>[A-Za-z0-9_-]+)/?$', HandleShortLink)
        ]

    def api_mount_points(self):
        return [
            MountPoint('task/(?P<pk>[^/.]+)/shortlink', GetShortLink.as_view()),
            MountPoint('task/(?P<pk>[^/.]+)/edit', EditShortLink.as_view()),
            MountPoint('task/(?P<pk>[^/.]+)/delete', DeleteShortLink.as_view())
        ]

