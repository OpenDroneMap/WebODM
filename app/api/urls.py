from django.conf.urls import url, include
from .projects import ProjectViewSet
from rest_framework import routers

router = routers.DefaultRouter()
router.register(r'projects', ProjectViewSet)

urlpatterns = [
    url(r'^', include(router.urls)),
    url(r'^auth/', include('rest_framework.urls')),
]