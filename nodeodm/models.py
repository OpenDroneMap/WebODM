from __future__ import unicode_literals

from django.db import models
from django.contrib.postgres import fields
from django.utils import timezone
from .api_client import ApiClient
import json

class ProcessingNode(models.Model):
    hostname = models.CharField(max_length=255, help_text="Hostname where the node is located (can be an internal hostname as well)")
    port = models.PositiveIntegerField(help_text="Port that connects to the node's API")
    api_version = models.CharField(max_length=32, help_text="API version used by the node")
    last_refreshed = models.DateTimeField(null=True, help_text="When was the information about this node last retrieved?")
    queue_count = models.PositiveIntegerField(default=0, help_text="Number of tasks currently being processed by this node (as reported by the node itself)")
    available_options = fields.JSONField(default=dict(), help_text="Description of the options that can be used for processing")
    
    def __init__(self, *args, **kwargs):
        super(ProcessingNode, self).__init__(*args, **kwargs)

        # Initialize api client
        self.api_client = ApiClient(self.hostname, self.port)

    def __str__(self):
        return '{}:{}'.format(self.hostname, self.port)

    def update_node_info(self):
        """
        Retrieves information and options from the node API
        and saves it into the database.

        :returns: True if information could be updated, False otherwise
        """
        info = self.api_client.info()
        if info != None:
            self.api_version = info['version']
            self.queue_count = info['taskQueueCount']

            options = self.api_client.options()
            if options != None:
                self.available_options = options
                self.last_refreshed = timezone.now()

                self.save()
                return True
        return False

    def get_available_options_json(self):
        """
        :returns available options in JSON string format
        """
        return json.dumps(self.available_options)
