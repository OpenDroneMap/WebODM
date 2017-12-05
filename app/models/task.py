import logging
import os
import shutil
import zipfile
import uuid as uuid_module

from django.contrib.gis.gdal import GDALRaster
from django.contrib.gis.gdal import OGRGeometry
from django.contrib.gis.geos import GEOSGeometry
from django.contrib.postgres import fields
from django.core.exceptions import ValidationError
from django.db import models
from django.db import transaction
from django.utils import timezone

from app import pending_actions
from django.contrib.gis.db.models.fields import GeometryField

from nodeodm import status_codes
from nodeodm.exceptions import ProcessingError, ProcessingTimeout, ProcessingException
from nodeodm.models import ProcessingNode
from webodm import settings
from .project import Project

logger = logging.getLogger('app.logger')



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


class Task(models.Model):
    ASSETS_MAP = {
            'all.zip': 'all.zip',
            'orthophoto.tif': os.path.join('odm_orthophoto', 'odm_orthophoto.tif'),
            'orthophoto.png': os.path.join('odm_orthophoto', 'odm_orthophoto.png'),
            'georeferenced_model.las': os.path.join('odm_georeferencing', 'odm_georeferenced_model.las'),
            'georeferenced_model.ply': os.path.join('odm_georeferencing', 'odm_georeferenced_model.ply'),
            'georeferenced_model.csv': os.path.join('odm_georeferencing', 'odm_georeferenced_model.csv'),
            'textured_model.zip': {
                'deferred_path': 'textured_model.zip',
                'deferred_compress_dir': 'odm_texturing'
            },
            'dtm.tif': os.path.join('odm_dem', 'dtm.tif'),
            'dsm.tif': os.path.join('odm_dem', 'dsm.tif'),
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
    )

    id = models.UUIDField(primary_key=True, default=uuid_module.uuid4, unique=True, serialize=False, editable=False)

    uuid = models.CharField(max_length=255, db_index=True, default='', blank=True, help_text="Identifier of the task (as returned by OpenDroneMap's REST API)")
    project = models.ForeignKey(Project, on_delete=models.CASCADE, help_text="Project that this task belongs to")
    name = models.CharField(max_length=255, null=True, blank=True, help_text="A label for the task")
    processing_lock = models.BooleanField(default=False, help_text="A flag indicating whether this task is currently locked for processing. When this flag is turned on, the task is in the middle of a processing step.")
    processing_time = models.IntegerField(default=-1, help_text="Number of milliseconds that elapsed since the beginning of this task (-1 indicates that no information is available)")
    processing_node = models.ForeignKey(ProcessingNode, null=True, blank=True, help_text="Processing node assigned to this task (or null if this task has not been associated yet)")
    auto_processing_node = models.BooleanField(default=True, help_text="A flag indicating whether this task should be automatically assigned a processing node")
    status = models.IntegerField(choices=STATUS_CODES, db_index=True, null=True, blank=True, help_text="Current status of the task")
    last_error = models.TextField(null=True, blank=True, help_text="The last processing error received")
    options = fields.JSONField(default=dict(), blank=True, help_text="Options that are being used to process this task", validators=[validate_task_options])
    available_assets = fields.ArrayField(models.CharField(max_length=80), default=list(), blank=True, help_text="List of available assets to download")
    console_output = models.TextField(null=False, default="", blank=True, help_text="Console output of the OpenDroneMap's process")
    ground_control_points = models.FileField(null=True, blank=True, upload_to=gcp_directory_path, help_text="Optional Ground Control Points file to use for processing")

    orthophoto_extent = GeometryField(null=True, blank=True, srid=4326, help_text="Extent of the orthophoto created by OpenDroneMap")
    dsm_extent = GeometryField(null=True, blank=True, srid=4326, help_text="Extent of the DSM created by OpenDroneMap")
    dtm_extent = GeometryField(null=True, blank=True, srid=4326, help_text="Extent of the DTM created by OpenDroneMap")

    # mission
    created_at = models.DateTimeField(default=timezone.now, help_text="Creation date")
    pending_action = models.IntegerField(choices=PENDING_ACTIONS, db_index=True, null=True, blank=True, help_text="A requested action to be performed on the task. The selected action will be performed by the scheduler at the next iteration.")

    public = models.BooleanField(default=False, help_text="A flag indicating whether this task is available to the public")


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
        return os.path.join(settings.MEDIA_ROOT,
                            assets_directory_path(self.id, self.project.id, ""),
                            "assets",
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

    def process(self):
        """
        This method contains the logic for processing tasks asynchronously
        from a background thread or from the scheduler. Here tasks that are
        ready to be processed execute some logic. This could be communication
        with a processing node or executing a pending action.
        """

        try:
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
                    # Detach processing node, will be processed at the next tick
                    logger.info("Processing node {} went offline, reassigning {}...".format(self.processing_node, self))
                    self.uuid = ''
                    self.processing_node = None
                    self.save()

            if self.processing_node:
                # Need to process some images (UUID not yet set and task doesn't have pending actions)?
                if not self.uuid and self.pending_action is None and self.status is None:
                    logger.info("Processing... {}".format(self))

                    images = [image.path() for image in self.imageupload_set.all()]

                    # This takes a while
                    uuid = self.processing_node.process_new_task(images, self.name, self.options)

                    # Refresh task object before committing change
                    self.refresh_from_db()
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
                            self.status = None
                        except ProcessingException:
                            logger.warning("Could not cancel {} on processing node. We'll proceed anyway...".format(self))
                            self.status = status_codes.CANCELED

                        self.pending_action = None
                        self.save()
                    else:
                        raise ProcessingError("Cannot cancel a task that has no processing node or UUID")

                elif self.pending_action == pending_actions.RESTART:
                    logger.info("Restarting {}".format(self))
                    if self.processing_node:

                        # Check if the UUID is still valid, as processing nodes purge
                        # results after a set amount of time, the UUID might have eliminated.
                        uuid_still_exists = False

                        if self.uuid:
                            try:
                                info = self.processing_node.get_task_info(self.uuid)
                                uuid_still_exists = info['uuid'] == self.uuid
                            except ProcessingException:
                                pass

                        if uuid_still_exists:
                            # Good to go
                            try:
                                self.processing_node.restart_task(self.uuid)
                            except ProcessingError as e:
                                # Something went wrong
                                logger.warning("Could not restart {}, will start a new one".format(self))
                                self.uuid = ''
                        else:
                            # Task has been purged (or processing node is offline)
                            # Process this as a new task
                            # Removing its UUID will cause the scheduler
                            # to process this the next tick
                            self.uuid = ''

                        self.console_output = ""
                        self.processing_time = -1
                        self.status = None
                        self.last_error = None
                        self.pending_action = None
                        self.save()
                    else:
                        raise ProcessingError("Cannot restart a task that has no processing node")

                elif self.pending_action == pending_actions.REMOVE:
                    logger.info("Removing {}".format(self))
                    if self.processing_node and self.uuid:
                        # Attempt to delete the resources on the processing node
                        # We don't care if this fails, as resources on processing nodes
                        # Are expected to be purged on their own after a set amount of time anyway
                        try:
                            self.processing_node.remove_task(self.uuid)
                        except ProcessingException:
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

                    self.processing_time = info["processingTime"]
                    self.status = info["status"]["code"]

                    current_lines_count = len(self.console_output.split("\n")) - 1
                    self.console_output += self.processing_node.get_task_console_output(self.uuid, current_lines_count)

                    if "errorMessage" in info["status"]:
                        self.last_error = info["status"]["errorMessage"]

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
                            zip_stream = self.processing_node.download_task_asset(self.uuid, "all.zip")
                            zip_path = os.path.join(assets_dir, "all.zip")
                            with open(zip_path, 'wb') as fd:
                                for chunk in zip_stream.iter_content(4096):
                                    fd.write(chunk)

                            logger.info("Done downloading all.zip for {}".format(self))

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
                                    # Read extent and SRID
                                    raster = GDALRaster(raster_path)
                                    extent = OGRGeometry.from_bbox(raster.extent)

                                    # It will be implicitly transformed into the SRID of the model’s field
                                    # self.field = GEOSGeometry(...)
                                    setattr(self, field, GEOSGeometry(extent.wkt, srid=raster.srid))

                                    logger.info("Populated extent field with {} for {}".format(raster_path, self))

                            self.update_available_assets_field()
                            self.save()
                        else:
                            # FAILED, CANCELED
                            self.save()
                    else:
                        # Still waiting...
                        self.save()

        except ProcessingError as e:
            self.set_failure(str(e))
        except (ConnectionRefusedError, ConnectionError) as e:
            logger.warning("{} cannot communicate with processing node: {}".format(self, str(e)))
        except ProcessingTimeout as e:
            logger.warning("{} timed out with error: {}. We'll try reprocessing at the next tick.".format(self, str(e)))


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
        directory_to_delete = os.path.join(settings.MEDIA_ROOT,
                                           task_directory_path(self.id, self.project.id))

        super(Task, self).delete(using, keep_parents)

        # Remove files related to this task
        try:
            shutil.rmtree(directory_to_delete)
        except FileNotFoundError as e:
            logger.warning(e)


    def set_failure(self, error_message):
        logger.error("FAILURE FOR {}: {}".format(self, error_message))
        self.last_error = error_message
        self.status = status_codes.FAILED
        self.pending_action = None
        self.save()

    class Meta:
        permissions = (
            ('view_task', 'Can view task'),
        )

