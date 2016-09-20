"""
A wrapper around Bravado to communicate with a node-OpenDroneMap node.
"""
from bravado.client import SwaggerClient

class ApiClient:
    def __init__(self, host, port):
        # TODO
        client = SwaggerClient.from_url('http://{}:{}/swagger.json'.format(host, port))
        print client.server.get_info().result()
        print dir(client)
