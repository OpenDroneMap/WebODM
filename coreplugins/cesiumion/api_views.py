import sys
import time
import logging
import requests
from os import path
from enum import Enum
from itertools import chain as iter_chain

from app.plugins.views import TaskView
from app.plugins.worker import run_function_async
from app.plugins.data_store import GlobalDataStore
from app.plugins import signals as plugin_signals

from worker.celery import app
from django.dispatch import receiver
from django.utils.translation import ugettext_lazy as _
from rest_framework.fields import ChoiceField, CharField, JSONField
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import status
from rest_framework import serializers

from .globals import PROJECT_NAME, ION_API_URL
from .uploader import upload_to_ion


pluck = lambda dic, *keys: [dic[k] if k in dic else None for k in keys]


###                        ###
#         API UTILS          #
###                        ###
def get_key_for(task_id, key):
    return "task_{}_{}".format(str(task_id), key)


def del_asset_info(task_id, asset_type, ds=None):
    if ds is None:
        ds = GlobalDataStore(PROJECT_NAME)
    ds.del_key(get_key_for(task_id, asset_type.value))


def set_asset_info(task_id, asset_type, json, ds=None):
    if ds is None:
        ds = GlobalDataStore(PROJECT_NAME)
    return ds.set_json(get_key_for(task_id, asset_type.value), json)


def get_asset_info(task_id, asset_type, default=None, ds=None):
    if default is None:
        default = {
            "id": None,
            "upload": {"progress": 0, "active": False},
            "process": {"progress": 0, "active": False},
            "error": "",
        }
    if ds is None:
        ds = GlobalDataStore(PROJECT_NAME)
    return ds.get_json(get_key_for(task_id, asset_type.value), default)


def is_asset_task(asset_meta):
    is_error = len(asset_meta["error"]) > 0
    return asset_meta["upload"]["active"] or asset_meta["process"]["active"] or is_error


def get_processing_assets(task_id):
    ispc = app.control.inspect()
    ion_tasks = set()
    active = set()
    from uuid import UUID

    for wtask in iter_chain(*ispc.active().values(), *ispc.reserved().values()):
        args = eval(wtask["args"])
        if len(args) < 2:
            continue
        ion_tasks.add((str(args[0]), AssetType[args[1]]))

    for asset_type in AssetType:
        asset_info = get_asset_info(task_id, asset_type)
        ion_task_id = (task_id, asset_type)
        if not is_asset_task(asset_info) or ion_task_id in ion_tasks:
            continue
        active.add(asset_type)

    return active


###                        ###
#      MODEL CONFIG          #
###                        ###
class AssetType(str, Enum):
    ORTHOPHOTO = "ORTHOPHOTO"
    TERRAIN_MODEL = "TERRAIN_MODEL"
    SURFACE_MODEL = "SURFACE_MODEL"
    POINTCLOUD = "POINTCLOUD"
    TEXTURED_MODEL = "TEXTURED_MODEL"


class SourceType(str, Enum):
    RASTER_IMAGERY = "RASTER_IMAGERY"
    RASTER_TERRAIN = "RASTER_TERRAIN"
    TERRAIN_DATABASE = "TERRAIN_DATABASE"
    CITYGML = "CITYGML"
    KML = "KML"
    CAPTURE = "3D_CAPTURE"
    MODEL = "3D_MODEL"
    POINTCLOUD = "POINT_CLOUD"


class OutputType(str, Enum):
    IMAGERY = "IMAGERY"
    TILES = "3DTILES"
    TERRAIN = "TERRAIN"


ASSET_TO_FILE = {
    AssetType.ORTHOPHOTO: "orthophoto.tif",
    AssetType.TERRAIN_MODEL: "dtm.tif",
    AssetType.SURFACE_MODEL: "dsm.tif",
    AssetType.POINTCLOUD: "georeferenced_model.laz",
    AssetType.TEXTURED_MODEL: "textured_model.zip",
}

FILE_TO_ASSET = dict([reversed(i) for i in ASSET_TO_FILE.items()])

ASSET_TO_OUTPUT = {
    AssetType.ORTHOPHOTO: OutputType.IMAGERY,
    AssetType.TERRAIN_MODEL: OutputType.TERRAIN,
    AssetType.SURFACE_MODEL: OutputType.TERRAIN,
    AssetType.POINTCLOUD: OutputType.TILES,
    AssetType.TEXTURED_MODEL: OutputType.TILES,
}

ASSET_TO_SOURCE = {
    AssetType.ORTHOPHOTO: SourceType.RASTER_IMAGERY,
    AssetType.TERRAIN_MODEL: SourceType.RASTER_TERRAIN,
    AssetType.SURFACE_MODEL: SourceType.RASTER_TERRAIN,
    AssetType.POINTCLOUD: SourceType.POINTCLOUD,
    AssetType.TEXTURED_MODEL: SourceType.CAPTURE,
}

###                        ###
#         RECIEVERS          #
###                        ###
@receiver(plugin_signals.task_removed, dispatch_uid="oam_on_task_removed")
@receiver(plugin_signals.task_completed, dispatch_uid="oam_on_task_completed")
def oam_cleanup(sender, task_id, **kwargs):
    # When a task is removed, simply remove clutter
    # When a task is re-processed, make sure we can re-share it if we shared a task previously
    for asset_type in AssetType:
        del_asset_info(task_id, asset_type)


###                        ###
#         API VIEWS          #
###                        ###
class EnumField(ChoiceField):
    default_error_messages = {"invalid": _("No matching enum type.")}

    def __init__(self, **kwargs):
        self.enum_type = kwargs.pop("enum_type")
        choices = [enum_item.value for enum_item in self.enum_type]
        self.choice_set = set(choices)
        super().__init__(choices, **kwargs)

    def to_internal_value(self, data):
        if data in self.choice_set:
            return self.enum_type[data]
        self.fail("invalid")

    def to_representation(self, value):
        if not value:
            return None
        return value.value


class UploadSerializer(serializers.Serializer):
    token = CharField()
    name = CharField()
    asset_type = EnumField(enum_type=AssetType)
    description = CharField(default="", required=False, allow_blank=True)
    attribution = CharField(default="", required=False, allow_blank=True)
    options = JSONField(default={}, required=False)


class UpdateIonAssets(serializers.Serializer):
    token = CharField()


class ShareTaskView(TaskView):
    def get(self, request, pk=None):
        task = self.get_and_check_task(request, pk)

        assets = []
        for file_name in task.available_assets:
            if file_name not in FILE_TO_ASSET:
                continue
            asset_type = FILE_TO_ASSET[file_name]

            asset_info = get_asset_info(task.id, asset_type)
            ion_id = asset_info["id"]
            is_error = len(asset_info["error"]) > 0
            is_task = is_asset_task(asset_info)
            is_exported = asset_info["id"] is not None and not is_task

            assets.append(
                {
                    "type": asset_type,
                    "isError": is_error,
                    "isTask": is_task,
                    "isExported": is_exported,
                    **asset_info,
                }
            )

        return Response({"items": assets}, status=status.HTTP_200_OK)

    def post(self, request, pk=None):
        task = self.get_and_check_task(request, pk)
        serializer = UploadSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        token, asset_type, name, description, attribution, options = pluck(
            serializer.validated_data,
            "token",
            "asset_type",
            "name",
            "description",
            "attribution",
            "options",
        )
        asset_path = task.get_asset_download_path(ASSET_TO_FILE[asset_type])

        # Skip already processing tasks
        if asset_type not in get_processing_assets(task.id):
            if asset_type == AssetType.TEXTURED_MODEL and "position" not in options:
                extent = None
                if task.dsm_extent is not None:
                    extent = task.dsm_extent.extent
                if task.dtm_extent is not None:
                    extent = task.dtm_extent.extent
                if extent is None:
                    print(f"Unable to find task boundary: {task}")
                else:
                    lng, lat = extent[0], extent[1]
                    # height is set to zero as model is already offset
                    options["position"] = [lng, lat, 0]

            del_asset_info(task.id, asset_type)
            asset_info = get_asset_info(task.id, asset_type)
            asset_info["upload"]["active"] = True
            set_asset_info(task.id, asset_type, asset_info)

            run_function_async(upload_to_ion,
                task.id,
                asset_type,
                token,
                asset_path,
                name,
                description,
                attribution,
                options,
            )
        else:
            print(f"Ignore running ion task {task.id} {str(asset_type)}")

        return Response(status=status.HTTP_200_OK)


class RefreshIonTaskView(TaskView):
    def post(self, request, pk=None):
        serializer = UpdateIonAssets(data=request.data)
        serializer.is_valid(raise_exception=True)

        task = self.get_and_check_task(request, pk)
        token = serializer.validated_data["token"]
        headers = {"Authorization": f"Bearer {token}"}

        is_updated = False
        # ion cleanup check
        for asset_type in AssetType:
            asset_info = get_asset_info(task.id, asset_type)
            ion_id = asset_info["id"]
            if ion_id is None:
                continue
            res = requests.get(f"{ION_API_URL}/assets/{ion_id}", headers=headers)
            if res.status_code != 200:
                del_asset_info(task.id, asset_type)
                is_updated = True

        # dead task cleanup
        for asset_type in get_processing_assets(task.id):
            del_asset_info(task.id, asset_type)
            is_updated = True

        return Response({"updated": is_updated}, status=status.HTTP_200_OK)


class ClearErrorsTaskView(TaskView):
    def post(self, request, pk=None):
        task = self.get_and_check_task(request, pk)
        for asset_type in AssetType:
            asset_info = get_asset_info(task.id, asset_type)
            if len(asset_info["error"]) <= 0:
                continue
            del_asset_info(task.id, asset_type)

        return Response({"complete": True}, status=status.HTTP_200_OK)





