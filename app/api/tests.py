from django.test import TestCase
from rest_framework.test import APIClient
from rest_framework import status

from app.models import Project
from django.contrib.auth.models import User

class TestApi(TestCase):

    fixtures = ['test_users', 'test_projects', ]

    def setUp(self):
        Project(
            owner=User.objects.get(username="testuser"),
            name="test project"
        ).save()

    def tearDown(self):
        pass

    def test_project_list(self):
        client = APIClient()

        # Forbidden without credentials
        res = client.get('/api/projects/')
        self.assertEqual(res.status_code, status.HTTP_403_FORBIDDEN)

        client.login(username="testuser", password="test1234")
        res = client.get('/api/projects/')
        self.assertEqual(res.status_code, status.HTTP_200_OK)
        self.assertTrue(len(res.data["results"]) > 0)

        res = client.get('/api/projects/1/')
        self.assertEqual(res.status_code, status.HTTP_200_OK)

        res = client.get('/api/projects/dasjkldas/')
        self.assertEqual(res.status_code, status.HTTP_404_NOT_FOUND)
