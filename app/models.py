from __future__ import unicode_literals

from django.db import models
from django.db.models import signals
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

def assets_directory_path(taskId, projectId, filename):
    # files will be uploaded to MEDIA_ROOT/project/<id>/task/<id>/<filename>
    return 'project/{0}/task/{1}/{2}'.format(projectId, taskId, filename)


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
    STATUS_CODES = (
        (10, 'QUEUED'),
        (20, 'RUNNING'),
        (30, 'FAILED'),
        (40, 'COMPLETED'),
        (50, 'CANCELED')
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
    console_output = models.TextField(null=True, blank=True, help_text="Console output of the OpenDroneMap's process")
    ground_control_points = models.FileField(null=True, blank=True, upload_to=gcp_directory_path, help_text="Optional Ground Control Points file to use for processing")

    # georeferenced_model
    # orthophoto
    # textured_model
    # mission
    created_at = models.DateTimeField(default=timezone.now, help_text="Creation date")

    def __str__(self):
        return 'Task ID: {}'.format(self.id)

    def save(self, *args, **kwargs):
        # Autovalidate on save
        self.full_clean()
        super(Task, self).save(*args, **kwargs)

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
        # Nothing to do if we don't have a processing node...
        if not self.processing_node: return
        
        # Need to process some images (UUID not yet set)?
        if not self.uuid:
            print("Processing... {}".format(self))

            images = [image.path() for image in self.imageupload_set.all()]

            try:
                self.uuid = self.processing_node.process_new_task(images, self.name, self.options)
                self.save()

                # TODO: log process has started processing

            except ProcessingException, e:
                print("TASK ERROR: " + e.message)

        # Need to update status (first time, queued or running?)
        if self.uuid and self.status in [None, 10, 20]:
            print("Have UUID: {}".format(self.uuid))
            
            # Update task info from processing node
            try:
                info = self.processing_node.get_task_info(self.uuid)
                
                self.processing_time = info["processingTime"]
                self.status = info["status"]["code"]

                if "errorMessage" in info["status"]:
                    self.last_error = info["status"]["errorMessage"]

                # Has the task just been canceled, failed, or completed?
                # Note that we don't save the status code right away,
                # if the assets retrieval fails we want to retry again.
                if self.status in [30, 40, 50]:
                    print("ALMOST DONE: " + str(self.status))

                    # Completed?
                    if self.status == 40:
                        # TODO: retrieve assets
                        pass
                    else:
                        self.save()
                else:
                    # Still waiting...
                    self.save()
            except ProcessingException, e:
                print("TASK ERROR 2: " + e.message)


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
