from django.conf.urls import url, include
from .projects import ProjectViewSet
from .tasks import TaskViewSet, TaskTiles, TaskTilesJson, TaskAssets
from .processingnodes import ProcessingNodeViewSet
from rest_framework_nested import routers

router = routers.DefaultRouter()
router.register(r'projects', ProjectViewSet)
router.register(r'processingnodes', ProcessingNodeViewSet)

tasks_router = routers.NestedSimpleRouter(router, r'projects', lookup='project')
tasks_router.register(r'tasks', TaskViewSet, base_name='projects-tasks')

urlpatterns = [
    url(r'^', include(router.urls)),
    url(r'^', include(tasks_router.urls)),

    url(r'projects/(?P<project_pk>[^/.]+)/tasks/(?P<pk>[^/.]+)/tiles/(?P<z>[\d]+)/(?P<x>[\d]+)/(?P<y>[\d]+)\.png$', TaskTiles.as_view()),
    url(r'projects/(?P<project_pk>[^/.]+)/tasks/(?P<pk>[^/.]+)/tiles\.json$', TaskTilesJson.as_view()),
    url(r'projects/(?P<project_pk>[^/.]+)/tasks/(?P<pk>[^/.]+)/download/(?P<asset>[^/.]+)/$', TaskAssets.as_view()),

    url(r'^auth/', include('rest_framework.urls')),
]