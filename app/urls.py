from django.conf.urls import url, include

from .views import app as app_views, public as public_views

from app.boot import boot
from webodm import settings

urlpatterns = [
    url(r'^$', app_views.index, name='index'),
    url(r'^welcome/$', app_views.welcome, name='welcome'),
    url(r'^dashboard/$', app_views.dashboard, name='dashboard'),
    url(r'^map/project/(?P<project_pk>[^/.]+)/task/(?P<task_pk>[^/.]+)/$', app_views.map, name='map'),
    url(r'^map/project/(?P<project_pk>[^/.]+)/$', app_views.map, name='map'),
    url(r'^3d/project/(?P<project_pk>[^/.]+)/task/(?P<task_pk>[^/.]+)/$', app_views.model_display, name='model_display'),

    url(r'^public/map/(?P<task_public_uuid>[^/.]+)/$', public_views.map, name='public_map'),

    url(r'^processingnode/([\d]+)/$', app_views.processing_node, name='processing_node'),

    url(r'^api/', include("app.api.urls")),
]

# Test cases call boot() independently
if not settings.TESTING:
    boot()