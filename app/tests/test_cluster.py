from django.contrib.auth.models import User
from rest_framework import status
from rest_framework.test import APIClient
from app.models import Task, Project
from .classes import BootTestCase
from webodm import settings

class TestCluster(BootTestCase):
    def setUp(self):
        pass

    def tearDown(self):
        pass

    def test_redirects(self):
        c = APIClient()
        c.login(username="testuser", password="test1234")

        settings.CLUSTER_ID = None
        settings.CLUSTER_URL = ""
        
        user = User.objects.get(username="testuser")
        self.assertIsNone(user.profile.cluster_id)

        # Can access dashboard as usual
        res = c.get('/dashboard/', follow=False)
        self.assertTrue(res.status_code == status.HTTP_200_OK)

        user.profile.cluster_id = 2
        user.profile.save()

        # Can still access dashboard as usual (clusterID not set)
        res = c.get('/dashboard/', follow=False)
        self.assertEqual(res.status_code, status.HTTP_200_OK)

        settings.CLUSTER_ID = 2
        settings.CLUSTER_URL = "http://test%s.dev"

        # Can still access dashboard as usual (clusterID match)
        res = c.get('/dashboard/', follow=False)
        self.assertEqual(res.status_code, status.HTTP_200_OK)

        settings.CLUSTER_ID = 1

        # Dashboard redirect
        res = c.get('/dashboard/', follow=False)
        self.assertEqual(res.status_code, status.HTTP_302_FOUND)
        self.assertEqual(res.url, "http://test2.dev/dashboard/")

        # With URL query
        res = c.get('/dashboard/?project_task_open=5', follow=False)
        self.assertEqual(res.status_code, status.HTTP_302_FOUND)
        self.assertEqual(res.url, "http://test2.dev/dashboard/?project_task_open=5")

        

