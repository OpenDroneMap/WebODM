import logging
from django.contrib.auth.models import User
from rest_framework import status
from rest_framework.test import APIClient
from app.models import Project
from .classes import BootTestCase

from webodm import settings
logger = logging.getLogger('app.logger')


class TestApiUsers(BootTestCase):
    def setUp(self):
        super().setUp()

    def tearDown(self):
        super().tearDown()

    def test_users(self):
        client = APIClient()

        user = User.objects.get(username="testuser")

        # Cannot list users (anonymous)
        res = client.get("/api/users/?limit=30")
        self.assertEqual(res.status_code, status.HTTP_403_FORBIDDEN)

        client.login(username="testuser", password="test1234")

        # Can list users (authenticated)
        res = client.get("/api/users/?limit=30")
        self.assertEqual(res.status_code, status.HTTP_200_OK)
        self.assertTrue([u for u in res.data if u['username'] == 'testuser'])
        self.assertTrue([u for u in res.data if u['username'] == 'testsuperuser'])

        # Can search for users
        res = client.get("/api/users/?search=super")
        self.assertEqual(res.status_code, status.HTTP_200_OK)
        self.assertFalse([u for u in res.data if u['username'] == 'testuser'])
        self.assertTrue([u for u in res.data if u['username'] == 'testsuperuser'])

        # Can search for users and limit
        res = client.get("/api/users/?search=super&limit=1")
        self.assertEqual(res.status_code, status.HTTP_200_OK)
        self.assertFalse([u for u in res.data if u['username'] == 'testuser'])
        self.assertTrue([u for u in res.data if u['username'] == 'testsuperuser'])

        # Handle invalid limits
        res = client.get("/api/users/?search=super&limit=-1")
        self.assertEqual(res.status_code, status.HTTP_200_OK)
        self.assertEqual(len(res.data), 1)

