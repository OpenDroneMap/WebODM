"""
An interface to node-OpenDroneMap's API
https://github.com/pierotofy/node-OpenDroneMap/blob/master/docs/index.adoc
"""
import requests
import mimetypes
import json
import os
from urlparse import urlunparse

class ApiClient:
    def __init__(self, host, port):
        self.host = host
        self.port = port

    def url(self, url):
        netloc = self.host if self.port == 80 else "{}:{}".format(self.host, self.port)

        # TODO: https support
        return urlunparse(('http', netloc, url, '', '', ''))

    def info(self):
        return requests.get(self.url('/info')).json()

    def options(self):
        return requests.get(self.url('/options')).json()

    def task_info(self, uuid):
        return requests.get(self.url('/task/{}/info').format(uuid)).json()

    def task_output(self, uuid, line = 0):
        return requests.get(self.url('/task/{}/output?line={}').format(uuid, line)).json()


    def new_task(self, images, name=None, options=[]):
        """
        Starts processing of a new task
        :param images: list of path images
        :param name: name of the task
        :param options: options to be used for processing ([{'name': optionName, 'value': optionValue}, ...])
        :return: UUID or error
        """

        files = [('images',
                  (os.path.basename(image), open(image, 'rb'), (mimetypes.guess_type(image)[0] or "image/jpg"))
                 ) for image in images]
        return requests.post(self.url("/task/new"),
                             files=files,
                             data={'name': name, 'options': json.dumps(options)}).json()