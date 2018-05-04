"""
An interface to node-OpenDroneMap's API
https://github.com/pierotofy/node-OpenDroneMap/blob/master/docs/index.adoc
"""
import requests
import mimetypes
import json
import os
from urllib.parse import urlunparse
from app.testwatch import TestWatch

class ApiClient:
    def __init__(self, host, port, timeout=30):
        self.host = host
        self.port = port
        self.timeout = timeout

    def url(self, url):
        netloc = self.host if self.port == 80 else "{}:{}".format(self.host, self.port)

        # TODO: https support
        return urlunparse(('http', netloc, url, '', '', ''))

    def info(self):
        return requests.get(self.url('/info'), timeout=self.timeout).json()

    def options(self):
        return requests.get(self.url('/options'), timeout=self.timeout).json()

    def task_info(self, uuid):
        return requests.get(self.url('/task/{}/info').format(uuid), timeout=self.timeout).json()

    @TestWatch.watch()
    def task_output(self, uuid, line = 0):
        return requests.get(self.url('/task/{}/output?line={}').format(uuid, line), timeout=self.timeout).json()

    def task_cancel(self, uuid):
        return requests.post(self.url('/task/cancel'), data={'uuid': uuid}, timeout=self.timeout).json()

    def task_remove(self, uuid):
        return requests.post(self.url('/task/remove'), data={'uuid': uuid}, timeout=self.timeout).json()

    def task_restart(self, uuid, options = None):
        data = {'uuid': uuid}
        if options is not None: data['options'] = json.dumps(options)
        return requests.post(self.url('/task/restart'), data=data, timeout=self.timeout).json()

    def task_download(self, uuid, asset):
        res = requests.get(self.url('/task/{}/download/{}').format(uuid, asset), stream=True)
        if "Content-Type" in res.headers and "application/json" in res.headers['Content-Type']:
            return res.json()
        else:
            return res

    def new_task(self, images, name=None, options=[]):
        """
        Starts processing of a new task
        :param images: list of path images
        :param name: name of the task
        :param options: options to be used for processing ([{'name': optionName, 'value': optionValue}, ...])
        :return: UUID or error
        """

        # Equivalent as passing the open file descriptor, since requests
        # eventually calls read(), but this way we make sure to close
        # the file prior to reading the next, so we don't run into open file OS limits
        def read_file(path):
            with open(path, 'rb') as f:
                return f.read()

        files = [('images',
                  (os.path.basename(image), read_file(image), (mimetypes.guess_type(image)[0] or "image/jpg"))
                 ) for image in images]
        return requests.post(self.url("/task/new"),
                             files=files,
                             data={'name': name, 'options': json.dumps(options)}).json()
