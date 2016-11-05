from django.test import TestCase
from django.utils import six
import subprocess, time
from os import path
from .models import ProcessingNode
from .api_client import ApiClient
from requests.exceptions import ConnectionError
from .exceptions import ProcessingException
import status_codes

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
        self.assertTrue(isinstance(online_node.get_available_options_json(pretty=True), six.string_types), "Available options json works with pretty")


    def test_offline_processing_node(self):
        offline_node = ProcessingNode.objects.get(pk=2)
        self.assertFalse(offline_node.update_node_info(), "Could not update info (offline)")
        self.assertTrue(offline_node.api_version == "", "API version is not set")

    def test_auto_update_node_info(self):
        online_node = ProcessingNode.objects.create(hostname="localhost", port=11223)
        self.assertTrue(online_node.last_refreshed != None, "Last refreshed info is here (update_node_info() was called)")

    def test_client_api_and_task_methods(self):
        api = ApiClient("localhost", 11223)
        online_node = ProcessingNode.objects.get(pk=1)

        # Can call info(), options()
        self.assertTrue(type(api.info()['version']) in [str, unicode])
        self.assertTrue(len(api.options()) > 0)
        
        # Can call new_task()
        import glob
        res = api.new_task(
                glob.glob("nodeodm/fixtures/test_images/*.JPG"), 
                "test", 
                [{'name': 'cmvs-maxImages', 'value': 5}])
        uuid = res['uuid']
        self.assertTrue(uuid != None)

        # Can call task_info()
        task_info = api.task_info(uuid)
        self.assertTrue(isinstance(task_info['dateCreated'], (int, long)))
        self.assertTrue(isinstance(task_info['uuid'], (str, unicode)))

        # Can download assets?
        # Here we are waiting for the task to be completed
        retries = 0
        while True:
            try:
                task_info = api.task_info(uuid)
                if task_info['status']['code'] == status_codes.COMPLETED:
                    asset = api.task_download(uuid, "all.zip")
                    self.assertTrue(isinstance(asset, (str, unicode))) # Binary content, really
                    break
            except ProcessingException:
                pass

            time.sleep(0.5)
            retries += 1
            if retries >= 10:
                self.assertTrue(False, "Could not download assets")
                break

        # task_output
        self.assertTrue(isinstance(api.task_output(uuid, 0), list))
        self.assertTrue(isinstance(online_node.get_task_console_output(uuid, 0), (str, unicode)))

        self.assertRaises(ProcessingException, online_node.get_task_console_output, "wrong-uuid", 0)

        # Can restart task
        self.assertTrue(online_node.restart_task(uuid))
        self.assertRaises(ProcessingException, online_node.restart_task, "wrong-uuid")

        # Can cancel task
        self.assertTrue(online_node.cancel_task(uuid))
        self.assertRaises(ProcessingException, online_node.cancel_task, "wrong-uuid")

        # Can delete task
        self.assertTrue(online_node.remove_task(uuid))
        self.assertRaises(ProcessingException, online_node.remove_task, "wrong-uuid")

        # Cannot delete task again
        self.assertRaises(ProcessingException, online_node.remove_task, uuid)

        # Task has been deleted
        self.assertRaises(ProcessingException, online_node.get_task_info, uuid)