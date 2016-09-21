"""
A wrapper around Bravado to communicate with a node-OpenDroneMap node.
"""
from bravado.client import SwaggerClient

def check_client(func):
    def check(self, *args, **kwargs):
        """
        Makes sure that the client has been instantiated. 
        Sometimes this will fail (rest endpoint might be offline), 
        so we need to handle it gracefully...
        """
        if not self.client:
            try:
                self.client = SwaggerClient.from_url('http://{}:{}/swagger.json'.format(host, port))
            except ConnectionError as err:
                print("ProcessingNode {}:{} seems offline: {}".format(self.host, self.port, err))
                return None

        return func(self, *args, **kwargs)

class ApiClient:
    def __init__(self, host, port):
        self.host = host
        self.port = port

    @check_client
    def info(self):
        return self.client.server.get_info().result()