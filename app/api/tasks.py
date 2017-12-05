import mimetypes
import os

from django.contrib.gis.db.models import GeometryField
from django.contrib.gis.db.models.functions import Envelope
from django.core.exceptions import ObjectDoesNotExist, SuspiciousFileOperation, ValidationError
from django.db import transaction
from django.db.models.functions import Cast
from django.http import HttpResponse
from wsgiref.util import FileWrapper
from rest_framework import status, serializers, viewsets, filters, exceptions, permissions, parsers
from rest_framework.permissions import IsAuthenticatedOrReadOnly
from rest_framework.response import Response
from rest_framework.decorators import detail_route
from rest_framework.views import APIView

from nodeodm import status_codes
from .common import get_and_check_project, get_tile_json, path_traversal_check

from app import models, scheduler, pending_actions
from nodeodm.models import ProcessingNode


class TaskIDsSerializer(serializers.BaseSerializer):
    def to_representation(self, obj):
        return obj.id


class TaskSerializer(serializers.ModelSerializer):
    project = serializers.PrimaryKeyRelatedField(queryset=models.Project.objects.all())
    processing_node = serializers.PrimaryKeyRelatedField(queryset=ProcessingNode.objects.all()) 
    images_count = serializers.SerializerMethodField()

    def get_images_count(self, obj):
        return obj.imageupload_set.count()

    class Meta:
        model = models.Task
        exclude = ('processing_lock', 'console_output', 'orthophoto_extent', 'dsm_extent', 'dtm_extent', )
        read_only_fields = ('processing_time', 'status', 'last_error', 'created_at', 'pending_action', 'available_assets', )

class TaskViewSet(viewsets.ViewSet):
    """
    Task get/add/delete/update
    A task represents a set of images and other input to be sent to a processing node.
    Once a processing node completes processing, results are stored in the task.
    """
    queryset = models.Task.objects.all().defer('orthophoto_extent', 'dsm_extent', 'dtm_extent', 'console_output', )
    
    # We don't use object level permissions on tasks, relying on
    # project's object permissions instead (but standard model permissions still apply)
    permission_classes = (permissions.DjangoModelPermissions, )
    parser_classes = (parsers.MultiPartParser, parsers.JSONParser, parsers.FormParser, )
    ordering_fields = '__all__'

    def set_pending_action(self, pending_action, request, pk=None, project_pk=None, perms=('change_project', )):
        get_and_check_project(request, project_pk, perms)
        try:
            task = self.queryset.get(pk=pk, project=project_pk)
        except (ObjectDoesNotExist, ValidationError):
            raise exceptions.NotFound()

        task.pending_action = pending_action
        task.last_error = None
        task.save()

        # Call the scheduler (speed things up)
        scheduler.process_pending_tasks(background=True)

        return Response({'success': True})

    @detail_route(methods=['post'])
    def cancel(self, *args, **kwargs):
        return self.set_pending_action(pending_actions.CANCEL, *args, **kwargs)

    @detail_route(methods=['post'])
    def restart(self, *args, **kwargs):
        return self.set_pending_action(pending_actions.RESTART, *args, **kwargs)

    @detail_route(methods=['post'])
    def remove(self, *args, **kwargs):
        return self.set_pending_action(pending_actions.REMOVE, *args, perms=('delete_project', ), **kwargs)

    @detail_route(methods=['get'])
    def output(self, request, pk=None, project_pk=None):
        """
        Retrieve the console output for this task.
        An optional "line" query param can be passed to retrieve
        only the output starting from a certain line number.
        """
        get_and_check_project(request, project_pk)
        try:
            task = self.queryset.get(pk=pk, project=project_pk)
        except (ObjectDoesNotExist, ValidationError):
            raise exceptions.NotFound()

        line_num = max(0, int(request.query_params.get('line', 0)))
        output = task.console_output or ""
        return Response('\n'.join(output.split('\n')[line_num:]))


    def list(self, request, project_pk=None):
        get_and_check_project(request, project_pk)
        tasks = self.queryset.filter(project=project_pk)
        tasks = filters.OrderingFilter().filter_queryset(self.request, tasks, self)
        serializer = TaskSerializer(tasks, many=True)
        return Response(serializer.data)

    def retrieve(self, request, pk=None, project_pk=None):
        get_and_check_project(request, project_pk)
        try:
            task = self.queryset.get(pk=pk, project=project_pk)
        except (ObjectDoesNotExist, ValidationError):
            raise exceptions.NotFound()

        serializer = TaskSerializer(task)
        return Response(serializer.data)

    def create(self, request, project_pk=None):
        project = get_and_check_project(request, project_pk, ('change_project', ))
        
        # MultiValueDict in, flat array of files out
        files = [file for filesList in map(
                        lambda key: request.FILES.getlist(key), 
                        [keys for keys in request.FILES])
                    for file in filesList]

        if len(files) <= 1:
            raise exceptions.ValidationError(detail="Cannot create task, you need at least 2 images")

        with transaction.atomic():
            task = models.Task.objects.create(project=project)

            for image in files:
                models.ImageUpload.objects.create(task=task, image=image)

            # Update other parameters such as processing node, task name, etc.
            serializer = TaskSerializer(task, data=request.data, partial=True)
            serializer.is_valid(raise_exception=True)
            serializer.save()

            return Response(serializer.data, status=status.HTTP_201_CREATED)


    def update(self, request, pk=None, project_pk=None, partial=False):
        get_and_check_project(request, project_pk, ('change_project', ))
        try:
            task = self.queryset.get(pk=pk, project=project_pk)
        except (ObjectDoesNotExist, ValidationError):
            raise exceptions.NotFound()

        # Check that a user has access to reassign a project
        if 'project' in request.data:
            try:
                get_and_check_project(request, request.data['project'], ('change_project', ))
            except exceptions.NotFound:
                raise exceptions.PermissionDenied()

        serializer = TaskSerializer(task, data=request.data, partial=partial)
        serializer.is_valid(raise_exception=True)
        serializer.save()

        # Call the scheduler (speed things up)
        scheduler.process_pending_tasks(background=True)

        return Response(serializer.data)

    def partial_update(self, request, *args, **kwargs):
        kwargs['partial'] = True
        return self.update(request, *args, **kwargs)


class TaskNestedView(APIView):
    queryset = models.Task.objects.all().defer('orthophoto_extent', 'dtm_extent', 'dsm_extent', 'console_output', )
    permission_classes = (IsAuthenticatedOrReadOnly, )

    def get_and_check_task(self, request, pk, project_pk, annotate={}):
        try:
            task = self.queryset.annotate(**annotate).get(pk=pk, project=project_pk)
        except (ObjectDoesNotExist, ValidationError):
            raise exceptions.NotFound()

        # Check for permissions, unless the task is public
        if not task.public:
            get_and_check_project(request, project_pk)

        return task


class TaskTiles(TaskNestedView):
    def get(self, request, pk=None, project_pk=None, tile_type="", z="", x="", y=""):
        """
        Get a tile image
        """
        task = self.get_and_check_task(request, pk, project_pk)
        tile_path = task.get_tile_path(tile_type, z, x, y)
        if os.path.isfile(tile_path):
            tile = open(tile_path, "rb")
            return HttpResponse(FileWrapper(tile), content_type="image/png")
        else:
            raise exceptions.NotFound()


class TaskTilesJson(TaskNestedView):
    def get(self, request, pk=None, project_pk=None, tile_type=""):
        """
        Get tile.json for this tasks's asset type
        """
        task = self.get_and_check_task(request, pk, project_pk)

        extent_map = {
            'orthophoto': task.orthophoto_extent,
            'dsm': task.dsm_extent,
            'dtm': task.dtm_extent,
        }

        if not tile_type in extent_map:
            raise exceptions.ValidationError("Type {} is not a valid tile type".format(tile_type))

        extent = extent_map[tile_type]

        if extent is None:
            raise exceptions.ValidationError("A {} has not been processed for this task. Tiles are not available.".format(tile_type))

        json = get_tile_json(task.name, [
                '/api/projects/{}/tasks/{}/{}/tiles/{{z}}/{{x}}/{{y}}.png'.format(task.project.id, task.id, tile_type)
            ], extent.extent)
        return Response(json)


"""
Task downloads are simply aliases to download the task's assets
(but require a shorter path and look nicer the API user)
"""
class TaskDownloads(TaskNestedView):
        def get(self, request, pk=None, project_pk=None, asset=""):
            """
            Downloads a task asset (if available)
            """
            task = self.get_and_check_task(request, pk, project_pk)

            # Check and download
            try:
                asset_path = task.get_asset_download_path(asset)
            except FileNotFoundError:
                raise exceptions.NotFound("Asset does not exist")

            if not os.path.exists(asset_path):
                raise exceptions.NotFound("Asset does not exist")

            asset_filename = os.path.basename(asset_path)

            file = open(asset_path, "rb")
            response = HttpResponse(FileWrapper(file),
                                    content_type=(mimetypes.guess_type(asset_filename)[0] or "application/zip"))
            response['Content-Disposition'] = "attachment; filename={}".format(asset)
            return response

"""
Raw access to the task's asset folder resources
Useful when accessing a textured 3d model, or the Potree point cloud data
"""
class TaskAssets(TaskNestedView):
    def get(self, request, pk=None, project_pk=None, unsafe_asset_path=""):
        """
        Downloads a task asset (if available)
        """
        task = self.get_and_check_task(request, pk, project_pk)

        # Check for directory traversal attacks
        try:
            asset_path = path_traversal_check(task.assets_path(unsafe_asset_path), task.assets_path(""))
        except SuspiciousFileOperation:
            raise exceptions.NotFound("Asset does not exist")

        if (not os.path.exists(asset_path)) or os.path.isdir(asset_path):
            raise exceptions.NotFound("Asset does not exist")

        asset_filename = os.path.basename(asset_path)

        file = open(asset_path, "rb")
        response = HttpResponse(FileWrapper(file),
                                content_type=(mimetypes.guess_type(asset_filename)[0] or "application/zip"))
        response['Content-Disposition'] = "inline; filename={}".format(asset_filename)
        return response
