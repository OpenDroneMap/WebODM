from django.contrib.auth.models import User, Group
from nodeodm.models import ProcessingNode
from rest_framework import status
from rest_framework.test import APIClient

from .classes import BootTestCase
from .utils import start_simple_auth_server
from webodm import settings

class TestAuth(BootTestCase):
    def setUp(self):
        pass

    def tearDown(self):
        pass

    def test_ext_auth(self):
        client = APIClient()

        # Disable
        settings.EXTERNAL_AUTH_ENDPOINT = ''

        # Try to log-in
        ok = client.login(username='extuser1', password='test1234')
        self.assertFalse(ok)

        # Enable
        settings.EXTERNAL_AUTH_ENDPOINT = 'http://0.0.0.0:5555/auth'

        with start_simple_auth_server(["5555"]):
            ok = client.login(username='extuser1', password='invalid')
            self.assertFalse(ok)
            self.assertFalse(User.objects.filter(username="extuser1").exists())
            ok = client.login(username='extuser1', password='test1234')
            self.assertTrue(ok)
            user = User.objects.get(username="extuser1")
            self.assertEqual(user.id, 100)
            self.assertEqual(user.profile.quota, 500)
            pnode = ProcessingNode.objects.get(token='test')
            self.assertEqual(pnode.hostname, 'localhost')
            self.assertEqual(pnode.port, 4444)
            self.assertTrue(user.has_perm('view_processingnode', pnode))
            self.assertFalse(user.has_perm('delete_processingnode', pnode))
            self.assertFalse(user.has_perm('change_processingnode', pnode))
            
            # Re-test login
            ok = client.login(username='extuser1', password='test1234')
            self.assertTrue(ok)

            # Check that the user has been added to the default group
            self.assertTrue(user.groups.filter(name='Default').exists())
