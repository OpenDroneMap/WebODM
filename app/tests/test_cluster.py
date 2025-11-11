import os
from django.contrib.auth.models import User
from rest_framework import status
from rest_framework.test import APIClient
from app.models import Task, Project, Redirect
from .classes import BootTestCase
from webodm import settings
from django.core.management import call_command
import worker

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

        other_user = User.objects.get(username="testuser2")
        other_project = Project.objects.create(owner=other_user, name="another test project")
        other_task = Task.objects.create(project=other_project, name='Test')
        other_assets_path = other_task.assets_path("")
        os.makedirs(other_assets_path, exist_ok=True)

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

        p = Project.objects.create(owner=user, name='Test', public=True)
        t = Task.objects.create(project=p, name='Test')


        assets_path = t.assets_path("")
        os.makedirs(assets_path, exist_ok=True)

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
            
            test_url('/public/task/%s/map/?t=dsm' % (t.id))
            

        self.assertIsNone(settings.CLUSTER_ID)        
        test_urls(status.HTTP_200_OK)

        # Cluster match
        settings.CLUSTER_ID = user.profile.cluster_id
        test_urls(status.HTTP_200_OK)

        # Cluster redirect
        settings.CLUSTER_ID = 3
        test_urls(status.HTTP_302_FOUND, "http://test%s.dev" % user.profile.cluster_id)
        
        # Setup redirects (dry run)
        call_command('cluster', 'redirect', '--user', user.username, '--to-cluster', '4', '--dry-run')

        # No redirects should have been setup, projects, tasks still there
        self.assertEqual(Redirect.objects.all().count(), 0)
        self.assertTrue(Project.objects.filter(pk=p.id).count() == 1)
        self.assertTrue(Task.objects.filter(pk=t.id).count() == 1)
        self.assertTrue(os.path.isdir(assets_path))

        # No changes to user profile
        user.profile.refresh_from_db()
        self.assertEqual(user.profile.cluster_id, 2)

        # Setup redirect without deleting tasks/projects      
        call_command('cluster', 'redirect', '--user', user.username, '--to-cluster', '4')

        user.profile.refresh_from_db()
        self.assertEqual(user.profile.cluster_id, 4)
        self.assertEqual(Project.objects.filter(pk=p.id).count(), 1)
        self.assertEqual(Task.objects.filter(pk=t.id).count(), 1)
        self.assertTrue(os.path.isdir(assets_path))
        self.assertEqual(Redirect.objects.all().count(), 0)

        # Setup redirect and also delete asks/projects      
        call_command('cluster', 'redirect', '--user', user.username, '--to-cluster', '5', '--delete')
        worker.tasks.process_pending_tasks()
        worker.tasks.cleanup_projects()

        user.profile.refresh_from_db()
        self.assertEqual(user.profile.cluster_id, 5)
        self.assertEqual(Project.objects.filter(pk=p.id).count(), 0)
        self.assertEqual(Task.objects.filter(pk=t.id).count(), 0)
        self.assertFalse(os.path.isdir(assets_path))
        self.assertEqual(Redirect.objects.all().count(), 3)

        self.assertEqual(Redirect.objects.filter(project_id=p.id, project_public_id=p.public_id).count(), 1)
        self.assertEqual(Redirect.objects.filter(task_id=t.id).count(), 1)
        self.assertEqual(Redirect.objects.filter(task_id=t.id).first().owner, user)
        
        # Redirects should still work
        test_urls(status.HTTP_302_FOUND, "http://test5.dev")
        
        res = c.get('/dashboard/', follow=False)
        self.assertEqual(res.status_code, status.HTTP_302_FOUND)
        self.assertEqual(res.url, "http://test5.dev/dashboard/")

        # Other user's projects / tasks are still there
        self.assertEqual(Project.objects.filter(owner=other_user).count(), 2)
        self.assertEqual(Task.objects.filter(project__owner=other_user).count(), 1)
        self.assertTrue(os.path.isdir(other_assets_path))
        




        



