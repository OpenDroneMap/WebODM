import logging

from django.contrib.auth.models import User
from django.contrib.postgres.fields import JSONField
from django.db import models
from django.utils import timezone
from .task import validate_task_options

logger = logging.getLogger('app.logger')


class Preset(models.Model):
    owner = models.ForeignKey(User, blank=True, null=True, on_delete=models.CASCADE, help_text="The person who owns this preset")
    name = models.CharField(max_length=255, blank=False, null=False, help_text="A label used to describe the preset")
    options = JSONField(default=list(), blank=True, help_text="Options that define this preset (same format as in a Task's options).",
                               validators=[validate_task_options])
    created_at = models.DateTimeField(default=timezone.now, help_text="Creation date")
    system = models.BooleanField(db_index=True, default=False, help_text="Whether this preset is available to every user in the system or just to its owner.")

    def __str__(self):
        return self.name
