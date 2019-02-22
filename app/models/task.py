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

import requests
from PIL import Image
from django.contrib.gis.gdal import GDALRaster
from django.contrib.gis.gdal import OGRGeometry
from django.contrib.gis.geos import GEOSGeometry
from django.contrib.postgres import fields
from django.core.exceptions import ValidationError
from django.db import models
from django.db import transaction
from django.utils import timezone
from urllib3.exceptions import ReadTimeoutError

from app import pending_actions
from django.contrib.gis.db.models.fields import GeometryField

from app.testwatch import testWatch
from nodeodm import status_codes
from nodeodm.models import ProcessingNode
from pyodm.exceptions import NodeResponseError, NodeConnectionError, NodeServerError, OdmError
from webodm import settings
from .project import Project

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

        im.thumbnail((resized_width, resized_height), Image.LANCZOS)

        if 'exif' in im.info:
            exif_dict = piexif.load(im.info['exif'])
            exif_dict['Exif'][piexif.ExifIFD.PixelXDimension] = resized_width
            exif_dict['Exif'][piexif.ExifIFD.PixelYDimension] = resized_height
            im.save(resized_image_path, "JPEG", exif=piexif.dump(exif_dict), quality=100)
        else:
            im.save(resized_image_path, "JPEG", quality=100)

        im.close()

        # Delete original image, rename resized image to original
        os.remove(image_path)
        os.rename(resized_image_path, image_path)

        logger.info("Resized {} to {}x{}".format(image_path, resized_width, resized_height))
    except IOError as e:
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

    # Not an exact science
    TASK_OUTPUT_MILESTONES_LAST_VALUE = 0.85
    TASK_OUTPUT_MILESTONES = {
        'Running ODM Load Dataset Cell': 0.01,
        'Running ODM Load Dataset Cell - Finished': 0.05,
        'opensfm/bin/opensfm match_features': 0.10,
        'opensfm/bin/opensfm reconstruct': 0.20,
        'opensfm/bin/opensfm export_visualsfm': 0.30,
        'Running ODM Meshing Cell': 0.50,
        'Running MVS Texturing Cell': 0.55,
        'Running ODM Georeferencing Cell': 0.60,
        'Running ODM DEM Cell': 0.70,
        'Running ODM Orthophoto Cell': 0.75,
        'Running ODM OrthoPhoto Cell - Finished': 0.80,
        'Compressing all.zip:': TASK_OUTPUT_MILESTONES_LAST_VALUE
    }

    id = models.UUIDField(primary_key=True, default=uuid_module.uuid4, unique=True, serialize=False, editable=False)

    uuid = models.CharField(max_length=255, db_index=True, default='', blank=True, help_text="Identifier of the task (as returned by OpenDroneMap's REST API)")
    project = models.ForeignKey(Project, on_delete=models.CASCADE, help_text="Project that this task belongs to")
    name = models.CharField(max_length=255, null=True, blank=True, help_text="A label for the task")
    processing_time = models.IntegerField(default=-1, help_text="Number of milliseconds that elapsed since the beginning of this task (-1 indicates that no information is available)")
    processing_node = models.ForeignKey(ProcessingNode, on_delete=models.SET_NULL, null=True, blank=True, help_text="Processing node assigned to this task (or null if this task has not been associated yet)")
    auto_processing_node = models.BooleanField(default=True, help_text="A flag indicating whether this task should be automatically assigned a processing node")
    status = models.IntegerField(choices=STATUS_CODES, db_index=True, null=True, blank=True, help_text="Current status of the task")
    last_error = models.TextField(null=True, blank=True, help_text="The last processing error received")
    options = fields.JSONField(default=dict, blank=True, help_text="Options that are being used to process this task", validators=[validate_task_options])
    available_assets = fields.ArrayField(models.CharField(max_length=80), default=list, blank=True, help_text="List of available assets to download")
    console_output = models.TextField(null=False, default="", blank=True, help_text="Console output of the OpenDroneMap's process")

    orthophoto_extent = GeometryField(null=True, blank=True, srid=4326, help_text="Extent of the orthophoto created by OpenDroneMap")
    dsm_extent = GeometryField(null=True, blank=True, srid=4326, help_text="Extent of the DSM created by OpenDroneMap")
    dtm_extent = GeometryField(null=True, blank=True, srid=4326, help_text="Extent of the DTM created by OpenDroneMap")

    # mission
    created_at = models.DateTimeField(default=timezone.now, help_text="Creation date")
    pending_action = models.IntegerField(choices=PENDING_ACTIONS, db_index=True, null=True, blank=True, help_text="A requested action to be performed on the task. The selected action will be performed by the worker at the next iteration.")

    public = models.BooleanField(default=False, help_text="A flag indicating whether this task is available to the public")
    resize_to = models.IntegerField(default=-1, help_text="When set to a value different than -1, indicates that the images for this task have been / will be resized to the size specified here before processing.")

    upload_progress = models.FloatField(default=0.0,
                                        help_text="Value between 0 and 1 indicating the upload progress of this task's files to the processing node",
                                        blank=True)
    resize_progress = models.FloatField(default=0.0,
                                        help_text="Value between 0 and 1 indicating the resize progress of this task's images",
                                        blank=True)
    running_progress = models.FloatField(default=0.0,
                                        help_text="Value between 0 and 1 indicating the running progress (estimated) of this task",
                                        blank=True)
    import_url = models.TextField(null=False, default="", blank=True, help_text="URL this task is imported from (only for imported tasks)")
    images_count = models.IntegerField(null=False, blank=True, default=0, help_text="Number of images associated with this task")

    def __init__(self, *args, **kwargs):
        super(Task, self).__init__(*args, **kwargs)

        # To help keep track of changes to the project id
        self.__original_project_id = self.project.id

    def __str__(self):
        name = self.name if self.name is not None else "unnamed"

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

        # Autovalidate on save
        self.full_clean()

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
        self.console_output += "Importing assets...\n"
        self.save()

        zip_path = self.assets_path("all.zip")

        if self.import_url and not os.path.exists(zip_path):
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
        self.extract_assets_and_complete()

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
                        raise NodeServerError('Connection error: ' + str(e))

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
                    elif self.import_url:
                        # Imported tasks need no special action
                        self.status = status_codes.CANCELED
                        self.pending_action = None
                        self.save()
                    else:
                        raise NodeServerError("Cannot cancel a task that has no processing node or UUID")

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
                        raise NodeServerError("Cannot restart a task that has no processing node")

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
                    info = self.processing_node.get_task_info(self.uuid)

                    self.processing_time = info.processing_time
                    self.status = info.status.value

                    current_lines_count = len(self.console_output.split("\n"))
                    console_output = self.processing_node.get_task_console_output(self.uuid, current_lines_count)
                    if len(console_output) > 0:
                        self.console_output += "\n".join(console_output) + '\n'

                        # Update running progress
                        for line in console_output:
                            for line_match, value in self.TASK_OUTPUT_MILESTONES.items():
                                if line_match in line:
                                    self.running_progress = value
                                    break

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

                            logger.info("Downloading all.zip for {}".format(self))

                            # Download all assets
                            last_update = 0

                            def callback(progress):
                                nonlocal last_update

                                time_has_elapsed = time.time() - last_update >= 2

                                if time_has_elapsed or int(progress) == 100:
                                    Task.objects.filter(pk=self.id).update(running_progress=(
                                    self.TASK_OUTPUT_MILESTONES_LAST_VALUE + (float(progress) / 100.0) * 0.1))
                                    last_update = time.time()

                            zip_path = self.processing_node.download_task_assets(self.uuid, assets_dir, progress_callback=callback)

                            # Rename to all.zip
                            os.rename(zip_path, os.path.join(os.path.dirname(zip_path), 'all.zip'))

                            logger.info("Extracting all.zip for {}".format(self))

                            self.extract_assets_and_complete()
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
        Extracts assets/all.zip and populates task fields where required.
        :return:
        """
        assets_dir = self.assets_path("")
        zip_path = self.assets_path("all.zip")

        # Extract from zip
        try:
            with zipfile.ZipFile(zip_path, "r") as zip_h:
                zip_h.extractall(assets_dir)
        except zipfile.BadZipFile:
            raise NodeServerError("Invalid zip file")

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
                # Read extent and SRID
                raster = GDALRaster(raster_path)
                extent = OGRGeometry.from_bbox(raster.extent)

                # It will be implicitly transformed into the SRID of the model’s field
                # self.field = GEOSGeometry(...)
                setattr(self, field, GEOSGeometry(extent.wkt, srid=raster.srid))

                logger.info("Populated extent field with {} for {}".format(raster_path, self))

        self.update_available_assets_field()
        self.running_progress = 1.0
        self.console_output += "Done!\n"
        self.status = status_codes.COMPLETED
        self.save()

        from app.plugins import signals as plugin_signals
        plugin_signals.task_completed.send_robust(sender=self.__class__, task_id=self.id)

    def get_tile_path(self, tile_type, z, x, y):
        return self.assets_path("{}_tiles".format(tile_type), z, x, "{}.png".format(y))

    def get_tile_json_url(self, tile_type):
        return "/api/projects/{}/tasks/{}/{}/tiles.json".format(self.project.id, self.id, tile_type)

    def get_map_items(self):
        types = []
        if 'orthophoto.tif' in self.available_assets: types.append('orthophoto')
        if 'dsm.tif' in self.available_assets: types.append('dsm')
        if 'dtm.tif' in self.available_assets: types.append('dtm')

        return {
            'tiles': [{'url': self.get_tile_json_url(t), 'type': t} for t in types],
            'meta': {
                'task': {
                    'id': str(self.id),
                    'project': self.project.id,
                    'public': self.public
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

        images_path = self.find_all_files_matching(r'.*\.jpe?g$')
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
        resize_script_path = os.path.join(settings.BASE_DIR, 'app', 'scripts', 'resize_gcp.js')

        dict = {}
        for ri in resized_images:
            dict[os.path.basename(ri['path'])] = ri['resize_ratio']

        try:
            new_gcp_content = subprocess.check_output("node {} {} '{}'".format(quote(resize_script_path), quote(gcp_path), json.dumps(dict)), shell=True)
            with open(gcp_path, 'w') as f:
                f.write(new_gcp_content.decode('utf-8'))
            logger.info("Resized GCP file {}".format(gcp_path))
            return gcp_path
        except subprocess.CalledProcessError as e:
            logger.warning("Could not resize GCP file {}: {}".format(gcp_path, str(e)))
            return None

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
