import logging
import os
import shutil
import time
import uuid as uuid_module

import json
from shlex import quote

import errno
import piexif
import re

import zipfile
from shutil import copyfile
import requests
from PIL import Image
from django.contrib.gis.gdal import GDALRaster
from django.contrib.gis.gdal import OGRGeometry
from django.contrib.gis.geos import GEOSGeometry
from django.contrib.postgres import fields
from django.core.exceptions import ValidationError, SuspiciousFileOperation
from django.db import models
from django.db import transaction
from django.db import connection
from django.utils import timezone
from urllib3.exceptions import ReadTimeoutError

from app import pending_actions
from django.contrib.gis.db.models.fields import GeometryField

from app.cogeo import assure_cogeo
from app.testwatch import testWatch
from app.api.common import path_traversal_check
from nodeodm import status_codes
from nodeodm.models import ProcessingNode
from pyodm.exceptions import NodeResponseError, NodeConnectionError, NodeServerError, OdmError
from webodm import settings
from app.classes.gcp import GCPFile
from .project import Project
from django.utils.translation import gettext_lazy as _, gettext

from functools import partial
import subprocess

logger = logging.getLogger('app.logger')

class TaskInterruptedException(Exception):
    pass

def task_directory_path(taskId, projectId):
    return 'project/{0}/task/{1}/'.format(projectId, taskId)


def full_task_directory_path(taskId, projectId, *args):
    return os.path.join(settings.MEDIA_ROOT, task_directory_path(taskId, projectId), *args)


def assets_directory_path(taskId, projectId, filename):
    # files will be uploaded to MEDIA_ROOT/project/<id>/task/<id>/<filename>
    return '{0}{1}'.format(task_directory_path(taskId, projectId), filename)


def gcp_directory_path(task, filename):
    return assets_directory_path(task.id, task.project.id, filename)


def validate_task_options(value):
    """
    Make sure that the format of this options field is valid
    """
    if len(value) == 0: return

    try:
        for option in value:
            if not option['name']: raise ValidationError("Name key not found in option")
            if not option['value']: raise ValidationError("Value key not found in option")
    except:
        raise ValidationError("Invalid options")



def resize_image(image_path, resize_to, done=None):
    """
    :param image_path: path to the image
    :param resize_to: target size to resize this image to (largest side)
    :param done: optional callback
    :return: path and resize ratio
    """
    try:
        can_resize = False

        # Check if this image can be resized
        # There's no easy way to resize multispectral 16bit images
        # (Support should be added to PIL)
        is_jpeg = re.match(r'.*\.jpe?g$', image_path, re.IGNORECASE)

        if is_jpeg:
            # We can always resize these
            can_resize = True
        else:
            try:
                bps = piexif.load(image_path)['0th'][piexif.ImageIFD.BitsPerSample]
                if isinstance(bps, int):
                    # Always resize single band images
                    can_resize = True
                elif isinstance(bps, tuple) and len(bps) > 1:
                    # Only resize multiband images if depth is 8bit
                    can_resize = bps == (8, ) * len(bps)
                else:
                    logger.warning("Cannot determine if image %s can be resized, hoping for the best!" % image_path)
                    can_resize = True
            except KeyError:
                logger.warning("Cannot find BitsPerSample tag for %s" % image_path)

        if not can_resize:
            logger.warning("Cannot resize %s" % image_path)
            return {'path': image_path, 'resize_ratio': 1}

        im = Image.open(image_path)
        path, ext = os.path.splitext(image_path)
        resized_image_path = os.path.join(path + '.resized' + ext)

        width, height = im.size
        max_side = max(width, height)
        if max_side < resize_to:
            logger.warning('You asked to make {} bigger ({} --> {}), but we are not going to do that.'.format(image_path, max_side, resize_to))
            im.close()
            return {'path': image_path, 'resize_ratio': 1}

        ratio = float(resize_to) / float(max_side)
        resized_width = int(width * ratio)
        resized_height = int(height * ratio)

        im = im.resize((resized_width, resized_height), Image.BILINEAR)
        params = {}
        if is_jpeg:
            params['quality'] = 100

        if 'exif' in im.info:
            exif_dict = piexif.load(im.info['exif'])
            exif_dict['Exif'][piexif.ExifIFD.PixelXDimension] = resized_width
            exif_dict['Exif'][piexif.ExifIFD.PixelYDimension] = resized_height
            im.save(resized_image_path, exif=piexif.dump(exif_dict), **params)
        else:
            im.save(resized_image_path, **params)

        im.close()

        # Delete original image, rename resized image to original
        os.remove(image_path)
        os.rename(resized_image_path, image_path)

        logger.info("Resized {} to {}x{}".format(image_path, resized_width, resized_height))
    except (IOError, ValueError) as e:
        logger.warning("Cannot resize {}: {}.".format(image_path, str(e)))
        if done is not None:
            done()
        return None

    retval = {'path': image_path, 'resize_ratio': ratio}

    if done is not None:
        done(retval)

    return retval

class Task(models.Model):
    ASSETS_MAP = {
            'all.zip': 'all.zip',
            'orthophoto.tif': os.path.join('odm_orthophoto', 'odm_orthophoto.tif'),
            'orthophoto.png': os.path.join('odm_orthophoto', 'odm_orthophoto.png'),
            'orthophoto.mbtiles': os.path.join('odm_orthophoto', 'odm_orthophoto.mbtiles'),
            'orthophoto.kmz': os.path.join('odm_orthophoto', 'odm_orthophoto.kmz'),
            'georeferenced_model.las': os.path.join('odm_georeferencing', 'odm_georeferenced_model.las'),
            'georeferenced_model.laz': os.path.join('odm_georeferencing', 'odm_georeferenced_model.laz'),
            'georeferenced_model.ply': os.path.join('odm_georeferencing', 'odm_georeferenced_model.ply'),
            'georeferenced_model.csv': os.path.join('odm_georeferencing', 'odm_georeferenced_model.csv'),
            'textured_model.zip': {
                'deferred_path': 'textured_model.zip',
                'deferred_compress_dir': 'odm_texturing'
            },
            'dtm.tif': os.path.join('odm_dem', 'dtm.tif'),
            'dsm.tif': os.path.join('odm_dem', 'dsm.tif'),
            'dtm_tiles.zip': {
                'deferred_path': 'dtm_tiles.zip',
                'deferred_compress_dir': 'dtm_tiles'
            },
            'dsm_tiles.zip': {
                'deferred_path': 'dsm_tiles.zip',
                'deferred_compress_dir': 'dsm_tiles'
            },
            'orthophoto_tiles.zip': {
                'deferred_path': 'orthophoto_tiles.zip',
                'deferred_compress_dir': 'orthophoto_tiles'
            },
            'cameras.json': 'cameras.json',
            'shots.geojson': os.path.join('odm_report', 'shots.geojson'),
            'report.pdf': os.path.join('odm_report', 'report.pdf'),
            'ground_control_points.geojson': os.path.join('odm_georeferencing', 'ground_control_points.geojson'),
    }

    STATUS_CODES = (
        (status_codes.QUEUED, 'QUEUED'),
        (status_codes.RUNNING, 'RUNNING'),
        (status_codes.FAILED, 'FAILED'),
        (status_codes.COMPLETED, 'COMPLETED'),
        (status_codes.CANCELED, 'CANCELED'),
    )

    PENDING_ACTIONS = (
        (pending_actions.CANCEL, 'CANCEL'),
        (pending_actions.REMOVE, 'REMOVE'),
        (pending_actions.RESTART, 'RESTART'),
        (pending_actions.RESIZE, 'RESIZE'),
        (pending_actions.IMPORT, 'IMPORT'),
    )

    TASK_PROGRESS_LAST_VALUE = 0.85

    id = models.UUIDField(primary_key=True, default=uuid_module.uuid4, unique=True, serialize=False, editable=False, verbose_name=_("Id"))

    uuid = models.CharField(max_length=255, db_index=True, default='', blank=True, help_text=_("Identifier of the task (as returned by NodeODM API)"), verbose_name=_("UUID"))
    project = models.ForeignKey(Project, on_delete=models.CASCADE, help_text=_("Project that this task belongs to"), verbose_name=_("Project"))
    name = models.CharField(max_length=255, null=True, blank=True, help_text=_("A label for the task"), verbose_name=_("Name"))
    processing_time = models.IntegerField(default=-1, help_text=_("Number of milliseconds that elapsed since the beginning of this task (-1 indicates that no information is available)"), verbose_name=_("Processing Time"))
    processing_node = models.ForeignKey(ProcessingNode, on_delete=models.SET_NULL, null=True, blank=True, help_text=_("Processing node assigned to this task (or null if this task has not been associated yet)"), verbose_name=_("Processing Node"))
    auto_processing_node = models.BooleanField(default=True, help_text=_("A flag indicating whether this task should be automatically assigned a processing node"), verbose_name=_("Auto Processing Node"))
    status = models.IntegerField(choices=STATUS_CODES, db_index=True, null=True, blank=True, help_text=_("Current status of the task"), verbose_name=_("Status"))
    last_error = models.TextField(null=True, blank=True, help_text=_("The last processing error received"), verbose_name=_("Last Error"))
    options = fields.JSONField(default=dict, blank=True, help_text=_("Options that are being used to process this task"), validators=[validate_task_options], verbose_name=_("Options"))
    available_assets = fields.ArrayField(models.CharField(max_length=80), default=list, blank=True, help_text=_("List of available assets to download"), verbose_name=_("Available Assets"))
    console_output = models.TextField(null=False, default="", blank=True, help_text=_("Console output of the processing node"), verbose_name=_("Console Output"))

    orthophoto_extent = GeometryField(null=True, blank=True, srid=4326, help_text=_("Extent of the orthophoto"), verbose_name=_("Orthophoto Extent"))
    dsm_extent = GeometryField(null=True, blank=True, srid=4326, help_text="Extent of the DSM", verbose_name=_("DSM Extent"))
    dtm_extent = GeometryField(null=True, blank=True, srid=4326, help_text="Extent of the DTM", verbose_name=_("DTM Extent"))

    # mission
    created_at = models.DateTimeField(default=timezone.now, help_text=_("Creation date"), verbose_name=_("Created at"))
    pending_action = models.IntegerField(choices=PENDING_ACTIONS, db_index=True, null=True, blank=True, help_text=_("A requested action to be performed on the task. The selected action will be performed by the worker at the next iteration."), verbose_name=_("Pending Action"))

    public = models.BooleanField(default=False, help_text=_("A flag indicating whether this task is available to the public"), verbose_name=_("Public"))
    resize_to = models.IntegerField(default=-1, help_text=_("When set to a value different than -1, indicates that the images for this task have been / will be resized to the size specified here before processing."), verbose_name=_("Resize To"))

    upload_progress = models.FloatField(default=0.0,
                                        help_text=_("Value between 0 and 1 indicating the upload progress of this task's files to the processing node"),
                                        verbose_name=_("Upload Progress"),
                                        blank=True)
    resize_progress = models.FloatField(default=0.0,
                                        help_text=_("Value between 0 and 1 indicating the resize progress of this task's images"),
                                        verbose_name=_("Resize Progress"),
                                        blank=True)
    running_progress = models.FloatField(default=0.0,
                                        help_text=_("Value between 0 and 1 indicating the running progress (estimated) of this task"),
                                        verbose_name=_("Running Progress"),
                                        blank=True)
    import_url = models.TextField(null=False, default="", blank=True, help_text=_("URL this task is imported from (only for imported tasks)"), verbose_name=_("Import URL"))
    images_count = models.IntegerField(null=False, blank=True, default=0, help_text=_("Number of images associated with this task"), verbose_name=_("Images Count"))
    partial = models.BooleanField(default=False, help_text=_("A flag indicating whether this task is currently waiting for information or files to be uploaded before being considered for processing."), verbose_name=_("Partial"))
    potree_scene = fields.JSONField(default=dict, blank=True, help_text=_("Serialized potree scene information used to save/load measurements and camera view angle"), verbose_name=_("Potree Scene"))

    class Meta:
        verbose_name = _("Task")
        verbose_name_plural = _("Tasks")

    def __init__(self, *args, **kwargs):
        super(Task, self).__init__(*args, **kwargs)

        # To help keep track of changes to the project id
        self.__original_project_id = self.project.id

    def __str__(self):
        name = self.name if self.name is not None else gettext("unnamed")

        return 'Task [{}] ({})'.format(name, self.id)

    def move_assets(self, old_project_id, new_project_id):
        """
        Moves the task's folder, update ImageFields and orthophoto files to a new project
        """
        old_task_folder = full_task_directory_path(self.id, old_project_id)
        new_task_folder = full_task_directory_path(self.id, new_project_id)
        new_task_folder_parent = os.path.abspath(os.path.join(new_task_folder, os.pardir))

        try:
            if os.path.exists(old_task_folder) and not os.path.exists(new_task_folder):
                # Use parent, otherwise we get a duplicate directory in there
                if not os.path.exists(new_task_folder_parent):
                    os.makedirs(new_task_folder_parent)

                shutil.move(old_task_folder, new_task_folder_parent)

                logger.info("Moved task folder from {} to {}".format(old_task_folder, new_task_folder))

                with transaction.atomic():
                    for img in self.imageupload_set.all():
                        prev_name = img.image.name
                        img.image.name = assets_directory_path(self.id, new_project_id,
                                                               os.path.basename(img.image.name))
                        logger.info("Changing {} to {}".format(prev_name, img))
                        img.save()

            else:
                logger.warning("Project changed for task {}, but either {} doesn't exist, or {} already exists. This doesn't look right, so we will not move any files.".format(self,
                                                                                                             old_task_folder,
                                                                                                             new_task_folder))
        except shutil.Error as e:
            logger.warning("Could not move assets folder for task {}. We're going to proceed anyway, but you might experience issues: {}".format(self, e))

    def save(self, *args, **kwargs):
        if self.project.id != self.__original_project_id:
            self.move_assets(self.__original_project_id, self.project.id)
            self.__original_project_id = self.project.id

        # Manually validate the fields we want,
        # since Django's clean_fields() method obliterates 
        # our foreign keys without explanation :/
        errors = {}
        for f in self._meta.fields:
            if f.attname in ["options"]:
                raw_value = getattr(self, f.attname)
                if f.blank and raw_value in f.empty_values:
                    continue

                try:
                    setattr(self, f.attname, f.clean(raw_value, self))
                except ValidationError as e:
                    errors[f.name] = e.error_list

        if errors:
            raise ValidationError(errors)

        self.clean()
        self.validate_unique()

        super(Task, self).save(*args, **kwargs)

    def assets_path(self, *args):
        """
        Get a path relative to the place where assets are stored
        """
        return self.task_path("assets", *args)

    def task_path(self, *args):
        """
        Get path relative to the root task directory
        """
        return os.path.join(settings.MEDIA_ROOT,
                            assets_directory_path(self.id, self.project.id, ""),
                            *args)

    def is_asset_available_slow(self, asset):
        """
        Checks whether a particular asset is available in the file system
        Generally this should never be used directly, as it's slow. Use the available_assets field
        in the database instead.
        :param asset: one of ASSETS_MAP keys
        :return: boolean
        """
        if asset in self.ASSETS_MAP:
            value = self.ASSETS_MAP[asset]
            if isinstance(value, str):
                return os.path.exists(self.assets_path(value))
            elif isinstance(value, dict):
                if 'deferred_compress_dir' in value:
                    return os.path.exists(self.assets_path(value['deferred_compress_dir']))

        return False

    def get_statistics(self):
        """
        Parse ODM's stats.json if available
        """
        stats_json = self.assets_path("odm_report", "stats.json")
        if os.path.exists(stats_json):
            try:
                with open(stats_json) as f:
                    j = json.loads(f.read())
            except Exception as e:
                logger.warning("Malformed JSON {}: {}".format(stats_json, str(e)))
                return {}

            points = None
            if j.get('point_cloud_statistics', {}).get('dense', False):
                points = j.get('point_cloud_statistics', {}).get('stats', {}).get('statistic', [{}])[0].get('count')
            else:
                points = j.get('reconstruction_statistics', {}).get('reconstructed_points_count')
                        
            return {
                'pointcloud':{
                    'points': points,
                },
                'gsd': j.get('odm_processing_statistics', {}).get('average_gsd'),
                'area': j.get('processing_statistics', {}).get('area')
            }
        else:
            return {}

    def duplicate(self, set_new_name=True):
        try:
            with transaction.atomic():
                task = Task.objects.get(pk=self.pk)
                task.pk = None
                if set_new_name:
                    task.name = gettext('Copy of %(task)s') % {'task': self.name}
                task.created_at = timezone.now()
                task.save()
                task.refresh_from_db()

                logger.info("Duplicating {} to {}".format(self, task))

                for img in self.imageupload_set.all():
                    img.pk = None
                    img.task = task

                    prev_name = img.image.name
                    img.image.name = assets_directory_path(task.id, task.project.id,
                                                            os.path.basename(img.image.name))
                    
                    img.save()

                if os.path.isdir(self.task_path()):
                    try:
                        # Try to use hard links first
                        shutil.copytree(self.task_path(), task.task_path(), copy_function=os.link)
                    except Exception as e:
                        logger.warning("Cannot duplicate task using hard links, will use normal copy instead: {}".format(str(e)))
                        shutil.copytree(self.task_path(), task.task_path())
                else:
                    logger.warning("Task {} doesn't have folder, will skip copying".format(self))
            return task
        except Exception as e:
            logger.warning("Cannot duplicate task: {}".format(str(e)))
        
        return False
        
    def get_asset_download_path(self, asset):
        """
        Get the path to an asset download
        :param asset: one of ASSETS_MAP keys
        :return: path
        """

        if asset in self.ASSETS_MAP:
            value = self.ASSETS_MAP[asset]
            if isinstance(value, str):
                return self.assets_path(value)

            elif isinstance(value, dict):
                if 'deferred_path' in value and 'deferred_compress_dir' in value:
                    return self.generate_deferred_asset(value['deferred_path'], value['deferred_compress_dir'])
                else:
                    raise FileNotFoundError("{} is not a valid asset (invalid dict values)".format(asset))

            else:
                raise FileNotFoundError("{} is not a valid asset (invalid map)".format(asset))
        else:
            raise FileNotFoundError("{} is not a valid asset".format(asset))

    def handle_import(self):
        self.console_output += gettext("Importing assets...") + "\n"
        self.save()

        zip_path = self.assets_path("all.zip")
        # Import assets file from mounted system volume (media-dir)/imports by relative path.
        # Import file from relative path.
        if self.import_url and not os.path.exists(zip_path):
            if self.import_url.startswith("file://"):
                imports_folder_path = os.path.join(settings.MEDIA_ROOT, "imports")
                unsafe_path_to_import_file = os.path.join(settings.MEDIA_ROOT, "imports", self.import_url.replace("file://", ""))
                # check is file placed in shared media folder in /imports directory without traversing
                try:
                    checked_path_to_file = path_traversal_check(unsafe_path_to_import_file, imports_folder_path)
                    if os.path.isfile(checked_path_to_file):
                        copyfile(checked_path_to_file, zip_path)
                except SuspiciousFileOperation as e:
                    logger.error("Error due importing assets from {} for {} in cause of path checking error".format(self.import_url, self))
                    raise NodeServerError(e)
            else:
                try:
                    # TODO: this is potentially vulnerable to a zip bomb attack
                    #       mitigated by the fact that a valid account is needed to
                    #       import tasks
                    logger.info("Importing task assets from {} for {}".format(self.import_url, self))
                    download_stream = requests.get(self.import_url, stream=True, timeout=10)
                    content_length = download_stream.headers.get('content-length')
                    total_length = int(content_length) if content_length is not None else None
                    downloaded = 0
                    last_update = 0

                    with open(zip_path, 'wb') as fd:
                        for chunk in download_stream.iter_content(4096):
                            downloaded += len(chunk)

                            if time.time() - last_update >= 2:
                                # Update progress
                                if total_length is not None:
                                    Task.objects.filter(pk=self.id).update(running_progress=(float(downloaded) / total_length) * 0.9)

                                self.check_if_canceled()
                                last_update = time.time()

                            fd.write(chunk)

                except (requests.exceptions.Timeout, requests.exceptions.ConnectionError, ReadTimeoutError) as e:
                    raise NodeServerError(e)

        self.refresh_from_db()

        try:
            self.extract_assets_and_complete()
        except zipfile.BadZipFile:
            raise NodeServerError(gettext("Invalid zip file"))

        images_json = self.assets_path("images.json")
        if os.path.exists(images_json):
            try:
                with open(images_json) as f:
                    images = json.load(f)
                    self.images_count = len(images)
            except:
                logger.warning("Cannot read images count from imported task {}".format(self))
                pass

        self.pending_action = None
        self.processing_time = 0
        self.save()

    def process(self):
        """
        This method contains the logic for processing tasks asynchronously
        from a background thread or from a worker. Here tasks that are
        ready to be processed execute some logic. This could be communication
        with a processing node or executing a pending action.
        """

        try:
            if self.pending_action == pending_actions.IMPORT:
                self.handle_import()

            if self.pending_action == pending_actions.RESIZE:
                resized_images = self.resize_images()
                self.refresh_from_db()
                self.resize_gcp(resized_images)
                self.pending_action = None
                self.save()

            if self.auto_processing_node and not self.status in [status_codes.FAILED, status_codes.CANCELED]:
                # No processing node assigned and need to auto assign
                if self.processing_node is None:
                    # Assign first online node with lowest queue count
                    self.processing_node = ProcessingNode.find_best_available_node()
                    if self.processing_node:
                        self.processing_node.queue_count += 1 # Doesn't have to be accurate, it will get overridden later
                        self.processing_node.save()

                        logger.info("Automatically assigned processing node {} to {}".format(self.processing_node, self))
                        self.save()

                # Processing node assigned, but is offline and no errors
                if self.processing_node and not self.processing_node.is_online():
                    # If we are queued up
                    # detach processing node, and reassignment
                    # will be processed at the next tick
                    if self.status == status_codes.QUEUED:
                        logger.info("Processing node {} went offline, reassigning {}...".format(self.processing_node, self))
                        self.uuid = ''
                        self.processing_node = None
                        self.status = None
                        self.save()

                    elif self.status == status_codes.RUNNING:
                        # Task was running and processing node went offline
                        # It could have crashed due to low memory
                        # or perhaps it went offline due to network errors.
                        # We can't easily differentiate between the two, so we need
                        # to notify the user because if it crashed due to low memory
                        # the user might need to take action (or be stuck in an infinite loop)
                        raise NodeServerError("Processing node went offline. This could be due to insufficient memory or a network error.")

            if self.processing_node:
                # Need to process some images (UUID not yet set and task doesn't have pending actions)?
                if not self.uuid and self.pending_action is None and self.status is None:
                    logger.info("Processing... {}".format(self))

                    images = [image.path() for image in self.imageupload_set.all()]

                    # Track upload progress, but limit the number of DB updates
                    # to every 2 seconds (and always record the 100% progress)
                    last_update = 0
                    def callback(progress):
                        nonlocal last_update

                        time_has_elapsed = time.time() - last_update >= 2
                        if time_has_elapsed:
                            testWatch.manual_log_call("Task.process.callback")
                            self.check_if_canceled()
                            Task.objects.filter(pk=self.id).update(upload_progress=float(progress) / 100.0)
                            last_update = time.time()

                    # This takes a while
                    try:
                        uuid = self.processing_node.process_new_task(images, self.name, self.options, callback)
                    except NodeConnectionError as e:
                        # If we can't create a task because the node is offline
                        # We want to fail instead of trying again
                        raise NodeServerError(gettext('Connection error: %(error)s') % {'error': str(e)})

                    # Refresh task object before committing change
                    self.refresh_from_db()
                    self.upload_progress = 1.0
                    self.uuid = uuid
                    self.save()

                    # TODO: log process has started processing

            if self.pending_action is not None:
                if self.pending_action == pending_actions.CANCEL:
                    # Do we need to cancel the task on the processing node?
                    logger.info("Canceling {}".format(self))
                    if self.processing_node and self.uuid:
                        # Attempt to cancel the task on the processing node
                        # We don't care if this fails (we tried)
                        try:
                            self.processing_node.cancel_task(self.uuid)
                        except OdmError:
                            logger.warning("Could not cancel {} on processing node. We'll proceed anyway...".format(self))

                        self.status = status_codes.CANCELED
                        self.pending_action = None
                        self.save()
                    else:
                        # Tasks with no processing node or UUID need no special action
                        self.status = status_codes.CANCELED
                        self.pending_action = None
                        self.save()

                elif self.pending_action == pending_actions.RESTART:
                    logger.info("Restarting {}".format(self))
                    if self.processing_node:

                        # Check if the UUID is still valid, as processing nodes purge
                        # results after a set amount of time, the UUID might have been eliminated.
                        uuid_still_exists = False

                        if self.uuid:
                            try:
                                info = self.processing_node.get_task_info(self.uuid)
                                uuid_still_exists = info.uuid == self.uuid
                            except OdmError:
                                pass

                        need_to_reprocess = False

                        if uuid_still_exists:
                            # Good to go
                            try:
                                self.processing_node.restart_task(self.uuid, self.options)
                            except (NodeServerError, NodeResponseError) as e:
                                # Something went wrong
                                logger.warning("Could not restart {}, will start a new one".format(self))
                                need_to_reprocess = True
                        else:
                            need_to_reprocess = True

                        if need_to_reprocess:
                            logger.info("{} needs to be reprocessed".format(self))

                            # Task has been purged (or processing node is offline)
                            # Process this as a new task
                            # Removing its UUID will cause the scheduler
                            # to process this the next tick
                            self.uuid = ''

                            # We also remove the "rerun-from" parameter if it's set
                            self.options = list(filter(lambda d: d['name'] != 'rerun-from', self.options))
                            self.upload_progress = 0

                        self.console_output = ""
                        self.processing_time = -1
                        self.status = None
                        self.last_error = None
                        self.pending_action = None
                        self.running_progress = 0
                        self.save()
                    else:
                        raise NodeServerError(gettext("Cannot restart a task that has no processing node"))

                elif self.pending_action == pending_actions.REMOVE:
                    logger.info("Removing {}".format(self))
                    if self.processing_node and self.uuid:
                        # Attempt to delete the resources on the processing node
                        # We don't care if this fails, as resources on processing nodes
                        # Are expected to be purged on their own after a set amount of time anyway
                        try:
                            self.processing_node.remove_task(self.uuid)
                        except OdmError:
                            pass

                    # What's more important is that we delete our task properly here
                    self.delete()

                    # Stop right here!
                    return

            if self.processing_node:
                # Need to update status (first time, queued or running?)
                if self.uuid and self.status in [None, status_codes.QUEUED, status_codes.RUNNING]:
                    # Update task info from processing node
                    if not self.console_output:
                        current_lines_count = 0
                    else:
                        current_lines_count = len(self.console_output.split("\n"))

                    info = self.processing_node.get_task_info(self.uuid, current_lines_count)

                    self.processing_time = info.processing_time
                    self.status = info.status.value

                    if len(info.output) > 0:
                        self.console_output += "\n".join(info.output) + '\n'

                    # Update running progress
                    self.running_progress = (info.progress / 100.0) * self.TASK_PROGRESS_LAST_VALUE

                    if info.last_error != "":
                        self.last_error = info.last_error

                    # Has the task just been canceled, failed, or completed?
                    if self.status in [status_codes.FAILED, status_codes.COMPLETED, status_codes.CANCELED]:
                        logger.info("Processing status: {} for {}".format(self.status, self))

                        if self.status == status_codes.COMPLETED:
                            assets_dir = self.assets_path("")

                            # Remove previous assets directory
                            if os.path.exists(assets_dir):
                                logger.info("Removing old assets directory: {} for {}".format(assets_dir, self))
                                shutil.rmtree(assets_dir)

                            os.makedirs(assets_dir)

                            # Download and try to extract results up to 4 times
                            # (~5% of the times, on large downloads, the archive could be corrupted)
                            retry_num = 0
                            extracted = False
                            last_update = 0

                            def callback(progress):
                                nonlocal last_update

                                time_has_elapsed = time.time() - last_update >= 2

                                if time_has_elapsed or int(progress) == 100:
                                    Task.objects.filter(pk=self.id).update(running_progress=(
                                        self.TASK_PROGRESS_LAST_VALUE + (float(progress) / 100.0) * 0.1))
                                    last_update = time.time()

                            while not extracted:
                                last_update = 0
                                logger.info("Downloading all.zip for {}".format(self))

                                # Download all assets
                                zip_path = self.processing_node.download_task_assets(self.uuid, assets_dir, progress_callback=callback, parallel_downloads=max(1, int(16 / (2 ** retry_num))))

                                # Rename to all.zip
                                all_zip_path = self.assets_path("all.zip")
                                os.rename(zip_path, all_zip_path)

                                logger.info("Extracting all.zip for {}".format(self))

                                try:
                                    self.extract_assets_and_complete()
                                    extracted = True
                                except zipfile.BadZipFile:
                                    if retry_num < 5:
                                        logger.warning("{} seems corrupted. Retrying...".format(all_zip_path))
                                        retry_num += 1
                                        os.remove(all_zip_path)
                                    else:
                                        raise NodeServerError(gettext("Invalid zip file"))
                        else:
                            # FAILED, CANCELED
                            self.save()
                    else:
                        # Still waiting...
                        self.save()

        except (NodeServerError, NodeResponseError) as e:
            self.set_failure(str(e))
        except NodeConnectionError as e:
            logger.warning("{} connection/timeout error: {}. We'll try reprocessing at the next tick.".format(self, str(e)))
        except TaskInterruptedException as e:
            # Task was interrupted during image resize / upload
            logger.warning("{} interrupted".format(self, str(e)))

    def extract_assets_and_complete(self):
        """
        Extracts assets/all.zip, populates task fields where required and assure COGs
        It will raise a zipfile.BadZipFile exception is the archive is corrupted.
        :return:
        """
        assets_dir = self.assets_path("")
        zip_path = self.assets_path("all.zip")

        # Extract from zip
        with zipfile.ZipFile(zip_path, "r") as zip_h:
            zip_h.extractall(assets_dir)

        logger.info("Extracted all.zip for {}".format(self))

        # Populate *_extent fields
        extent_fields = [
            (os.path.realpath(self.assets_path("odm_orthophoto", "odm_orthophoto.tif")),
             'orthophoto_extent'),
            (os.path.realpath(self.assets_path("odm_dem", "dsm.tif")),
             'dsm_extent'),
            (os.path.realpath(self.assets_path("odm_dem", "dtm.tif")),
             'dtm_extent'),
        ]

        for raster_path, field in extent_fields:
            if os.path.exists(raster_path):
                # Make sure this is a Cloud Optimized GeoTIFF
                # if not, it will be created
                try:
                    assure_cogeo(raster_path)
                except IOError as e:
                    logger.warning("Cannot create Cloud Optimized GeoTIFF for %s (%s). This will result in degraded visualization performance." % (raster_path, str(e)))

                # Read extent and SRID
                raster = GDALRaster(raster_path)
                extent = OGRGeometry.from_bbox(raster.extent)

                # Make sure PostGIS supports it
                with connection.cursor() as cursor:
                    cursor.execute("SELECT SRID FROM spatial_ref_sys WHERE SRID = %s", [raster.srid])
                    if cursor.rowcount == 0:
                        raise NodeServerError(gettext("Unsupported SRS %(code)s. Please make sure you picked a supported SRS.") % {'code': str(raster.srid)})

                # It will be implicitly transformed into the SRID of the model’s field
                # self.field = GEOSGeometry(...)
                setattr(self, field, GEOSGeometry(extent.wkt, srid=raster.srid))

                logger.info("Populated extent field with {} for {}".format(raster_path, self))

        self.update_available_assets_field()
        self.potree_scene = {}
        self.running_progress = 1.0
        self.console_output += gettext("Done!") + "\n"
        self.status = status_codes.COMPLETED
        self.save()

        from app.plugins import signals as plugin_signals
        plugin_signals.task_completed.send_robust(sender=self.__class__, task_id=self.id)

    def get_tile_path(self, tile_type, z, x, y):
        return self.assets_path("{}_tiles".format(tile_type), z, x, "{}.png".format(y))

    def get_tile_base_url(self, tile_type):
        # plant is just a special case of orthophoto
        if tile_type == 'plant':
            tile_type = 'orthophoto'

        return "/api/projects/{}/tasks/{}/{}/".format(self.project.id, self.id, tile_type)

    def get_map_items(self):
        types = []
        if 'orthophoto.tif' in self.available_assets: types.append('orthophoto')
        if 'orthophoto.tif' in self.available_assets: types.append('plant')
        if 'dsm.tif' in self.available_assets: types.append('dsm')
        if 'dtm.tif' in self.available_assets: types.append('dtm')

        camera_shots = ''
        if 'shots.geojson' in self.available_assets: camera_shots = '/api/projects/{}/tasks/{}/download/shots.geojson'.format(self.project.id, self.id)

        ground_control_points = ''
        if 'ground_control_points.geojson' in self.available_assets: ground_control_points = '/api/projects/{}/tasks/{}/download/ground_control_points.geojson'.format(self.project.id, self.id)

        return {
            'tiles': [{'url': self.get_tile_base_url(t), 'type': t} for t in types],
            'meta': {
                'task': {
                    'id': str(self.id),
                    'project': self.project.id,
                    'public': self.public,
                    'camera_shots': camera_shots,
                    'ground_control_points': ground_control_points
                }
            }
        }

    def get_model_display_params(self):
        """
        Subset of a task fields used in the 3D model display view
        """
        return {
            'id': str(self.id),
            'project': self.project.id,
            'available_assets': self.available_assets,
            'public': self.public
        }

    def generate_deferred_asset(self, archive, directory):
        """
        :param archive: path of the destination .zip file (relative to /assets/ directory)
        :param directory: path of the source directory to compress (relative to /assets/ directory)
        :return: full path of the generated archive
        """
        archive_path = self.assets_path(archive)
        directory_path = self.assets_path(directory)

        if not os.path.exists(directory_path):
            raise FileNotFoundError("{} does not exist".format(directory_path))

        if not os.path.exists(archive_path):
            shutil.make_archive(os.path.splitext(archive_path)[0], 'zip', directory_path)

        return archive_path

    def update_available_assets_field(self, commit=False):
        """
        Updates the available_assets field with the actual types of assets available
        :param commit: when True also saves the model, otherwise the user should manually call save()
        """
        all_assets = list(self.ASSETS_MAP.keys())
        self.available_assets = [asset for asset in all_assets if self.is_asset_available_slow(asset)]
        if commit: self.save()


    def delete(self, using=None, keep_parents=False):
        task_id = self.id
        from app.plugins import signals as plugin_signals
        plugin_signals.task_removing.send_robust(sender=self.__class__, task_id=task_id)

        directory_to_delete = os.path.join(settings.MEDIA_ROOT,
                                           task_directory_path(self.id, self.project.id))

        super(Task, self).delete(using, keep_parents)

        # Remove files related to this task
        try:
            shutil.rmtree(directory_to_delete)
        except FileNotFoundError as e:
            logger.warning(e)

        plugin_signals.task_removed.send_robust(sender=self.__class__, task_id=task_id)

    def set_failure(self, error_message):
        logger.error("FAILURE FOR {}: {}".format(self, error_message))
        self.last_error = error_message
        self.status = status_codes.FAILED
        self.pending_action = None
        self.save()
        
    def find_all_files_matching(self, regex):
        directory = full_task_directory_path(self.id, self.project.id)
        return [os.path.join(directory, f) for f in os.listdir(directory) if
                       re.match(regex, f, re.IGNORECASE)]

    def check_if_canceled(self):
        # Check if task has been canceled/removed
        if Task.objects.only("pending_action").get(pk=self.id).pending_action in [pending_actions.CANCEL,
                                                                                  pending_actions.REMOVE]:
            raise TaskInterruptedException()

    def resize_images(self):
        """
        Destructively resize this task's JPG images while retaining EXIF tags.
        Resulting images are always converted to JPG.
        TODO: add support for tiff files
        :return list containing paths of resized images and resize ratios
        """
        if self.resize_to < 0:
            logger.warning("We were asked to resize images to {}, this might be an error.".format(self.resize_to))
            return []

        images_path = self.find_all_files_matching(r'.*\.(jpe?g|tiff?)$')
        total_images = len(images_path)
        resized_images_count = 0
        last_update = 0

        def callback(retval=None):
            nonlocal last_update
            nonlocal resized_images_count
            nonlocal total_images

            resized_images_count += 1
            if time.time() - last_update >= 2:
                # Update progress
                Task.objects.filter(pk=self.id).update(resize_progress=(float(resized_images_count) / float(total_images)))
                self.check_if_canceled()
                last_update = time.time()

        resized_images = list(map(partial(resize_image, resize_to=self.resize_to, done=callback), images_path))

        Task.objects.filter(pk=self.id).update(resize_progress=1.0)

        return resized_images

    def resize_gcp(self, resized_images):
        """
        Destructively change this task's GCP file (if any)
        by resizing the location of GCP entries.
        :param resized_images: list of objects having "path" and "resize_ratio" keys
            for example [{'path': 'path/to/DJI_0018.jpg', 'resize_ratio': 0.25}, ...]
        :return: path to changed GCP file or None if no GCP file was found/changed
        """
        gcp_path = self.find_all_files_matching(r'.*\.txt$')
        if len(gcp_path) == 0: return None

        # Assume we only have a single GCP file per task
        gcp_path = gcp_path[0]

        image_ratios = {}
        for ri in resized_images:
            image_ratios[os.path.basename(ri['path']).lower()] = ri['resize_ratio']

        try:
            gcpFile = GCPFile(gcp_path)
            gcpFile.create_resized_copy(gcp_path, image_ratios)
            logger.info("Resized GCP file {}".format(gcp_path))
            return gcp_path
        except Exception as e:
            logger.warning("Could not resize GCP file {}: {}".format(gcp_path, str(e)))


    def create_task_directories(self):
        """
        Create directories for this task (if they don't exist already)
        """
        assets_dir = self.assets_path("")
        try:
            os.makedirs(assets_dir)
        except OSError as exc:  # Python >2.5
            if exc.errno == errno.EEXIST and os.path.isdir(assets_dir):
                pass
            else:
                raise
