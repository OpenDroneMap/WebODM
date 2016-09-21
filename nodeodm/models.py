from __future__ import unicode_literals

from django.db import models
from django.contrib.postgres import fields

class ProcessingNode(models.Model):
    hostname = models.CharField(max_length=255, help_text="Hostname where the node is located (can be an internal hostname as well)")
    port = models.PositiveIntegerField(help_text="Port that connects to the node's API")
    api_version = models.CharField(max_length=32, help_text="API version used by the node")
    last_refreshed = models.DateTimeField(null=True, help_text="When was the information about this node last retrieved?")
    queue_count = models.PositiveIntegerField(default=0, help_text="Number of tasks currently being processed by this node (as reported by the node itself)")
    available_options = fields.JSONField(default=dict(), help_text="Description of the options that can be used for processing")
    def __str__(self):
        return '{}:{}'.format(self.hostname, self.port)
