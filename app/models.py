from __future__ import unicode_literals

from django.db import models
from django.db.models import signals
from django.utils import timezone
from django.contrib.auth.models import User
from django.contrib.postgres import fields
from nodeodm.models import ProcessingNode
from django.dispatch import receiver
from guardian.shortcuts import get_perms_for_model, assign_perm
from guardian.models import UserObjectPermissionBase
from guardian.models import GroupObjectPermissionBase

def assets_directory_path(taskId, projectId, filename):
    # files will be uploaded to MEDIA_ROOT/project_<id>/task_<id>/<filename>
    return 'project_{0}/task_{1}/{2}'.format(taskId, projectId, filename)


class Project(models.Model):
    owner = models.ForeignKey(User, on_delete=models.PROTECT, help_text="The person who created the project")
    name = models.CharField(max_length=255, help_text="A label used to describe the project")
    description = models.TextField(null=True, blank=True, help_text="More in-depth description of the project")
    created_at = models.DateTimeField(default=timezone.now, help_text="Creation date")

    def __str__(self):
        return self.name

    def tasks(self):
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

class Task(models.Model):
    STATUS_CODES = (
        (10, 'QUEUED'),
        (20, 'RUNNING'),
        (30, 'FAILED'),
        (40, 'COMPLETED'),
        (50, 'CANCELED')
    )

    uuid = models.CharField(max_length=255, null=True, blank=True, unique=True, help_text="Unique identifier of the task (as returned by OpenDroneMap's REST API)")
    project = models.ForeignKey(Project, on_delete=models.CASCADE, help_text="Project that this task belongs to")
    name = models.CharField(max_length=255, null=True, blank=True, help_text="A label for the task")
    processing_time = models.IntegerField(default=-1, help_text="Number of milliseconds that elapsed since the beginning of this task (-1 indicates that no information is available)")
    processing_node = models.ForeignKey(ProcessingNode, null=True, blank=True, help_text="Processing node assigned to this task (or null if this task has not been associated yet)")
    status = models.IntegerField(choices=STATUS_CODES, null=True, blank=True, help_text="Current status of the task")
    options = fields.JSONField(default=dict(), blank=True, help_text="Options that are being used to process this task")
    console_output = models.TextField(null=True, blank=True, help_text="Console output of the OpenDroneMap's process")
    ground_control_points = models.FileField(null=True, blank=True, upload_to=gcp_directory_path, help_text="Optional Ground Control Points file to use for processing")
    # georeferenced_model
    # orthophoto
    # textured_model
    # mission
    created_at = models.DateTimeField(default=timezone.now, help_text="Creation date")

    def __str__(self):
        return '{} {}'.format(self.name, self.uuid)


def image_directory_path(task, filename):
    return assets_directory_path(imageUpload.task.id, imageUpload.task.project.id, filename)

class ImageUpload(models.Model):
    task = models.ForeignKey(Task, on_delete=models.CASCADE, help_text="Task this image belongs to")
    image = models.ImageField(upload_to=image_directory_path, help_text="File uploaded by a user")
    
    def __str__(self):
        return self.image.name
