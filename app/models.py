from django.db import models
from django.utils import timezone
from django.contrib.auth.models import User
from django.contrib.postgres import fields

def assets_directory_path(taskId, projectId, filename):
    # files will be uploaded to MEDIA_ROOT/project_<id>/task_<id>/<filename>
    return 'project_{0}/task_{1}/{2}'.format(taskId, projectId, filename)


class Project(models.Model):
    owner = models.ForeignKey(User, on_delete=models.PROTECT, help_text="The person who created the project")
    name = models.CharField(max_length=255, help_text="A label used to describe the project")
    description = models.TextField(null=True, help_text="More in-depth description of the project")
    created_at = models.DateTimeField(default=timezone.now, help_text="Creation date")

    def __str__(self):
        return self.name


class ProcessingNode(models.Model):
    hostname = models.CharField(max_length=255, help_text="Hostname where the node is located (can be an internal hostname as well)")
    port = models.PositiveIntegerField(help_text="Port that connects to the node's API")
    api_version = models.CharField(max_length=32, help_text="API version used by the node")
    last_refreshed = models.DateTimeField(null=True, help_text="When was the information about this node last retrieved?")
    queue_count = models.PositiveIntegerField(default=0, help_text="Number of tasks currently being processed by this node (as reported by the node itself)")
    available_options = fields.JSONField(default=dict(), help_text="Description of the options that can be used for processing")
    def __str__(self):
        return '{}:{}'.format(self.hostname, self.port)


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

    uuid = models.CharField(max_length=255, primary_key=True, help_text="Unique identifier of the task (as returned by OpenDroneMap's REST API)")
    project = models.ForeignKey(Project, on_delete=models.CASCADE, help_text="Project that this task belongs to")
    name = models.CharField(max_length=255, help_text="A label for the task")
    processing_time = models.IntegerField(default=-1, help_text="Number of milliseconds that elapsed since the beginning of this task (-1 indicates that no information is available)")
    processing_node = models.ForeignKey(ProcessingNode, null=True, help_text="Processing node assigned to this task (or null if this task has not been associated yet)")
    status = models.IntegerField(choices=STATUS_CODES, null=True, help_text="Current status of the task")
    options = fields.JSONField(default=dict(), help_text="Options that are being used to process this task")
    console_output = models.TextField(null=True, help_text="Console output of the OpenDroneMap's process")
    ground_control_points = models.FileField(null=True, upload_to=gcp_directory_path, help_text="Optional Ground Control Points file to use for processing")
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
