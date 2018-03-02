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

        # TODO:
        # test API endpoints
        # test python hooks
