from django.conf.urls import url, include
from rest_framework_swagger.views import get_swagger_view

from . import views
from app.boot import boot
from webodm import settings

urlpatterns = [
    url(r'^$', views.index, name='index'),
    url(r'^dashboard/$', views.dashboard, name='dashboard'),
    url(r'^map/project/(?P<project_pk>[^/.]+)/task/(?P<task_pk>[^/.]+)/$', views.map, name='map'),
    url(r'^map/project/(?P<project_pk>[^/.]+)/$', views.map, name='map'),
    url(r'^3d/project/(?P<project_pk>[^/.]+)/task/(?P<task_pk>[^/.]+)/$', views.model_display, name='model_display'),

    url(r'^processingnode/([\d]+)/$', views.processing_node, name='processing_node'),

    url(r'^api/', include("app.api.urls")),
    url(r'^apiviewer/', get_swagger_view(title='WebODM API'))
]

# Test cases call boot() independently
if not settings.TESTING:
    boot()