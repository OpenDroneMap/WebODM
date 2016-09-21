from __future__ import unicode_literals

from django.db import models
from django.contrib.postgres import fields
from .api_client import ApiClient

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
        if self.hostname != None and self.port != None:
            print("HI!")
            self.api_client = ApiClient(self.hostname, self.port)

    def __str__(self):
        print("OH!");
        self.update_info()
        return '{}:{}'.format(self.hostname, self.port)


    def update_info(self):
        """
        Retrieves information from the node
        and saves it into the database
        """
        print(self.api_client.info())