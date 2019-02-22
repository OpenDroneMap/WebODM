import os

from django.contrib.auth.models import User
from django.test import Client
from rest_framework import status

from app.models import Project
from app.models import Task
from app.plugins import UserDataStore
from app.plugins import get_plugin_by_name
from app.plugins.data_store import InvalidDataStoreValue
from .classes import BootTestCase
from app.plugins.grass_engine import grass, GrassEngineException

from worker.tasks import execute_grass_script

class TestPlugins(BootTestCase):
    def setUp(self):
        pass

    def tearDown(self):
        pass

    def test_core_plugins(self):
        client = Client()

        # We can access public files core plugins (without auth)
        res = client.get('/plugins/test/file.txt')
        self.assertEqual(res.status_code, status.HTTP_200_OK)

        # We mounted an endpoint
        res = client.get('/plugins/test/app_mountpoint/')
        self.assertEqual(res.status_code, status.HTTP_200_OK)
        self.assertTemplateUsed(res, 'plugins/test/templates/app.html')

        # Form was rendered correctly
        self.assertContains(res, '<input type="text" name="testField" class="form-control" required id="id_testField" />', count=1, status_code=200, html=True)

        # It uses regex properly
        res = client.get('/plugins/test/app_mountpoint/a')
        self.assertEqual(res.status_code, status.HTTP_404_NOT_FOUND)

        # Querying a page should show the included CSS/JS files
        client.login(username='testuser', password='test1234')
        res = client.get('/dashboard/')
        self.assertEqual(res.status_code, status.HTTP_200_OK)

        self.assertContains(res, "<link href='/plugins/test/test.css' rel='stylesheet' type='text/css'>", html=True)
        self.assertContains(res, "<script src='/plugins/test/test.js'></script>", html=True)

        # And our menu entry
        self.assertContains(res, '<li><a href="/plugins/test/menu_url/"><i class="test-icon"></i> Test</a></li>', html=True)

        # A node_modules directory has been created as a result of npm install
        # because we have a package.json in the public director
        test_plugin = get_plugin_by_name("test")
        self.assertTrue(os.path.exists(test_plugin.get_path("public/node_modules")))

        # A webpack file and build directory have been created as a
        # result of the build_jsx_components directive
        self.assertTrue(os.path.exists(test_plugin.get_path("public/webpack.config.js")))
        self.assertTrue(os.path.exists(test_plugin.get_path("public/build")))
        self.assertTrue(os.path.exists(test_plugin.get_path("public/build/component.js")))

        # Test task view
        user = User.objects.get(username="testuser")
        project = Project.objects.get(owner=user)
        task = Task.objects.create(project=project, name="Test")
        client.logout()

        # Cannot see the task view without logging-in
        res = client.get('/plugins/test/task/{}/'.format(task.id))
        self.assertEqual(res.status_code, status.HTTP_404_NOT_FOUND)

        client.login(username='testuser', password='test1234')
        res = client.get('/plugins/test/task/{}/'.format(task.id))
        self.assertEqual(res.status_code, status.HTTP_200_OK)
        self.assertContains(res, str(task.id))

        # Test dynamic script
        res = client.get('/plugins/test/app_dynamic_script.js')
        self.assertEqual(res.status_code, status.HTTP_200_OK)
        self.assertTrue(res.content.decode('utf-8') == '') # Empty

        res = client.get('/plugins/test/app_dynamic_script.js?print=1')
        self.assertEqual(res.status_code, status.HTTP_200_OK)
        self.assertTrue(res.content.decode('utf-8') == "console.log('Hello WebODM');")  # Empty


    def test_grass_engine(self):
        cwd = os.path.dirname(os.path.realpath(__file__))
        grass_scripts_dir = os.path.join(cwd, "grass_scripts")

        ctx = grass.create_context()
        ctx.add_file('test.geojson', """{
  "type": "FeatureCollection",
  "features": [
    {
      "type": "Feature",
      "properties": {},
      "geometry": {
        "type": "Point",
        "coordinates": [
          13.770675659179686,
          45.655328041141374
        ]
      }
    }
  ]
}""")
        ctx.set_location("EPSG:4326")

        output = execute_grass_script.delay(
                os.path.join(grass_scripts_dir, "simple_test.grass"),
                ctx.serialize()
            ).get()
        self.assertTrue("Number of points:       1" in output)

        error = execute_grass_script.delay(
                os.path.join(grass_scripts_dir, "nonexistant_script.grass"),
                ctx.serialize()
            ).get()
        self.assertIsInstance(error, dict)
        self.assertIsInstance(error['error'], str)

        with self.assertRaises(GrassEngineException):
            ctx.execute(os.path.join(grass_scripts_dir, "nonexistant_script.grass"))


    def test_plugin_datastore(self):
        test_plugin = get_plugin_by_name("test")
        user = User.objects.get(username='testuser')
        other_user = User.objects.get(username='testuser2')

        uds = test_plugin.get_user_data_store(user)
        other_uds = test_plugin.get_user_data_store(other_user)
        gds = test_plugin.get_global_data_store()

        # No key
        self.assertFalse(uds.has_key('mykey'))

        # Default value works
        self.assertTrue(uds.get_string('mykey', 'default') == 'default')

        # Still no key should have been added
        self.assertFalse(uds.has_key('mykey'))

        # Add key
        (object, created) = uds.set_string('mykey', 'value')
        self.assertTrue(object.string_value == 'value')
        self.assertTrue(created)
        self.assertTrue(uds.has_key('mykey'))

        # Key is not visible in global datastore
        self.assertFalse(gds.has_key('mykey'))

        # Key is not visible in another user's data store
        self.assertFalse(other_uds.has_key('mykey'))

        # Key is not visible in another's plugin data store
        # for the same user
        other_puds = UserDataStore('test2', user)
        self.assertFalse(other_puds.has_key('mykey'))

        # Deleting a non-existing key return False
        self.assertFalse(uds.del_key('nonexistant'))

        # Deleting a valid key returns True
        self.assertTrue(uds.del_key('mykey'))
        self.assertFalse(uds.has_key('mykey'))

        # Various data types setter/getter work
        uds.set_int('myint', 5)
        self.assertTrue(uds.get_int('myint') == 5)

        uds.set_float('myfloat', 10.0)
        self.assertTrue(uds.get_float('myfloat', 50.0) == 10.0)

        uds.set_bool('mybool', True)
        self.assertTrue(uds.get_bool('mybool'))

        uds.set_json('myjson', {'test': 123})
        self.assertTrue('test' in uds.get_json('myjson'))

        # Invalid types
        self.assertRaises(InvalidDataStoreValue, uds.set_bool, 'invalidbool', 5)

