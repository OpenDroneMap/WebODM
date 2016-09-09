from django.db import models
from django.utils import timezone
from django.contrib.auth.models import User

class Project(models.Model):
    owner = models.ForeignKey(User, on_delete=models.PROTECT, help_text="The person who created the project")
    name = models.CharField(max_length=255, help_text="A label used to describe the project")
    description = models.TextField(null=True, help_text="More in-depth description of the project")
    created_at = models.DateTimeField(default=timezone.now, help_text="Creation date")

    def __str__(self):
        return self.name

class Task(models.Model):
    uuid = models.CharField(max_length=255, primary_key=True, help_text="Unique identifier of the task (as returned by OpenDroneMap's REST API)")
    project = models.ForeignKey(Project, on_delete=models.CASCADE)
    name = models.CharField(max_length=255, help_text="A label for the task")
    processing_time = models.IntegerField(default=-1, help_text="Number of milliseconds that elapsed since the beginning of this task (-1 indicates that no information is available)")
    # options
    console_output = models.TextField(null=True, help_text="Console output of OpenDroneMap's process")
    # ground_control_points
    # input_images
    # georeferenced_model
    # orthophoto
    # textured_model
    # mission
    created_at = models.DateTimeField(default=timezone.now, help_text="Creation date")

    def __str__(self):
        return '%s %s' % (self.name, self.uuid)