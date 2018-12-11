"""
An interface to NodeODM's API
https://github.com/pierotofy/NodeODM/blob/master/docs/index.adoc
"""
from requests.packages.urllib3.fields import RequestField
from requests_toolbelt.multipart import encoder
import requests
import mimetypes
import json
import os
from urllib.parse import urlunparse, urlencode
from app.testwatch import TestWatch

# Extends class to support multipart form data
# fields with the same name
# https://github.com/requests/toolbelt/issues/225
class MultipartEncoder(encoder.MultipartEncoder):
    """Multiple files with the same name support, i.e. files[]"""

    def _iter_fields(self):
        _fields = self.fields
        if hasattr(self.fields, 'items'):
            _fields = list(self.fields.items())
        for k, v in _fields:
            for field in self._iter_field(k, v):
                yield field

    @classmethod
    def _iter_field(cls, field_name, field):
        file_name = None
        file_type = None
        file_headers = None
        if field and isinstance(field, (list, tuple)):
            if all([isinstance(f, (list, tuple)) for f in field]):
                for f in field:
                    yield next(cls._iter_field(field_name, f))
                else:
                    raise StopIteration()
            if len(field) == 2:
                file_name, file_pointer = field
            elif len(field) == 3:
                file_name, file_pointer, file_type = field
            else:
                file_name, file_pointer, file_type, file_headers = field
        else:
            file_pointer = field

        field = RequestField(name=field_name,
                             data=file_pointer,
                             filename=file_name,
                             headers=file_headers)
        field.make_multipart(content_type=file_type)
        yield field

class ApiClient:
    def __init__(self, host, port, token = "", timeout=30):
        self.host = host
        self.port = port
        self.token = token
        self.timeout = timeout

    def url(self, url, query = {}):
        netloc = self.host if (self.port == 80 or self.port == 443) else "{}:{}".format(self.host, self.port)
        proto = 'https' if self.port == 443 else 'http'

        if len(self.token) > 0:
            query['token'] = self.token

        return urlunparse((proto, netloc, url, '', urlencode(query), ''))

    def info(self):
        return requests.get(self.url('/info'), timeout=self.timeout).json()

    def options(self):
        return requests.get(self.url('/options'), timeout=self.timeout).json()

    def task_info(self, uuid):
        return requests.get(self.url('/task/{}/info').format(uuid), timeout=self.timeout).json()

    @TestWatch.watch()
    def task_output(self, uuid, line = 0):
        return requests.get(self.url('/task/{}/output', {'line': line}).format(uuid), timeout=self.timeout).json()

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

    def new_task(self, images, name=None, options=[], progress_callback=None):
        """
        Starts processing of a new task
        :param images: list of path images
        :param name: name of the task
        :param options: options to be used for processing ([{'name': optionName, 'value': optionValue}, ...])
        :param progress_callback: optional callback invoked during the upload images process to be used to report status.
        :return: UUID or error
        """

        # Equivalent as passing the open file descriptor, since requests
        # eventually calls read(), but this way we make sure to close
        # the file prior to reading the next, so we don't run into open file OS limits
        def read_file(path):
            with open(path, 'rb') as f:
                return f.read()

        fields = {
            'name': name,
            'options': json.dumps(options),
            'images': [(os.path.basename(image), read_file(image), (mimetypes.guess_type(image)[0] or "image/jpg")) for image in images]
        }

        def create_callback(mpe):
            total_bytes = mpe.len

            def callback(monitor):
                if progress_callback is not None and total_bytes > 0:
                    progress_callback(monitor.bytes_read / total_bytes)

            return callback

        e = MultipartEncoder(fields=fields)
        m = encoder.MultipartEncoderMonitor(e, create_callback(e))

        return requests.post(self.url("/task/new"),
                             data=m,
                             headers={'Content-Type': m.content_type}).json()