from django.urls import include, re_path, path

from app.api.presets import PresetViewSet
from app.plugins.views import api_view_handler
from .projects import ProjectViewSet
from .tasks import TaskViewSet, TaskDownloads, TaskAssets, TaskBackup, TaskAssetsImport
from .imageuploads import Thumbnail, ImageDownload
from .processingnodes import ProcessingNodeViewSet, ProcessingNodeOptionsView
from .admin import AdminUserViewSet, AdminGroupViewSet, AdminProfileViewSet
from rest_framework_nested import routers
from rest_framework_simplejwt.views import TokenObtainPairView, TokenRefreshView

from .tiler import TileJson, Bounds, Metadata, Tiles, Export
from .potree import Scene, CameraView
from .workers import CheckTask, GetTaskResult
from .users import UsersList
from .externalauth import ExternalTokenAuth
from webodm import settings

router = routers.DefaultRouter()
router.register(r'projects', ProjectViewSet)
router.register(r'processingnodes', ProcessingNodeViewSet)
router.register(r'presets', PresetViewSet, basename='presets')

tasks_router = routers.NestedSimpleRouter(router, r'projects', lookup='project')
tasks_router.register(r'tasks', TaskViewSet, basename='projects-tasks')

admin_router = routers.DefaultRouter()
admin_router.register(r'admin/users', AdminUserViewSet, basename='admin-users')
admin_router.register(r'admin/groups', AdminGroupViewSet, basename='admin-groups')
admin_router.register(r'admin/profiles', AdminProfileViewSet, basename='admin-profiles')

urlpatterns = [
    re_path(r'processingnodes/options/$', ProcessingNodeOptionsView.as_view()),

    re_path(r'^', include(router.urls)),
    re_path(r'^', include(tasks_router.urls)),
    re_path(r'^', include(admin_router.urls)),

    re_path('projects/(?P<project_pk>[^/.]+)/tasks/(?P<pk>[^/.]+)/(?P<tile_type>orthophoto|dsm|dtm)/tiles\.json', TileJson.as_view()),
    re_path('projects/(?P<project_pk>[^/.]+)/tasks/(?P<pk>[^/.]+)/(?P<tile_type>orthophoto|dsm|dtm)/bounds', Bounds.as_view()),
    re_path('projects/(?P<project_pk>[^/.]+)/tasks/(?P<pk>[^/.]+)/(?P<tile_type>orthophoto|dsm|dtm)/metadata', Metadata.as_view()),
    re_path('projects/(?P<project_pk>[^/.]+)/tasks/(?P<pk>[^/.]+)/(?P<tile_type>orthophoto|dsm|dtm)/tiles/(?P<z>[\d]+)/(?P<x>[\d]+)/(?P<y>[\d]+)\.?(?P<ext>png|jpg|webp)?', Tiles.as_view()),
    re_path('projects/(?P<project_pk>[^/.]+)/tasks/(?P<pk>[^/.]+)/(?P<tile_type>orthophoto|dsm|dtm)/tiles/(?P<z>[\d]+)/(?P<x>[\d]+)/(?P<y>[\d]+)@(?P<scale>[\d]+)x\.?(?P<ext>png|jpg|webp)?', Tiles.as_view()),
    re_path('projects/(?P<project_pk>[^/.]+)/tasks/(?P<pk>[^/.]+)/(?P<asset_type>orthophoto|dsm|dtm|georeferenced_model)/export', Export.as_view()),

    re_path(r'projects/(?P<project_pk>[^/.]+)/tasks/(?P<pk>[^/.]+)/download/(?P<asset>.+)$', TaskDownloads.as_view()),
    re_path(r'projects/(?P<project_pk>[^/.]+)/tasks/(?P<pk>[^/.]+)/assets/(?P<unsafe_asset_path>.+)$', TaskAssets.as_view()),
    re_path(r'projects/(?P<project_pk>[^/.]+)/tasks/import$', TaskAssetsImport.as_view()),
    re_path(r'projects/(?P<project_pk>[^/.]+)/tasks/(?P<pk>[^/.]+)/backup$', TaskBackup.as_view()),
    re_path(r'projects/(?P<project_pk>[^/.]+)/tasks/(?P<pk>[^/.]+)/images/thumbnail/(?P<image_filename>.+)$', Thumbnail.as_view()),
    re_path(r'projects/(?P<project_pk>[^/.]+)/tasks/(?P<pk>[^/.]+)/images/download/(?P<image_filename>.+)$', ImageDownload.as_view()),

    re_path(r'projects/(?P<project_pk>[^/.]+)/tasks/(?P<pk>[^/.]+)/3d/scene$', Scene.as_view()),
    re_path(r'projects/(?P<project_pk>[^/.]+)/tasks/(?P<pk>[^/.]+)/3d/cameraview$', CameraView.as_view()),

    re_path(r'workers/check/(?P<celery_task_id>.+)', CheckTask.as_view()),
    re_path(r'workers/get/(?P<celery_task_id>.+)', GetTaskResult.as_view()),

    path(r'auth', include('rest_framework.urls')),

    re_path('plugins/(?P<plugin_name>[^/.]+)/(.*)', api_view_handler),
]

if settings.ENABLE_USERS_API:
    urlpatterns.append(path(r'users', UsersList.as_view()))

if settings.EXTERNAL_AUTH_ENDPOINT != '':
    urlpatterns.append(path(r'external-token-auth', ExternalTokenAuth.as_view()))

