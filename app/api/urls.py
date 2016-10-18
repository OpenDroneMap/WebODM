from django.conf.urls import url, include
from .projects import ProjectViewSet
from .tasks import TaskViewSet
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

    url(r'^auth/', include('rest_framework.urls')),
]