from django.test import TestCase
from django.utils import six
import subprocess, time
from os import path
from .models import ProcessingNode
from .api_client import ApiClient
from requests.exceptions import ConnectionError

current_dir = path.dirname(path.realpath(__file__))


class TestClientApi(TestCase):
    fixtures = ['test_processingnodes', ]

    @classmethod
    def setUpClass(cls):
        super(TestClientApi, cls).setUpClass()
        cls.node_odm = subprocess.Popen(['node', 'index.js', '--port', '11223', '--test'], shell=False, cwd=path.join(current_dir, "external", "node-OpenDroneMap"))
        time.sleep(5) # Wait for the server to launch


    @classmethod
    def tearDownClass(cls):
        super(TestClientApi, cls).tearDownClass()
        cls.node_odm.terminate()

    def setUp(self):
        self.api_client = ApiClient("localhost", 11223)

    def tearDown(self):
        pass

    def test_offline_api(self):
        api = ApiClient("offline-host", 3000)
        self.assertRaises(ConnectionError, api.info)
        self.assertRaises(ConnectionError, api.options)

    def test_info(self):
        info = self.api_client.info()
        self.assertTrue(isinstance(info['version'], six.string_types), "Found version string")
        self.assertTrue(isinstance(info['taskQueueCount'], int), "Found task queue count")

    def test_options(self):
        options = self.api_client.options()
        self.assertTrue(len(options) > 0, "Found options")

    def test_online_processing_node(self):
        online_node = ProcessingNode.objects.get(pk=1)
        self.assertTrue(str(online_node) == "localhost:11223", "Formatting string works")
        self.assertTrue(online_node.last_refreshed == None, "Last refreshed not yet set")
        self.assertTrue(len(online_node.available_options) == 0, "Available options not yet set")
        self.assertTrue(online_node.api_version == "", "API version is not set")

        self.assertTrue(online_node.update_node_info(), "Could update info")
        self.assertTrue(online_node.last_refreshed != None, "Last refreshed is set")
        self.assertTrue(len(online_node.available_options) > 0, "Available options are set")
        self.assertTrue(online_node.api_version != "", "API version is set")
        
        self.assertTrue(isinstance(online_node.get_available_options_json(), six.string_types), "Available options json works")

    def test_offline_processing_node(self):
        offline_node = ProcessingNode.objects.get(pk=2)
        self.assertFalse(offline_node.update_node_info(), "Could not update info (offline)")
        self.assertTrue(offline_node.api_version == "", "API version is not set")

    def test_auto_update_node_info(self):
        online_node = ProcessingNode.objects.create(hostname="localhost", port=11223)
        self.assertTrue(online_node.last_refreshed != None, "Last refreshed info is here (update_node_info() was called)")

    def test_add_new_task(self):
        pass #TODO

        # import glob
        # a = ApiClient("localhost", 3000)
        # print(a.info())
        # print(a.new_task(glob.glob("fixtures/test_images/*.JPG"), "test", [{'name': 'cmvs-maxImages', 'value': 5}]))