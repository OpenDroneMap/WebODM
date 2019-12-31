from django.conf.urls import url, include

from app.api.presets import PresetViewSet
from app.plugins import get_api_url_patterns
from .projects import ProjectViewSet
from .tasks import TaskViewSet, TaskDownloads, TaskAssets, TaskAssetsImport
from .processingnodes import ProcessingNodeViewSet, ProcessingNodeOptionsView
from .admin import UserViewSet, GroupViewSet
from rest_framework_nested import routers
from rest_framework_jwt.views import obtain_jwt_token
from .tiler import TileJson, Bounds, Metadata, Tiles

router = routers.DefaultRouter()
router.register(r'projects', ProjectViewSet)
router.register(r'processingnodes', ProcessingNodeViewSet)
router.register(r'presets', PresetViewSet, base_name='presets')


tasks_router = routers.NestedSimpleRouter(router, r'projects', lookup='project')
tasks_router.register(r'tasks', TaskViewSet, base_name='projects-tasks')

admin_router = routers.DefaultRouter()
admin_router.register(r'admin/users', UserViewSet, basename='user')
admin_router.register(r'admin/groups', GroupViewSet, basename='group')

urlpatterns = [
    url(r'processingnodes/options/$', ProcessingNodeOptionsView.as_view()),

    url(r'^', include(router.urls)),
    url(r'^', include(tasks_router.urls)),
    url(r'^', include(admin_router.urls)),



    url(r'projects/(?P<project_pk>[^/.]+)/tasks/(?P<pk>[^/.]+)/(?P<tile_type>orthophoto|dsm|dtm)/tiles\.json$', TileJson.as_view()),
    url(r'projects/(?P<project_pk>[^/.]+)/tasks/(?P<pk>[^/.]+)/(?P<tile_type>orthophoto|dsm|dtm)/bounds$', Bounds.as_view()),
    url(r'projects/(?P<project_pk>[^/.]+)/tasks/(?P<pk>[^/.]+)/(?P<tile_type>orthophoto|dsm|dtm)/metadata$', Metadata.as_view()),
    url(r'projects/(?P<project_pk>[^/.]+)/tasks/(?P<pk>[^/.]+)/(?P<tile_type>orthophoto|dsm|dtm)/tiles/(?P<z>[\d]+)/(?P<x>[\d]+)/(?P<y>[\d]+)\.png$', Tiles.as_view()),
    url(r'projects/(?P<project_pk>[^/.]+)/tasks/(?P<pk>[^/.]+)/(?P<tile_type>orthophoto|dsm|dtm)/tiles/(?P<z>[\d]+)/(?P<x>[\d]+)/(?P<y>[\d]+)@(?P<scale>[\d]+)x\.png$', Tiles.as_view()),

    url(r'projects/(?P<project_pk>[^/.]+)/tasks/(?P<pk>[^/.]+)/download/(?P<asset>.+)$', TaskDownloads.as_view()),
    url(r'projects/(?P<project_pk>[^/.]+)/tasks/(?P<pk>[^/.]+)/assets/(?P<unsafe_asset_path>.+)$', TaskAssets.as_view()),
    url(r'projects/(?P<project_pk>[^/.]+)/tasks/import$', TaskAssetsImport.as_view()),

    url(r'^auth/', include('rest_framework.urls')),
    url(r'^token-auth/', obtain_jwt_token),
]

urlpatterns += get_api_url_patterns()
