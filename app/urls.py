from django.conf.urls import url, include
from . import views

urlpatterns = [
    url(r'^$', views.index, name='index'),
    url(r'^dashboard/$', views.dashboard, name='dashboard'),
    url(r'^processingnode/([\d]+)/$', views.processing_node, name='processing_node'),

    url(r'^api/', include("app.api.urls")),
]