from django.conf.urls import url, include
from . import views
from app.boot import boot
from webodm import settings

urlpatterns = [
    url(r'^$', views.index, name='index'),
    url(r'^dashboard/$', views.dashboard, name='dashboard'),
    url(r'^map/$', views.map, name='map'),
    url(r'^processingnode/([\d]+)/$', views.processing_node, name='processing_node'),

    url(r'^api/', include("app.api.urls")),
]

# Test cases call boot() independently
if not settings.TESTING:
    boot()