import os

from django.test import Client
from rest_framework import status

from app.plugins import get_plugin_by_name
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
