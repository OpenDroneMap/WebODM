from django.contrib.auth.models import User, Group
from rest_framework import status
from rest_framework.test import APIClient

from .classes import BootTestCase
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
        user = client.login(username='extuser1', password='test1234')
        self.assertFalse(user)

        # Enable
        settings.EXTERNAL_AUTH_ENDPOINT = 'http://0.0.0.0:5555'

        # TODO: start simplehttp auth server

        user = client.login(username='extuser1', password='test1234')
        # self.assertEqual(user.username, 'extuser1')
        # self.assertEqual(user.id, 100)

        
        # client.login(username="testuser", password="test1234")

        # user = User.objects.get(username="testuser")

        # # Cannot list profiles (not admin)
        # res = client.get('/api/admin/profiles/')
        # self.assertEqual(res.status_code, status.HTTP_403_FORBIDDEN)

        # res = client.get('/api/admin/profiles/%s/' % user.id)
        # self.assertEqual(res.status_code, status.HTTP_403_FORBIDDEN)

        # # Cannot update quota deadlines
        # res = client.post('/api/admin/profiles/%s/update_quota_deadline/' % user.id, data={'hours': 1})
        # self.assertEqual(res.status_code, status.HTTP_403_FORBIDDEN)

        # # Admin can
        # client.login(username="testsuperuser", password="test1234")

        # res = client.get('/api/admin/profiles/')
        # self.assertEqual(res.status_code, status.HTTP_200_OK)
        # self.assertTrue(len(res.data) > 0)

        # res = client.get('/api/admin/profiles/%s/' % user.id)
        # self.assertEqual(res.status_code, status.HTTP_200_OK)
        # self.assertTrue('quota' in res.data)
        # self.assertTrue('user' in res.data)

        # # User is the primary key (not profile id)
        # self.assertEqual(res.data['user'], user.id)
        
        # # There should be no quota by default
        # self.assertEqual(res.data['quota'], -1)

      