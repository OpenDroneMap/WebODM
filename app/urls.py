from django.conf.urls import url, include

from .views import app as app_views, public as public_views
from .plugins.views import app_view_handler

from app.boot import boot
from webodm import settings
from app.plugins import sync_plugin_db

# Test cases call boot() independently
# Also don't execute boot with celery workers
if not settings.WORKER_RUNNING and not settings.TESTING:
    boot()

# During testing, boot() is not called (see above)
# but we need to know which plugins are available to mount the proper
# routes via urlpatterns.
if settings.TESTING:
    sync_plugin_db()

urlpatterns = [
    url(r'^$', app_views.index, name='index'),
    url(r'^welcome/$', app_views.welcome, name='welcome'),
    url(r'^dashboard/$', app_views.dashboard, name='dashboard'),
    url(r'^map/project/(?P<project_pk>[^/.]+)/task/(?P<task_pk>[^/.]+)/$', app_views.map, name='map'),
    url(r'^map/project/(?P<project_pk>[^/.]+)/$', app_views.map, name='map'),
    url(r'^3d/project/(?P<project_pk>[^/.]+)/task/(?P<task_pk>[^/.]+)/$', app_views.model_display, name='model_display'),

    url(r'^public/task/(?P<task_pk>[^/.]+)/map/$', public_views.map, name='public_map'),
    url(r'^public/task/(?P<task_pk>[^/.]+)/iframe/map/$', public_views.map_iframe, name='public_iframe_map'),
    url(r'^public/task/(?P<task_pk>[^/.]+)/3d/$', public_views.model_display, name='public_3d'),
    url(r'^public/task/(?P<task_pk>[^/.]+)/iframe/3d/$', public_views.model_display_iframe, name='public_iframe_3d'),
    url(r'^public/task/(?P<task_pk>[^/.]+)/json/$', public_views.task_json, name='public_json'),

    url(r'^processingnode/([\d]+)/$', app_views.processing_node, name='processing_node'),

    url(r'^api/', include("app.api.urls")),

    url(r'^plugins/(?P<plugin_name>[^/.]+)/(.*)$', app_view_handler)
]

handler404 = app_views.handler404
handler500 = app_views.handler500

