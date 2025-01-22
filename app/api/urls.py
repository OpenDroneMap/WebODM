from django.urls import re_path, include

from app.api.presets import PresetViewSet
from app.plugins.views import api_view_handler
from .projects import ProjectViewSet
from .tasks import TaskViewSet, TaskDownloads, TaskAssets, TaskAssetsImport
from .tasks_ai import TaskAiDetectionCattle, TaskAiDetectionWeed,TaskAiDetectionField
from .imageuploads import Thumbnail, ImageDownload
from .processingnodes import ProcessingNodeViewSet, ProcessingNodeOptionsView
from .admin import AdminUserViewSet, AdminGroupViewSet, AdminProfileViewSet
from rest_framework_nested import routers
from rest_framework_jwt.views import obtain_jwt_token
from .tiler import TileJson, Bounds, Metadata, Tiles, Export
from .potree import Scene, CameraView
from .workers import CheckTask, GetTaskResult
from .users import UsersList
from .externalauth import ExternalTokenAuth
from .ai import AiProcessing
from .geojson import SaveGeoJson
from .process_status import GetProcess
from .spray_lines import SprayLinesProcessing
from .spray_lines_export import SprayLinesExport
from .polinomial_health import PolinomialHealthProcessing
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
admin_router.register(r'admin/profiles', AdminProfileViewSet, basename='admin-groups')

urlpatterns = [
    re_path(r'processingnodes/options/$', ProcessingNodeOptionsView.as_view()),

    re_path(r'^', include(router.urls)),
    re_path(r'^', include(tasks_router.urls)),
    re_path(r'^', include(admin_router.urls)),

    re_path(r'projects/(?P<project_pk>[^/.]+)/tasks/(?P<pk>[^/.]+)/(?P<tile_type>polyhealth|orthophoto|dsm|dtm)/tiles\.json$', TileJson.as_view()),
    re_path(r'projects/(?P<project_pk>[^/.]+)/tasks/(?P<pk>[^/.]+)/(?P<tile_type>polyhealth|orthophoto|dsm|dtm)/bounds$', Bounds.as_view()),
    re_path(r'projects/(?P<project_pk>[^/.]+)/tasks/(?P<pk>[^/.]+)/(?P<tile_type>polyhealth|orthophoto|dsm|dtm)/metadata$', Metadata.as_view()),
    re_path(r'projects/(?P<project_pk>[^/.]+)/tasks/(?P<pk>[^/.]+)/(?P<tile_type>polyhealth|orthophoto|dsm|dtm)/tiles/(?P<z>[\d]+)/(?P<x>[\d]+)/(?P<y>[\d]+)\.?(?P<ext>png|jpg|webp)?$', Tiles.as_view()),
    re_path(r'projects/(?P<project_pk>[^/.]+)/tasks/(?P<pk>[^/.]+)/(?P<tile_type>polyhealth|orthophoto|dsm|dtm)/tiles/(?P<z>[\d]+)/(?P<x>[\d]+)/(?P<y>[\d]+)@(?P<scale>[\d]+)x\.?(?P<ext>png|jpg|webp)?$', Tiles.as_view()),
    re_path(r'projects/(?P<project_pk>[^/.]+)/tasks/(?P<pk>[^/.]+)/(?P<asset_type>polyhealth|orthophoto|dsm|dtm|georeferenced_model)/export$', Export.as_view()),

    re_path(r'projects/(?P<project_pk>[^/.]+)/tasks/(?P<pk>[^/.]+)/download/(?P<asset>.+)$', TaskDownloads.as_view()),
    re_path(r'projects/(?P<project_pk>[^/.]+)/tasks/(?P<pk>[^/.]+)/assets/(?P<unsafe_asset_path>.+)$', TaskAssets.as_view()),
    re_path(r'projects/(?P<project_pk>[^/.]+)/tasks/import$', TaskAssetsImport.as_view()),
    re_path(r'projects/(?P<project_pk>[^/.]+)/tasks/(?P<pk>[^/.]+)/images/thumbnail/(?P<image_filename>.+)$', Thumbnail.as_view()),
    re_path(r'projects/(?P<project_pk>[^/.]+)/tasks/(?P<pk>[^/.]+)/images/download/(?P<image_filename>.+)$', ImageDownload.as_view()),

    re_path(r'projects/(?P<project_pk>[^/.]+)/tasks/(?P<pk>[^/.]+)/3d/scene$', Scene.as_view()),
    re_path(r'projects/(?P<project_pk>[^/.]+)/tasks/(?P<pk>[^/.]+)/3d/cameraview$', CameraView.as_view()),

    re_path(r'projects/(?P<project_pk>[^/.]+)/tasks/(?P<pk>[^/.]+)/ai/detections/cattle$', TaskAiDetectionCattle.as_view()),
    re_path(r'projects/(?P<project_pk>[^/.]+)/tasks/(?P<pk>[^/.]+)/ai/detections/(?P<detection_type>soy|corn|cane)$', TaskAiDetectionWeed.as_view()),
    re_path(r'projects/(?P<project_pk>[^/.]+)/tasks/(?P<pk>[^/.]+)/ai/detections/field$', TaskAiDetectionField.as_view()),

    re_path(r'projects/(?P<project_pk>[^/.]+)/tasks/(?P<pk>[^/.]+)/process/spraylines$', SprayLinesProcessing.as_view()),
    re_path(r'projects/(?P<project_pk>[^/.]+)/tasks/(?P<pk>[^/.]+)/process$', AiProcessing.as_view()),

    re_path(r'projects/(?P<project_pk>[^/.]+)/tasks/(?P<pk>[^/.]+)/save/field$', SaveGeoJson.as_view()),

    re_path(r'projects/(?P<project_pk>[^/.]+)/tasks/(?P<pk>[^/.]+)/getProcess$', GetProcess.as_view()),
    re_path(r'projects/(?P<project_pk>[^/.]+)/tasks/(?P<pk>[^/.]+)/export/spraylines$', SprayLinesExport.as_view()),
    
    re_path(r'projects/(?P<project_pk>[^/.]+)/tasks/(?P<pk>[^/.]+)/process/polinomialHealth$', PolinomialHealthProcessing.as_view()),
    
    re_path(r'workers/check/(?P<celery_task_id>.+)', CheckTask.as_view()),
    re_path(r'workers/get/(?P<celery_task_id>.+)', GetTaskResult.as_view()),

    re_path(r'^auth/', include('rest_framework.urls')),
    re_path(r'^token-auth/', obtain_jwt_token),

    re_path(r'^plugins/(?P<plugin_name>[^/.]+)/(.*)$', api_view_handler),
]

if settings.ENABLE_USERS_API:
    urlpatterns.append(re_path(r'users', UsersList.as_view()))

if settings.EXTERNAL_AUTH_ENDPOINT != '':
    urlpatterns.append(re_path(r'^external-token-auth/', ExternalTokenAuth.as_view()))

