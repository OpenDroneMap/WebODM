"""
A wrapper around Bravado to communicate with a node-OpenDroneMap node.
"""
from bravado.client import SwaggerClient
from bravado.exception import HTTPError
from requests import ConnectionError

class ApiClient:
    def check_client(func):
        def check(self, *args, **kwargs):
            """
            Makes sure that the client has been instantiated. 
            Sometimes this will fail (rest endpoint might be offline), 
            so we need to handle it gracefully...
            """
            if not hasattr(self, 'client'):
                try:
                    self.client = SwaggerClient.from_url('http://{}:{}/swagger.json'.format(self.host, self.port))
                except (ConnectionError, HTTPError) as err:
                    return None
                    
            return func(self, *args, **kwargs)
        return check

    def __init__(self, host, port):
        self.host = host
        self.port = port

    @check_client
    def info(self):
        return self.client.server.get_info().result()

    @check_client
    def options(self):
        return self.client.server.get_options().result()

    @check_client
    def new_task(self):
        print(dir(self.client.task.post_task_new))
        return self.client.task.post_task_new(images=[])

a = ApiClient("localhost", 3000)
a.new_task()