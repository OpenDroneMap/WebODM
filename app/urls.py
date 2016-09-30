from django.conf.urls import url, include
from . import views, models
from django.contrib.auth.models import User
from rest_framework import routers, serializers, viewsets

class ProjectSerializer(serializers.HyperlinkedModelSerializer):
    owner = serializers.PrimaryKeyRelatedField(queryset=User.objects.all())

    class Meta:
        model = models.Project


class ProjectViewSet(viewsets.ModelViewSet):
    queryset = models.Project.objects.all()
    serializer_class = ProjectSerializer

# Routers provide an easy way of automatically determining the URL conf.
router = routers.DefaultRouter()
router.register(r'projects', ProjectViewSet)

urlpatterns = [
    url(r'^$', views.index, name='index'),
    url(r'^dashboard/$', views.dashboard, name='dashboard'),
    url(r'^processingnode/([\d]+)/$', views.processing_node, name='processing_node'),

    url(r'^api/', include(router.urls)),
    url(r'^api/auth/', include('rest_framework.urls')),
]