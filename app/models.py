import time, os

from django.contrib.gis.gdal import GDALRaster
from django.db import models
from django.db.models import signals
from django.contrib.gis.db import models as gismodels
from django.utils import timezone
from django.contrib.auth.models import User
from django.contrib.postgres import fields
from nodeodm.models import ProcessingNode
from guardian.shortcuts import get_perms_for_model, assign_perm
from guardian.models import UserObjectPermissionBase
from guardian.models import GroupObjectPermissionBase
from django.core.exceptions import ValidationError
from django.dispatch import receiver
from nodeodm.exceptions import ProcessingException
from django.db import transaction
from nodeodm import status_codes
from webodm import settings
import logging, zipfile, shutil

logger = logging.getLogger('app.logger')


def task_directory_path(taskId, projectId):
    return 'project/{0}/task/{1}/'.format(projectId, taskId)


def assets_directory_path(taskId, projectId, filename):
    # files will be uploaded to MEDIA_ROOT/project/<id>/task/<id>/<filename>
    return '{0}{1}'.format(task_directory_path(taskId, projectId), filename)


class Project(models.Model):
    owner = models.ForeignKey(User, on_delete=models.PROTECT, help_text="The person who created the project")
    name = models.CharField(max_length=255, help_text="A label used to describe the project")
    description = models.TextField(null=True, blank=True, help_text="More in-depth description of the project")
    created_at = models.DateTimeField(default=timezone.now, help_text="Creation date")

    def __str__(self):
        return self.name

    def tasks(self, pk=None):
        return Task.objects.filter(project=self);

    class Meta:
        permissions = (
            ('view_project', 'Can view project'),
        )


@receiver(signals.post_save, sender=Project, dispatch_uid="project_post_save")
def project_post_save(sender, instance, created, **kwargs):
    """
    Automatically assigns all permissions to the owner. If the owner changes
    it's up to the user/developer to remove the previous owner's permissions.
    """
    for perm in get_perms_for_model(sender).all():
        assign_perm(perm.codename, instance.owner, instance)


class ProjectUserObjectPermission(UserObjectPermissionBase):
    content_object = models.ForeignKey(Project)


class ProjectGroupObjectPermission(GroupObjectPermissionBase):
    content_object = models.ForeignKey(Project)


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
    class PendingActions:
        CANCEL = 1
        REMOVE = 2
        RESTART = 3

    STATUS_CODES = (
        (status_codes.QUEUED, 'QUEUED'),
        (status_codes.RUNNING, 'RUNNING'),
        (status_codes.FAILED, 'FAILED'),
        (status_codes.COMPLETED, 'COMPLETED'),
        (status_codes.CANCELED, 'CANCELED')
    )

    PENDING_ACTIONS = (
        (PendingActions.CANCEL, 'CANCEL'),
        (PendingActions.REMOVE, 'REMOVE'),
        (PendingActions.RESTART, 'RESTART'),
    )

    uuid = models.CharField(max_length=255, db_index=True, default='', blank=True, help_text="Identifier of the task (as returned by OpenDroneMap's REST API)")
    project = models.ForeignKey(Project, on_delete=models.CASCADE, help_text="Project that this task belongs to")
    name = models.CharField(max_length=255, null=True, blank=True, help_text="A label for the task")
    processing_lock = models.BooleanField(default=False, help_text="A flag indicating whether this task is currently locked for processing. When this flag is turned on, the task is in the middle of a processing step.")
    processing_time = models.IntegerField(default=-1, help_text="Number of milliseconds that elapsed since the beginning of this task (-1 indicates that no information is available)")
    processing_node = models.ForeignKey(ProcessingNode, null=True, blank=True, help_text="Processing node assigned to this task (or null if this task has not been associated yet)")
    status = models.IntegerField(choices=STATUS_CODES, db_index=True, null=True, blank=True, help_text="Current status of the task")
    last_error = models.TextField(null=True, blank=True, help_text="The last processing error received")
    options = fields.JSONField(default=dict(), blank=True, help_text="Options that are being used to process this task", validators=[validate_task_options])
    console_output = models.TextField(null=False, default="", blank=True, help_text="Console output of the OpenDroneMap's process")
    ground_control_points = models.FileField(null=True, blank=True, upload_to=gcp_directory_path, help_text="Optional Ground Control Points file to use for processing")

    # georeferenced_model
    orthophoto = gismodels.RasterField(null=True, blank=True, srid=4326, help_text="Orthophoto created by OpenDroneMap")
    # textured_model
    # mission
    created_at = models.DateTimeField(default=timezone.now, help_text="Creation date")
    pending_action = models.IntegerField(choices=PENDING_ACTIONS, db_index=True, null=True, blank=True, help_text="A requested action to be performed on the task. When set to a value other than NONE, the selected action will be performed by the scheduler at the next iteration.")

    def __str__(self):
        return 'Task ID: {}'.format(self.id)

    def save(self, *args, **kwargs):
        # Autovalidate on save
        self.full_clean()
        super(Task, self).save(*args, **kwargs)

    def media_path(self, path):
        """
        Get a path relative to the media directory of this task
        """
        return os.path.join(settings.MEDIA_ROOT,
                           assets_directory_path(self.id, self.project.id, path))

    @staticmethod
    def create_from_images(images, project):
        '''
        Create a new task from a set of input images (such as the ones coming from request.FILES). 
        This will happen inside a transaction so if one of the images 
        fails to load, the task will not be created.
        '''
        with transaction.atomic():
            task = Task.objects.create(project=project)

            for image in images:
                ImageUpload.objects.create(task=task, image=image)

            return task

        # In case of error
        return None

    def process(self):
        """
        This method contains the logic for processing tasks asynchronously
        from a background thread or from the scheduler. Here tasks that are
        ready to be processed execute some logic. This could be communication
        with a processing node or executing a pending action.
        """

        if self.processing_node:
            # Need to process some images (UUID not yet set)?
            if not self.uuid:
                logger.info("Processing... {}".format(self))

                images = [image.path() for image in self.imageupload_set.all()]

                try:
                    # This takes a while
                    uuid = self.processing_node.process_new_task(images, self.name, self.options)

                    # Refresh task object before committing change
                    self.refresh_from_db()
                    self.uuid = uuid
                    self.save()

                    # TODO: log process has started processing

                except ProcessingException as e:
                    self.set_failure(str(e))


        if self.pending_action is not None:
            try:
                if self.pending_action == self.PendingActions.CANCEL:
                    # Do we need to cancel the task on the processing node?
                    logger.info("Canceling task {}".format(self))
                    if self.processing_node and self.uuid:
                        self.processing_node.cancel_task(self.uuid)
                        self.pending_action = None
                        self.save()
                    else:
                        raise ProcessingException("Cannot cancel a task that has no processing node or UUID")

                elif self.pending_action == self.PendingActions.RESTART:
                    logger.info("Restarting task {}".format(self))
                    if self.processing_node and self.uuid:

                        # Check if the UUID is still valid, as processing nodes purge
                        # results after a set amount of time, the UUID might have eliminated.
                        try:
                            info = self.processing_node.get_task_info(self.uuid)
                            uuid_still_exists = info['uuid'] == self.uuid
                        except ProcessingException:
                            uuid_still_exists = False

                        if uuid_still_exists:
                            # Good to go
                            self.processing_node.restart_task(self.uuid)
                        else:
                            # Task has been purged (or processing node is offline)
                            # TODO: what if processing node went offline?

                            # Process this as a new task
                            # Removing its UUID will cause the scheduler
                            # to process this the next tick
                            self.uuid = None

                        self.console_output = ""
                        self.processing_time = -1
                        self.status = None
                        self.last_error = None
                        self.pending_action = None
                        self.save()
                    else:
                        raise ProcessingException("Cannot restart a task that has no processing node or UUID")

                elif self.pending_action == self.PendingActions.REMOVE:
                    logger.info("Removing task {}".format(self))
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

            except ProcessingException as e:
                self.last_error = str(e)
                self.save()


        if self.processing_node:
            # Need to update status (first time, queued or running?)
            if self.uuid and self.status in [None, status_codes.QUEUED, status_codes.RUNNING]:
                # Update task info from processing node
                try:
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
                            try:
                                orthophoto_stream = self.processing_node.download_task_asset(self.uuid, "orthophoto.tif")
                                orthophoto_path = self.media_path("orthophoto.tif")

                                # Save to disk original photo
                                with open(orthophoto_path, 'wb') as fd:
                                    for chunk in orthophoto_stream.iter_content(4096):
                                        fd.write(chunk)

                                # Add to database another copy
                                self.orthophoto = GDALRaster(orthophoto_path, write=True)

                                # Download tiles
                                tiles_zip_stream = self.processing_node.download_task_asset(self.uuid, "orthophoto_tiles.zip")
                                tiles_zip_path = self.media_path("orthophoto_tiles.zip")
                                with open(tiles_zip_path, 'wb') as fd:
                                    for chunk in tiles_zip_stream.iter_content(4096):
                                        fd.write(chunk)

                                # Extract from zip
                                with zipfile.ZipFile(tiles_zip_path, "r") as zip_h:
                                    zip_h.extractall(self.media_path(""))

                                # Delete zip archive
                                os.remove(tiles_zip_path)

                                self.save()
                            except ProcessingException as e:
                                self.set_failure(str(e))
                        else:
                            # FAILED, CANCELED
                            self.save()
                    else:
                        # Still waiting...
                        self.save()
                except ProcessingException as e:
                    self.set_failure(str(e))

    def get_tile_path(self, z, x, y):
        return self.media_path(os.path.join("orthophoto_tiles", z, x, "{}.png".format(y)))

    def delete(self, using=None, keep_parents=False):
        directory_to_delete = os.path.join(settings.MEDIA_ROOT,
                                           task_directory_path(self.id, self.project.id))

        super(Task, self).delete(using, keep_parents)

        # Remove files related to this task
        try:
            shutil.rmtree(directory_to_delete)
        except FileNotFoundError as e:
            logger.warn(e)


    def set_failure(self, error_message):
        logger.error("{} ERROR: {}".format(self, error_message))
        self.last_error = error_message
        self.status = status_codes.FAILED
        self.save()


    class Meta:
        permissions = (
            ('view_task', 'Can view task'),
        )


def image_directory_path(imageUpload, filename):
    return assets_directory_path(imageUpload.task.id, imageUpload.task.project.id, filename)

class ImageUpload(models.Model):
    task = models.ForeignKey(Task, on_delete=models.CASCADE, help_text="Task this image belongs to")
    image = models.ImageField(upload_to=image_directory_path, help_text="File uploaded by a user")
    
    def __str__(self):
        return self.image.name

    def path(self):
        return self.image.path
