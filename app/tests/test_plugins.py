from django.test import Client
from rest_framework import status

from .classes import BootTestCase

class TestPlugins(BootTestCase):
    def setUp(self):
        pass

    def tearDown(self):
        pass

    def test_core_plugins(self):
        client = Client()

        # We can access public files core plugins (without auth)
        res = client.get('/plugins/measure/leaflet-measure.css')
        self.assertEqual(res.status_code, status.HTTP_200_OK)

        # TODO:
        # test API endpoints
        # test python hooks
