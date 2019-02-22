from __future__ import unicode_literals

from django.db import models
from django.contrib.postgres import fields
from django.utils import timezone
from django.dispatch import receiver
from guardian.models import GroupObjectPermissionBase
from guardian.models import UserObjectPermissionBase

import json
from pyodm import Node
from pyodm import exceptions
from django.db.models import signals
from datetime import timedelta


OFFLINE_MINUTES = 5 # Number of minutes a node hasn't been seen before it should be considered offline

class ProcessingNode(models.Model):
    hostname = models.CharField(max_length=255, help_text="Hostname or IP address where the node is located (can be an internal hostname as well). If you are using Docker, this is never 127.0.0.1 or localhost. Find the IP address of your host machine by running ifconfig on Linux or by checking your network settings.")
    port = models.PositiveIntegerField(help_text="Port that connects to the node's API")
    api_version = models.CharField(max_length=32, null=True, help_text="API version used by the node")
    last_refreshed = models.DateTimeField(null=True, help_text="When was the information about this node last retrieved?")
    queue_count = models.PositiveIntegerField(default=0, help_text="Number of tasks currently being processed by this node (as reported by the node itself)")
    available_options = fields.JSONField(default=dict, help_text="Description of the options that can be used for processing")
    token = models.CharField(max_length=1024, blank=True, default="", help_text="Token to use for authentication. If the node doesn't have authentication, you can leave this field blank.")
    max_images = models.PositiveIntegerField(help_text="Maximum number of images accepted by this node.", blank=True, null=True)
    odm_version = models.CharField(max_length=32, null=True, help_text="ODM version used by the node.")
    label = models.CharField(max_length=255, default="", blank=True, help_text="Optional label for this node. When set, this label will be shown instead of the hostname:port name.")

    def __str__(self):
        if self.label != "":
            return self.label
        else:
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

    def update_node_info(self):
        """
        Retrieves information and options from the node API
        and saves it into the database.

        :returns: True if information could be updated, False otherwise
        """
        api_client = self.api_client(timeout=5)
        try:
            info = api_client.info()

            self.api_version = info.version
            self.queue_count = info.task_queue_count
            self.max_images = info.max_images
            self.odm_version = info.odm_version

            options = list(map(lambda o: o.__dict__, api_client.options()))
            self.available_options = options
            self.last_refreshed = timezone.now()
            self.save()
            return True
        except exceptions.OdmError:
            return False

    def api_client(self, timeout=30):
        return Node(self.hostname, self.port, self.token, timeout)

    def get_available_options_json(self, pretty=False):
        """
        :returns available options in JSON string format
        """
        kwargs = dict(indent=4, separators=(',', ": ")) if pretty else dict() 
        return json.dumps(self.available_options, **kwargs)

    def options_list_to_dict(self, options = []):
        """
        Convers options formatted as a list ([{'name': optionName, 'value': optionValue}, ...])
        to a dictionary {optionName: optionValue, ...}
        :param options: options
        :return: dict
        """
        opts = {}
        if options is not None:
            for o in options:
                opts[o['name']] = o['value']

        return opts

    def process_new_task(self, images, name=None, options=[], progress_callback=None):
        """
        Sends a set of images (and optional GCP file) via the API
        to start processing.

        :param images: list of path images
        :param name: name of the task
        :param options: options to be used for processing ([{'name': optionName, 'value': optionValue}, ...])
        :param progress_callback: optional callback invoked during the upload images process to be used to report status.

        :returns UUID of the newly created task
        """
        if len(images) < 2: raise exceptions.NodeServerError("Need at least 2 images")

        api_client = self.api_client()

        opts = self.options_list_to_dict(options)

        task = api_client.create_task(images, opts, name, progress_callback)
        return task.uuid

    def get_task_info(self, uuid):
        """
        Gets information about this task, such as name, creation date, 
        processing time, status, command line options and number of 
        images being processed.
        """
        api_client = self.api_client()
        task = api_client.get_task(uuid)
        return task.info()

    def get_task_console_output(self, uuid, line):
        """
        Retrieves the console output of the OpenDroneMap's process.
        Useful for monitoring execution and to provide updates to the user.
        """
        api_client = self.api_client()
        task = api_client.get_task(uuid)
        return task.output(line)

    def cancel_task(self, uuid):
        """
        Cancels a task (stops its execution, or prevents it from being executed)
        """
        api_client = self.api_client()
        task = api_client.get_task(uuid)
        return task.cancel()

    def remove_task(self, uuid):
        """
        Removes a task and deletes all of its assets
        """
        api_client = self.api_client()
        task = api_client.get_task(uuid)
        return task.remove()

    def download_task_assets(self, uuid, destination, progress_callback):
        """
        Downloads a task asset
        """
        api_client = self.api_client()
        task = api_client.get_task(uuid)
        return task.download_zip(destination, progress_callback)

    def restart_task(self, uuid, options = None):
        """
        Restarts a task that was previously canceled or that had failed to process
        """

        api_client = self.api_client()
        task = api_client.get_task(uuid)
        return task.restart(self.options_list_to_dict(options))

    def delete(self, using=None, keep_parents=False):
        pnode_id = self.id
        super(ProcessingNode, self).delete(using, keep_parents)

        from app.plugins import signals as plugin_signals
        plugin_signals.processing_node_removed.send_robust(sender=self.__class__, processing_node_id=pnode_id)


# First time a processing node is created, automatically try to update
@receiver(signals.post_save, sender=ProcessingNode, dispatch_uid="update_processing_node_info")
def auto_update_node_info(sender, instance, created, **kwargs):
    if created:
        try:
            instance.update_node_info()
        except exceptions.OdmError:
            pass

class ProcessingNodeUserObjectPermission(UserObjectPermissionBase):
    content_object = models.ForeignKey(ProcessingNode, on_delete=models.CASCADE)


class ProcessingNodeGroupObjectPermission(GroupObjectPermissionBase):
    content_object = models.ForeignKey(ProcessingNode, on_delete=models.CASCADE)
