from __future__ import unicode_literals

import requests
from django.db import models
from django.contrib.postgres import fields
from django.utils import timezone
from django.dispatch import receiver
from guardian.models import GroupObjectPermissionBase
from guardian.models import UserObjectPermissionBase

from .api_client import ApiClient
import json
from django.db.models import signals
from datetime import timedelta
from .exceptions import ProcessingError, ProcessingTimeout
import simplejson


def api(func):
    """
    Catches JSON decoding errors that might happen when the server
    answers unexpectedly
    """
    def wrapper(*args,**kwargs):
        try:
            return func(*args, **kwargs)
        except (json.decoder.JSONDecodeError, simplejson.JSONDecodeError) as e:
            raise ProcessingError(str(e))
        except (requests.exceptions.Timeout, requests.exceptions.ConnectionError) as e:
            raise ProcessingTimeout(str(e))


    return wrapper

OFFLINE_MINUTES = 5 # Number of minutes a node hasn't been seen before it should be considered offline

class ProcessingNode(models.Model):
    hostname = models.CharField(max_length=255, help_text="Hostname or IP address where the node is located (can be an internal hostname as well). If you are using Docker, this is never 127.0.0.1 or localhost. Find the IP address of your host machine by running ifconfig on Linux or by checking your network settings.")
    port = models.PositiveIntegerField(help_text="Port that connects to the node's API")
    api_version = models.CharField(max_length=32, null=True, help_text="API version used by the node")
    last_refreshed = models.DateTimeField(null=True, help_text="When was the information about this node last retrieved?")
    queue_count = models.PositiveIntegerField(default=0, help_text="Number of tasks currently being processed by this node (as reported by the node itself)")
    available_options = fields.JSONField(default=dict(), help_text="Description of the options that can be used for processing")
    
    def __str__(self):
        return '{}:{}'.format(self.hostname, self.port)

    @staticmethod
    def find_best_available_node():
        """
        Attempts to find an available node (seen in the last 5 minutes, and with lowest queue count)
        :return: ProcessingNode | None
        """
        return ProcessingNode.objects.filter(last_refreshed__gte=timezone.now() - timedelta(minutes=OFFLINE_MINUTES)) \
                                     .order_by('queue_count').first()

    def is_online(self):
        return self.last_refreshed is not None and \
               self.last_refreshed >= timezone.now() - timedelta(minutes=OFFLINE_MINUTES)

    @api
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
        except (requests.exceptions.Timeout, requests.exceptions.ConnectionError, json.decoder.JSONDecodeError, simplejson.JSONDecodeError):
            return False

    def api_client(self):
        return ApiClient(self.hostname, self.port)

    def get_available_options_json(self, pretty=False):
        """
        :returns available options in JSON string format
        """
        kwargs = dict(indent=4, separators=(',', ": ")) if pretty else dict() 
        return json.dumps(self.available_options, **kwargs)

    @api
    def process_new_task(self, images, name=None, options=[]):
        """
        Sends a set of images (and optional GCP file) via the API
        to start processing.

        :param images: list of path images
        :param name: name of the task
        :param options: options to be used for processing ([{'name': optionName, 'value': optionValue}, ...])

        :returns UUID of the newly created task
        """
        if len(images) < 2: raise ProcessingError("Need at least 2 images")

        api_client = self.api_client()
        try:
            result = api_client.new_task(images, name, options)
        except requests.exceptions.ConnectionError as e:
            raise ProcessingError(e)

        if isinstance(result, dict) and 'uuid' in result:
            return result['uuid']
        elif isinstance(result, dict) and 'error' in result:
            raise ProcessingError(result['error'])
        else:
            raise ProcessingError("Unexpected answer from server: {}".format(result))

    @api
    def get_task_info(self, uuid):
        """
        Gets information about this task, such as name, creation date, 
        processing time, status, command line options and number of 
        images being processed.
        """
        api_client = self.api_client()
        result = api_client.task_info(uuid)
        if isinstance(result, dict) and 'uuid' in result:
            return result
        elif isinstance(result, dict) and 'error' in result:
            raise ProcessingError(result['error'])
        else:
            raise ProcessingError("Unknown result from task info: {}".format(result))

    @api
    def get_task_console_output(self, uuid, line):
        """
        Retrieves the console output of the OpenDroneMap's process.
        Useful for monitoring execution and to provide updates to the user.
        """
        api_client = self.api_client()
        result = api_client.task_output(uuid, line)
        if isinstance(result, dict) and 'error' in result:
            raise ProcessingError(result['error'])
        elif isinstance(result, list):
            return "".join(result)
        else:
            raise ProcessingError("Unknown response for console output: {}".format(result))

    @api
    def cancel_task(self, uuid):
        """
        Cancels a task (stops its execution, or prevents it from being executed)
        """
        api_client = self.api_client()
        return self.handle_generic_post_response(api_client.task_cancel(uuid))

    @api
    def remove_task(self, uuid):
        """
        Removes a task and deletes all of its assets
        """
        api_client = self.api_client()
        return self.handle_generic_post_response(api_client.task_remove(uuid))

    @api
    def download_task_asset(self, uuid, asset):
        """
        Downloads a task asset
        """
        api_client = self.api_client()
        res = api_client.task_download(uuid, asset)
        if isinstance(res, dict) and 'error' in res:
            raise ProcessingError(res['error'])
        else:
            return res

    @api
    def restart_task(self, uuid, options = None):
        """
        Restarts a task that was previously canceled or that had failed to process
        """
        api_client = self.api_client()
        return self.handle_generic_post_response(api_client.task_restart(uuid, options))

    @staticmethod
    def handle_generic_post_response(result):
        """
        Handles a POST response that has either a "success" flag, or an error message.
        This is a common response in node-OpenDroneMap POST calls.
        :param result: result of API call
        :return: True on success, raises ProcessingException otherwise
        """
        if isinstance(result, dict) and 'error' in result:
            raise ProcessingError(result['error'])
        elif isinstance(result, dict) and 'success' in result:
            return True
        else:
            raise ProcessingError("Unknown response: {}".format(result))

    class Meta:
        permissions = (
            ('view_processingnode', 'Can view processing node'),
        )


# First time a processing node is created, automatically try to update
@receiver(signals.post_save, sender=ProcessingNode, dispatch_uid="update_processing_node_info")
def auto_update_node_info(sender, instance, created, **kwargs):
    if created:
        try:
            instance.update_node_info()
        except ProcessingError:
            pass

class ProcessingNodeUserObjectPermission(UserObjectPermissionBase):
    content_object = models.ForeignKey(ProcessingNode, on_delete=models.CASCADE)


class ProcessingNodeGroupObjectPermission(GroupObjectPermissionBase):
    content_object = models.ForeignKey(ProcessingNode, on_delete=models.CASCADE)
