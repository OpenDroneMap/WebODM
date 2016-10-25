from __future__ import unicode_literals

from django.db import models
from django.contrib.postgres import fields
from django.utils import timezone
from django.dispatch import receiver
from .api_client import ApiClient
import json
from django.db.models import signals
from requests.exceptions import ConnectionError
from .exceptions import NewTaskException

class ProcessingNode(models.Model):
    hostname = models.CharField(max_length=255, help_text="Hostname where the node is located (can be an internal hostname as well)")
    port = models.PositiveIntegerField(help_text="Port that connects to the node's API")
    api_version = models.CharField(max_length=32, null=True, help_text="API version used by the node")
    last_refreshed = models.DateTimeField(null=True, help_text="When was the information about this node last retrieved?")
    queue_count = models.PositiveIntegerField(default=0, help_text="Number of tasks currently being processed by this node (as reported by the node itself)")
    available_options = fields.JSONField(default=dict(), help_text="Description of the options that can be used for processing")
    
    def __str__(self):
        return '{}:{}'.format(self.hostname, self.port)

    def update_node_info(self):
        """
        Retrieves information and options from the node API
        and saves it into the database.

        :returns: True if information could be updated, False otherwise
        """
        api_client = self.api_client()
        try:
            info = api_client.info()
            self.api_version = info['version']
            self.queue_count = info['taskQueueCount']

            options = api_client.options()
            self.available_options = options
            self.last_refreshed = timezone.now()
            self.save()
            return True
        except ConnectionError:
            return False

    def api_client(self):
        return ApiClient(self.hostname, self.port)

    def get_available_options_json(self):
        """
        :returns available options in JSON string format
        """
        return json.dumps(self.available_options)

    def process_new_task(self, images, name=None, options=[]):
        """
        Sends a set of images (and optional GCP file) via the API
        to start processing.

        :returns UUID of the newly created task
        """
        api_client = self.api_client()
        result = api_client.new_task(images, name, options)
        if result['uuid']:
            return result['uuid']
        elif result['error']:
            raise NewTaskException(result['error'])
        

# First time a processing node is created, automatically try to update
@receiver(signals.post_save, sender=ProcessingNode, dispatch_uid="update_processing_node_info")
def auto_update_node_info(sender, instance, created, **kwargs):
    if created:
        instance.update_node_info()
