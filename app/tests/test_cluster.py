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
        
        settings.CLUSTER_ID = None

        p = Project.objects.create(owner=user, name='Test')
        p.public = True 
        p.save()
        p.refresh_from_db()

        t = Task.objects.create(project=p, name='Test')
        t.save()

        # Can access project, tasks
        def test_urls(expect_status, url_redirect_prefix=None):
            def test_url(url):
                res = c.get(url, follow=False)
                self.assertEqual(res.status_code, expect_status)
                if url_redirect_prefix is not None:
                    self.assertEqual(res.url, url_redirect_prefix + url)

            test_url('/map/project/%s/' % p.id)
            test_url('/map/project/%s/task/%s/' % (p.id, t.id))
            test_url('/public/project/%s/map/' % (p.public_id))
            test_url('/public/task/%s/map/' % (t.id))
            test_url('/public/task/%s/3d/' % (t.id))
            test_url('/public/task/%s/iframe/map/' % (t.id))
            test_url('/public/task/%s/iframe/3d/' % (t.id))

        self.assertIsNone(settings.CLUSTER_ID)        
        test_urls(status.HTTP_200_OK)

        # Cluster match
        settings.CLUSTER_ID = user.profile.cluster_id
        test_urls(status.HTTP_200_OK)

        # Cluster redirect
        settings.CLUSTER_ID = 3
        test_urls(status.HTTP_302_FOUND, "http://test%s.dev" % user.profile.cluster_id)
        