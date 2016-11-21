import mimetypes
import os

from django.contrib.gis.db.models import GeometryField
from django.contrib.gis.db.models.functions import Envelope
from django.core.exceptions import ObjectDoesNotExist
from django.db.models.functions import Cast
from django.http import HttpResponse
from wsgiref.util import FileWrapper
from rest_framework import status, serializers, viewsets, filters, exceptions, permissions, parsers
from rest_framework.response import Response
from rest_framework.decorators import detail_route
from rest_framework.views import APIView
from .common import get_and_check_project, get_tile_json

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
        exclude = ('processing_lock', 'console_output', 'orthophoto', )


class TaskViewSet(viewsets.ViewSet):
    """
    Task get/add/delete/update
    A task represents a set of images and other input to be sent to a processing node.
    Once a processing node completes processing, results are stored in the task.
    """
    queryset = models.Task.objects.all().defer('orthophoto', 'console_output')
    
    # We don't use object level permissions on tasks, relying on
    # project's object permissions instead (but standard model permissions still apply)
    permission_classes = (permissions.DjangoModelPermissions, )
    parser_classes = (parsers.MultiPartParser, parsers.JSONParser, parsers.FormParser, )
    ordering_fields = '__all__'

    def set_pending_action(self, pending_action, request, pk=None, project_pk=None, perms=('change_project', )):
        get_and_check_project(request, project_pk, perms)
        try:
            task = self.queryset.get(pk=pk, project=project_pk)
        except ObjectDoesNotExist:
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
        except ObjectDoesNotExist:
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
        except ObjectDoesNotExist:
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

        task = models.Task.create_from_images(files, project)
        if task is not None:
            return Response({"id": task.id}, status=status.HTTP_201_CREATED)
        else:
            raise exceptions.ValidationError(detail="Cannot create task, input provided is not valid.")

    def update(self, request, pk=None, project_pk=None, partial=False):
        get_and_check_project(request, project_pk, ('change_project', ))
        try:
            task = self.queryset.get(pk=pk, project=project_pk)
        except ObjectDoesNotExist:
            raise exceptions.NotFound()

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
    queryset = models.Task.objects.all().defer('orthophoto', 'console_output')

    def get_and_check_task(self, request, pk, project_pk, annotate={}):
        get_and_check_project(request, project_pk)
        try:
            task = self.queryset.annotate(**annotate).get(pk=pk, project=project_pk)
        except ObjectDoesNotExist:
            raise exceptions.NotFound()
        return task


class TaskTiles(TaskNestedView):
    def get(self, request, pk=None, project_pk=None, z="", x="", y=""):
        """
        Get an orthophoto tile
        """
        task = self.get_and_check_task(request, pk, project_pk)
        tile_path = task.get_tile_path(z, x, y)
        if os.path.isfile(tile_path):
            tile = open(tile_path, "rb")
            return HttpResponse(FileWrapper(tile), content_type="image/png")
        else:
            raise exceptions.NotFound()


class TaskTilesJson(TaskNestedView):
    def get(self, request, pk=None, project_pk=None):
        """
        Get tile.json for this tasks's orthophoto
        """
        task = self.get_and_check_task(request, pk, project_pk, annotate={
                'orthophoto_area': Envelope(Cast("orthophoto", GeometryField()))
            })
        json = get_tile_json(task.name, [
                '/api/projects/{}/tasks/{}/tiles/{{z}}/{{x}}/{{y}}.png'.format(task.project.id, task.id)
            ], task.orthophoto_area.extent)
        return Response(json)


class TaskAssets(TaskNestedView):
        def get(self, request, pk=None, project_pk=None, asset=""):
            """
            Downloads a task asset (if available)
            """
            task = self.get_and_check_task(request, pk, project_pk)

            allowed_assets = {
                'all': 'all.zip',
                'geotiff': os.path.join('odm_orthophoto', 'odm_orthophoto.tif'),
                'las': os.path.join('odm_georeferencing', 'odm_georeferenced_model.ply.las'),
                'ply': os.path.join('odm_georeferencing', 'odm_georeferenced_model.ply'),
                'csv': os.path.join('odm_georeferencing', 'odm_georeferenced_model.csv')
            }

            if asset in allowed_assets:
                asset_path = task.assets_path(allowed_assets[asset])

                if not os.path.exists(asset_path):
                    raise exceptions.NotFound("Asset does not exist")

                asset_filename = os.path.basename(asset_path)

                file = open(asset_path, "rb")
                response = HttpResponse(FileWrapper(file),
                                        content_type=(mimetypes.guess_type(asset_filename)[0] or "application/zip"))
                response['Content-Disposition'] = "attachment; filename={}".format(asset_filename)
                return response
            else:
                raise exceptions.NotFound()