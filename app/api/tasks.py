import os
import re
import shutil
from wsgiref.util import FileWrapper

import mimetypes
import rasterio
from rasterio.vrt import WarpedVRT
from rasterio.enums import ColorInterp
from PIL import Image
import io
import numpy as np

from shutil import copyfileobj, move
from django.core.exceptions import ObjectDoesNotExist, SuspiciousFileOperation, ValidationError
from django.core.files.uploadedfile import InMemoryUploadedFile
from django.db import transaction
from django.http import FileResponse
from django.http import HttpResponse
from django.http import StreamingHttpResponse
from django.contrib.gis.geos import Polygon
from zipstream.ng import ZipStream
from rest_framework import status, serializers, viewsets, filters, exceptions, permissions, parsers
from rest_framework.decorators import action
from rest_framework.permissions import AllowAny
from rest_framework.response import Response
from rest_framework.views import APIView
from django.db.models import Q

from app import models, pending_actions
from nodeodm import status_codes
from nodeodm.models import ProcessingNode
from worker import tasks as worker_tasks
from .common import get_and_check_project, get_asset_download_filename
from .tags import TagsField
from app.security import path_traversal_check
from django.utils.translation import gettext_lazy as _
from .fields import PolygonGeometryField
from app.geoutils import geom_transform_wkt_bbox
from webodm import settings

def flatten_files(request_files):
    # MultiValueDict in, flat array of files out
    return [file for filesList in map(
        lambda key: request_files.getlist(key),
        [keys for keys in request_files])
     for file in filesList]

class TaskIDsSerializer(serializers.BaseSerializer):
    def to_representation(self, obj):
        return obj.id

class TaskSerializer(serializers.ModelSerializer):
    project = serializers.PrimaryKeyRelatedField(queryset=models.Project.objects.all())
    processing_node = serializers.PrimaryKeyRelatedField(queryset=ProcessingNode.objects.all()) 
    processing_node_name = serializers.SerializerMethodField()
    can_rerun_from = serializers.SerializerMethodField()
    statistics = serializers.SerializerMethodField()
    extent = serializers.SerializerMethodField()
    tags = TagsField(required=False)
    crop = PolygonGeometryField(required=False, allow_null=True)

    def get_processing_node_name(self, obj):
        if obj.processing_node is not None:
            return str(obj.processing_node)
        else:
            return None

    def get_statistics(self, obj):
        return obj.get_statistics()

    def get_can_rerun_from(self, obj):
        """
        When a task has been associated with a processing node
        and if the processing node supports the "rerun-from" parameter
        this method returns the valid values for "rerun-from" for that particular
        processing node.

        TODO: this could be improved by returning an empty array if a task was created
        and purged by the processing node (which would require knowing how long a task is being kept
        see https://github.com/OpenDroneMap/NodeODM/issues/32
        :return: array of valid rerun-from parameters
        """
        if obj.processing_node is not None:
            rerun_from_option = list(filter(lambda d: 'name' in d and d['name'] == 'rerun-from', obj.processing_node.available_options))
            if len(rerun_from_option) > 0 and 'domain' in rerun_from_option[0]:
                return rerun_from_option[0]['domain']

        return []

    def get_extent(self, obj):
        return obj.get_extent()

    class Meta:
        model = models.Task
        exclude = ('orthophoto_extent', 'dsm_extent', 'dtm_extent', )
        read_only_fields = ('processing_time', 'status', 'last_error', 'created_at', 'pending_action', 'available_assets', 'size', )

class TaskViewSet(viewsets.ViewSet):
    """
    Task get/add/delete/update
    A task represents a set of images and other input to be sent to a processing node.
    Once a processing node completes processing, results are stored in the task.
    """
    queryset = models.Task.objects.all()
    
    parser_classes = (parsers.MultiPartParser, parsers.JSONParser, parsers.FormParser, )
    ordering_fields = '__all__'
    
    def get_permissions(self):
        """
        Instantiates and returns the list of permissions that this view requires.
        We don't use object level permissions on tasks, relying on
        project's object permissions instead (but standard model permissions still apply)
        and with the exception of 'retrieve' (task GET) for public tasks access
        """
        if self.action == 'retrieve':
            permission_classes = [permissions.AllowAny]
        else:
            permission_classes = [permissions.DjangoModelPermissions, ]

        return [permission() for permission in permission_classes]

    def set_pending_action(self, pending_action, request, pk=None, project_pk=None, perms=('change_project', )):
        get_and_check_project(request, project_pk, perms)
        try:
            task = self.queryset.get(pk=pk, project=project_pk)
        except (ObjectDoesNotExist, ValidationError):
            raise exceptions.NotFound()

        task.pending_action = pending_action
        task.partial = False # Otherwise this will not be processed
        task.last_error = None
        task.save()

        # Process task right away
        worker_tasks.process_task.delay(task.id)

        return Response({'success': True})

    @action(detail=True, methods=['post'])
    def cancel(self, *args, **kwargs):
        return self.set_pending_action(pending_actions.CANCEL, *args, **kwargs)

    @action(detail=True, methods=['post'])
    def restart(self, *args, **kwargs):
        return self.set_pending_action(pending_actions.RESTART, *args, **kwargs)

    @action(detail=True, methods=['post'])
    def remove(self, *args, **kwargs):
        return self.set_pending_action(pending_actions.REMOVE, *args, perms=('delete_project', ), **kwargs)

    @action(detail=True, methods=['post'])
    def compact(self, *args, **kwargs):
        return self.set_pending_action(pending_actions.COMPACT, *args, perms=('delete_project', ), **kwargs)

    @action(detail=True, methods=['get'])
    def output(self, request, pk=None, project_pk=None):
        """
        Retrieve the console output for this task.

        An optional "line" query param can be passed to retrieve
        only the output starting from a certain line number.

        An optional "limit" query param can be passed to limit
        the number of lines to be returned

        An optional "f" query param can be either: "text" (default), "json" or "raw"
        """
        get_and_check_project(request, project_pk)
        try:
            task = self.queryset.get(pk=pk, project=project_pk)
        except (ObjectDoesNotExist, ValidationError):
            raise exceptions.NotFound()

        try:
            line_num = max(0, int(request.query_params.get('line', 0)))
            limit = int(request.query_params.get('limit', 0)) or None
            fmt = request.query_params.get('f', 'text')
            if fmt not in ['text', 'json', 'raw']:
                raise ValueError("Invalid format")
        except ValueError:
            raise exceptions.ValidationError("Invalid parameter")

        lines = task.console.output().rstrip().split('\n')
        count = len(lines)
        line_start = min(line_num, count)
        line_end = None

        if limit is not None:
            if limit > 0:
                line_end = line_num + limit
            else:
                line_start = line_start if count - line_start <= abs(limit) else count - abs(limit) 
                line_end = None 

        if fmt == 'text':
            return Response('\n'.join(lines[line_start:line_end]))
        elif fmt == 'raw':
            return HttpResponse('\n'.join(lines[line_start:line_end]), content_type="text/plain; charset=utf-8")
        else:
            return Response({
                'lines': lines[line_start:line_end],
                'count': count
            })

    def list(self, request, project_pk=None):
        get_and_check_project(request, project_pk)
        query = Q(project=project_pk)

        status = request.query_params.get('status')
        if status is not None:
            try:
                query &= Q(status=int(status))
            except ValueError:
                raise exceptions.ValidationError("Invalid status parameter")   

        available_assets = request.query_params.get('available_assets')
        if available_assets is not None:
            assets = [a.strip() for a in available_assets.split(",") if a.strip() != ""]
            for a in assets:
                query &= Q(available_assets__contains="{" + a + "}")

        bbox = request.query_params.get('bbox')
        if bbox is not None:
            try:
                xmin, ymin, xmax, ymax = [float(v) for v in bbox.split(",")]
            except:
                raise exceptions.ValidationError("Invalid bbox parameter")   

            geom = Polygon.from_bbox((xmin, ymin, xmax, ymax))
            query &= Q(orthophoto_extent__intersects=geom) | \
                     Q(dsm_extent__intersects=geom) | \
                     Q(dtm_extent__intersects=geom)

        tasks = self.queryset.filter(query)
        tasks = filters.OrderingFilter().filter_queryset(self.request, tasks, self)
        serializer = TaskSerializer(tasks, many=True)
        return Response(serializer.data)

    def retrieve(self, request, pk=None, project_pk=None):
        try:
            task = self.queryset.get(pk=pk, project=project_pk)
        except (ObjectDoesNotExist, ValidationError):
            raise exceptions.NotFound()

        if not (task.public or task.project.public):
            get_and_check_project(request, task.project.id)

        serializer = TaskSerializer(task)
        return Response(serializer.data)

    @action(detail=True, methods=['post'])
    def commit(self, request, pk=None, project_pk=None):
        """
        Commit a task after all images have been uploaded
        """
        get_and_check_project(request, project_pk, ('change_project', ))
        try:
            task = self.queryset.get(pk=pk, project=project_pk)
        except (ObjectDoesNotExist, ValidationError):
            raise exceptions.NotFound()

        task.partial = False
        task.images_count = len(task.scan_images())

        if task.images_count < 1:
            raise exceptions.ValidationError(detail=_("You need to upload at least 1 file before commit"))

        task.update_size()
        task.save()
        worker_tasks.process_task.delay(task.id)

        serializer = TaskSerializer(task)
        return Response(serializer.data, status=status.HTTP_200_OK)

    @action(detail=True, methods=['post'])
    def upload(self, request, pk=None, project_pk=None):
        """
        Add images to a task
        """
        get_and_check_project(request, project_pk, ('change_project', ))
        try:
            task = self.queryset.get(pk=pk, project=project_pk)
        except (ObjectDoesNotExist, ValidationError):
            raise exceptions.NotFound()

        files = flatten_files(request.FILES)
        if len(files) == 0:
            raise exceptions.ValidationError(detail=_("No files uploaded"))

        uploaded = task.handle_images_upload(files)
        task.images_count = len(task.scan_images())
        # Update other parameters such as processing node, task name, etc.
        serializer = TaskSerializer(task, data=request.data, partial=True)
        serializer.is_valid(raise_exception=True)
        serializer.save()
        
        return Response({'success': True, 'uploaded': uploaded}, status=status.HTTP_200_OK)

    @action(detail=True, methods=['post'])
    def duplicate(self, request, pk=None, project_pk=None):
        """
        Duplicate a task
        """
        get_and_check_project(request, project_pk, ('change_project', ))
        try:
            task = self.queryset.get(pk=pk, project=project_pk)
        except (ObjectDoesNotExist, ValidationError):
            raise exceptions.NotFound()

        new_task = task.duplicate()
        if new_task:
            return Response({'success': True, 'task': TaskSerializer(new_task).data}, status=status.HTTP_200_OK)
        else:
            return Response({'error': _("Cannot duplicate task")}, status=status.HTTP_200_OK)
    
    def create(self, request, project_pk=None):
        project = get_and_check_project(request, project_pk, ('change_project', ))

        # Check if an alignment field is set to a valid task
        # this means a user wants to align this task with another
        align_to = request.data.get('align_to')
        align_task = None
        if align_to is not None and align_to != "auto" and align_to != "":
            try:
                align_task = models.Task.objects.get(pk=align_to)
                get_and_check_project(request, align_task.project.id, ('view_project', ))
            except ObjectDoesNotExist:
                raise exceptions.ValidationError(detail=_("Cannot create task, alignment task is not valid"))
        
        # If this is a partial task, we're going to upload images later
        # for now we just create a placeholder task.
        if request.data.get('partial'):
            task = models.Task.objects.create(project=project,
                                              pending_action=pending_actions.RESIZE if 'resize_to' in request.data else None)
            if align_task is not None:
                task.set_alignment_file_from(align_task)
            
            serializer = TaskSerializer(task, data=request.data, partial=True)
            serializer.is_valid(raise_exception=True)
            serializer.save()
        else:
            files = flatten_files(request.FILES)

            if len(files) <= 1:
                raise exceptions.ValidationError(detail=_("Cannot create task, you need at least 2 images"))

            with transaction.atomic():
                task = models.Task.objects.create(project=project,
                                                  pending_action=pending_actions.RESIZE if 'resize_to' in request.data else None)
                if align_task is not None:
                    task.set_alignment_file_from(align_task)
                task.handle_images_upload(files)
                task.images_count = len(task.scan_images())

                # Update other parameters such as processing node, task name, etc.
                serializer = TaskSerializer(task, data=request.data, partial=True)
                serializer.is_valid(raise_exception=True)
                serializer.save()

                worker_tasks.process_task.delay(task.id)

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

        # Process task right away
        worker_tasks.process_task.delay(task.id)

        return Response(serializer.data)

    def partial_update(self, request, *args, **kwargs):
        kwargs['partial'] = True
        return self.update(request, *args, **kwargs)


class TaskNestedView(APIView):
    queryset = models.Task.objects.all().defer('orthophoto_extent', 'dtm_extent', 'dsm_extent', )
    permission_classes = (AllowAny, )

    def get_and_check_task(self, request, pk, annotate={}):
        try:
            task = self.queryset.annotate(**annotate).get(pk=pk)
        except (ObjectDoesNotExist, ValidationError):
            raise exceptions.NotFound()

        # Check for permissions, unless the task is public
        if not (task.public or task.project.public):
            get_and_check_project(request, task.project.id)

        return task


def download_file_response(request, filePath, content_disposition, download_filename=None):
    filename = os.path.basename(filePath)
    if download_filename is None: 
        download_filename = filename
    filesize = os.stat(filePath).st_size
    file = open(filePath, "rb")

    # More than 100mb, normal http response, otherwise stream
    # Django docs say to avoid streaming when possible
    stream = filesize > 1e8 or request.GET.get('_force_stream', False)
    if stream:
        response = FileResponse(file)
    else:
        response = HttpResponse(FileWrapper(file),
                                content_type=(mimetypes.guess_type(filename)[0] or "application/zip"))

    response['Content-Type'] = mimetypes.guess_type(filename)[0] or "application/zip"
    response['Content-Disposition'] = "{}; filename={}".format(content_disposition, download_filename)
    response['Content-Length'] = filesize

    # For testing
    if stream:
        response['_stream'] = 'yes'

    return response


def download_file_stream(request, stream, content_disposition, download_filename=None):
    if not isinstance(stream, ZipStream):
        # This should never happen, but just in case..
        raise exceptions.ValidationError("stream not a zipstream instance")
    
    response = StreamingHttpResponse(stream, content_type=(mimetypes.guess_type(download_filename)[0] or "application/zip"))

    response['Content-Type'] = mimetypes.guess_type(download_filename)[0] or "application/zip"
    response['Content-Disposition'] = "{}; filename={}".format(content_disposition, download_filename)
    response['Content-Length'] = len(stream)

    # For testing
    response['_stream'] = 'yes'
    
    return response


"""
Task downloads are simply aliases to download the task's assets
(but require a shorter path and look nicer the API user)
"""
class TaskDownloads(TaskNestedView):
    def get(self, request, pk=None, project_pk=None, asset=""):
        """
        Downloads a task asset (if available)
        """
        task = self.get_and_check_task(request, pk)

        # Check and download
        try:
            asset_fs = task.get_asset_file_or_stream(asset)
        except FileNotFoundError:
            raise exceptions.NotFound(_("Asset does not exist"))

        is_stream = not isinstance(asset_fs, str) 
        if not is_stream and not os.path.isfile(asset_fs):
            raise exceptions.NotFound(_("Asset does not exist"))
        
        download_filename = request.GET.get('filename', get_asset_download_filename(task, asset))

        if is_stream:
            return download_file_stream(request, asset_fs, 'attachment', download_filename=download_filename)
        else:
            return download_file_response(request, asset_fs, 'attachment', download_filename=download_filename)


class TaskThumbnail(TaskNestedView):
    def get(self, request, pk=None, project_pk=None):
        """
        Generate a thumbnail on the fly for a particular task
        """
        task = self.get_and_check_task(request, pk)
        orthophoto_path = task.get_check_file_asset_path("orthophoto.tif")
        if orthophoto_path is None:
            raise exceptions.NotFound()

        thumb_size = 256
        try:
            thumb_size = max(1, min(1024, int(request.query_params.get('size', 256))))
        except ValueError:
            pass

        with rasterio.open(orthophoto_path, "r") as raster:
            ci = raster.colorinterp
            indexes = (1, 2, 3,)

            # More than 4 bands?
            if len(ci) > 4:
                # Try to find RGBA band order
                if ColorInterp.red in ci and \
                        ColorInterp.green in ci and \
                        ColorInterp.blue in ci:
                    indexes = (ci.index(ColorInterp.red) + 1,
                                ci.index(ColorInterp.green) + 1,
                                ci.index(ColorInterp.blue) + 1,)
            elif len(ci) < 3:
                 raise exceptions.NotFound()
            
            if ColorInterp.alpha in ci:
                indexes += (ci.index(ColorInterp.alpha) + 1, )
            
            if task.crop is not None:
                cutline, (minx, miny, maxx, maxy) = geom_transform_wkt_bbox(task.crop, raster, 'raster')

                w = maxx - minx
                h = maxy - miny
                win = rasterio.windows.Window(minx, miny, w, h)
                ratio = w / h
                if ratio > 1:
                    out_width = thumb_size
                    out_height = int(thumb_size / ratio)
                else:
                    out_height = thumb_size
                    out_width = int(thumb_size * ratio)


                with WarpedVRT(raster, cutline=cutline, nodata=0) as vrt:
                    rgb = vrt.read(indexes=indexes, window=win, fill_value=0, out_shape=(
                        len(indexes),
                        out_height,
                        out_width,
                    ), resampling=rasterio.enums.Resampling.nearest)
                img = np.zeros((len(indexes), thumb_size, thumb_size), dtype=rgb.dtype)
                y_offset = (thumb_size - out_height) // 2
                x_offset = (thumb_size - out_width) // 2

                # Place the output image in the center
                img[:, y_offset:y_offset + out_height, x_offset:x_offset + out_width] = rgb
            else:
                w = raster.width
                h = raster.height
                d = max(w, h)
                dw = (d - w) // 2
                dh = (d - h) // 2
                win = rasterio.windows.Window(-dw, -dh, d, d)

                img = raster.read(indexes=indexes, window=win, boundless=True, fill_value=0, out_shape=(
                    len(indexes),
                    thumb_size,
                    thumb_size,
                ), resampling=rasterio.enums.Resampling.nearest)

            img = img.transpose((1, 2, 0))

        if img.dtype != np.uint8:
            img = img.astype(np.float32)

            # Ignore alpha values
            minval = img[:,:,:3].min()
            maxval = img[:,:,:3].max()

            if minval != maxval:
                img[:,:,:3] -= minval
                img[:,:,:3] *= (255.0/(maxval-minval))

            # Normalize alpha
            if img.shape[2] == 4:
                img[:,:,3] = np.where(img[:,:,3]==0, 0, 255)
            
            img = img.astype(np.uint8)

        img = Image.fromarray(img)
        output = io.BytesIO()

        if 'image/webp' in request.META.get('HTTP_ACCEPT', ''):
            img.save(output, format='WEBP')
            res = HttpResponse(content_type="image/webp")
        else:
            img.save(output, format='PNG')
            res = HttpResponse(content_type="image/png")

        res['Content-Disposition'] = 'inline'
        res.write(output.getvalue())
        output.close()

        return res


"""
Raw access to the task's asset folder resources
Useful when accessing a textured 3d model, or the Potree point cloud data
"""
class TaskAssets(TaskNestedView):
    def get(self, request, pk=None, project_pk=None, unsafe_asset_path=""):
        """
        Downloads a task asset (if available)
        """
        task = self.get_and_check_task(request, pk)

        # Check for directory traversal attacks
        try:
            asset_path = path_traversal_check(task.assets_path(unsafe_asset_path), task.assets_path(""))
        except SuspiciousFileOperation:
            raise exceptions.NotFound(_("Asset does not exist"))

        if (not os.path.exists(asset_path)) or os.path.isdir(asset_path):
            raise exceptions.NotFound(_("Asset does not exist"))

        return download_file_response(request, asset_path, 'inline')

"""
Task backup endpoint
"""
class TaskBackup(TaskNestedView):
    def get(self, request, pk=None, project_pk=None):
        """
        Downloads a task's backup
        """
        task = self.get_and_check_task(request, pk)

        # Check and download
        try:
            asset_fs = task.get_task_backup_stream()
        except FileNotFoundError:
            raise exceptions.NotFound(_("Asset does not exist"))

        download_filename = request.GET.get('filename', get_asset_download_filename(task, "backup.zip"))

        return download_file_stream(request, asset_fs, 'attachment', download_filename=download_filename)

"""
Task assets import
"""
class TaskAssetsImport(APIView):
    permission_classes = (permissions.AllowAny,)
    parser_classes = (parsers.MultiPartParser, parsers.JSONParser, parsers.FormParser,)

    def post(self, request, project_pk=None):
        project = get_and_check_project(request, project_pk, ('change_project',))

        files = flatten_files(request.FILES)
        import_url = request.data.get('url', None)
        task_name = request.data.get('name', _('Imported Task'))

        if not import_url and len(files) != 1:
            raise exceptions.ValidationError(detail=_("Cannot create task, you need to upload 1 file"))

        if import_url:
            if len(files) > 0:
                raise exceptions.ValidationError(detail=_("Cannot create task, either specify a URL or upload 1 file."))
            if re.match(r"^https?:\/\/.+$", import_url.lower()) is None:
                raise exceptions.ValidationError(detail=_("Invalid URL. Did you mean %(hint)s ?") % { 'hint': f'http://{import_url}'})

        chunk_index = request.data.get('dzchunkindex')
        uuid = request.data.get('dzuuid') 
        total_chunk_count = request.data.get('dztotalchunkcount', None)

        # Chunked upload?
        tmp_upload_file = None
        if len(files) > 0 and chunk_index is not None and uuid is not None and total_chunk_count is not None:
            byte_offset = request.data.get('dzchunkbyteoffset', 0) 

            try:
                chunk_index = int(chunk_index)
                byte_offset = int(byte_offset)
                total_chunk_count = int(total_chunk_count)
            except ValueError:
                raise exceptions.ValidationError(detail="Some parameters are not integers")
            uuid = re.sub('[^0-9a-zA-Z-]+', "", uuid)

            tmp_upload_file = os.path.join(settings.FILE_UPLOAD_TEMP_DIR, f"{uuid}.upload")
            if os.path.isfile(tmp_upload_file) and chunk_index == 0:
                os.unlink(tmp_upload_file)
            
            with open(tmp_upload_file, 'ab') as fd:
                fd.truncate(byte_offset)
                fd.seek(byte_offset)
                if isinstance(files[0], InMemoryUploadedFile):
                    for chunk in files[0].chunks():
                        fd.write(chunk)
                else:
                    with open(files[0].temporary_file_path(), 'rb') as file:
                        fd.write(file.read())
            
            if chunk_index + 1 < total_chunk_count:
                return Response({'uploaded': True}, status=status.HTTP_200_OK)

        # Ready to import
        with transaction.atomic():
            task = models.Task.objects.create(project=project,
                                            auto_processing_node=False,
                                            name=task_name,
                                            import_url=import_url if import_url else "file://all.zip",
                                            status=status_codes.RUNNING,
                                            pending_action=pending_actions.IMPORT)
            task.create_task_directories()
            destination_file = task.assets_path("all.zip")

            # Non-chunked file import
            if tmp_upload_file is None and len(files) > 0:
                with open(destination_file, 'wb+') as fd:
                    if isinstance(files[0], InMemoryUploadedFile):
                        for chunk in files[0].chunks():
                            fd.write(chunk)
                    else:
                        with open(files[0].temporary_file_path(), 'rb') as file:
                            copyfileobj(file, fd)
            elif tmp_upload_file is not None:
                # Move
                shutil.move(tmp_upload_file, destination_file)

            worker_tasks.process_task.delay(task.id)

        serializer = TaskSerializer(task)
        return Response(serializer.data, status=status.HTTP_201_CREATED)
