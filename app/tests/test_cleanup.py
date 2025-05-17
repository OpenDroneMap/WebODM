from django.contrib.auth.models import User, Group
from rest_framework import status
from rest_framework.test import APIClient
from app.models import Task, Project
from django.utils import timezone
from datetime import timedelta
from worker.tasks import cleanup_tasks, cleanup_projects
from .classes import BootTestCase
from webodm import settings

class TestCleanup(BootTestCase):
    def setUp(self):
        pass

    def tearDown(self):
        pass

    def test_quota(self):
        c = APIClient()
        c.login(username="testuser", password="test1234")

        user = User.objects.get(username="testuser")
        
        # Create a task with size
        p = Project.objects.create(owner=user, name='Test')
        p.save()
        t = Task.objects.create(project=p, partial=True, name='Now', created_at=timezone.now())
        t.save()
        t = Task.objects.create(project=p, partial=True, name='2 hours ago', created_at=timezone.now() - timedelta(hours=2))
        t.save()
        t = Task.objects.create(project=p, name='2 hours ago but not partial', created_at=timezone.now() - timedelta(hours=2))
        t.save()

        # Simulate call to worker cleanup process
        settings.CLEANUP_PARTIAL_TASKS = None
        cleanup_tasks()
        self.assertEqual(Task.objects.filter(project=p).count(), 3)

        settings.CLEANUP_PARTIAL_TASKS = 3
        cleanup_tasks()
        self.assertEqual(Task.objects.filter(project=p).count(), 3)

        settings.CLEANUP_PARTIAL_TASKS = 1
        cleanup_tasks()
        self.assertEqual(Task.objects.filter(project=p).count(), 2)
        names = [t.name for t in Task.objects.filter(project=p)]
        self.assertTrue("Now" in names)
        self.assertTrue("2 hours ago but not partial" in names)
    
    def test_project_cleanup(self):
        user = User.objects.get(username="testuser")
        
        # Create a task
        p = Project.objects.create(owner=user, name='With tasks 2 hours ago', created_at=timezone.now() - timedelta(hours=2))
        p.save()
        t = Task.objects.create(project=p, name='Task')
        t.save()
        p2 = Project.objects.create(owner=user, name='Empty 2 hours ago', created_at=timezone.now() - timedelta(hours=2))
        p2.save()
        p3 = Project.objects.create(owner=user, name='Empty Now', created_at=timezone.now())
        p3.save()

        self.assertEqual(p.task_set.count(), 1)
        self.assertEqual(user.profile.quota, -1)
        self.assertEqual(user.project_set.count(), 4)

        settings.CLEANUP_EMPTY_PROJECTS = 1

        # Dont cleanup projects if quota is unlimited (-1) 
        cleanup_projects()
        self.assertEqual(user.project_set.count(), 4)

        user.profile.quota = 100
        user.profile.save()

        # Dont cleanup projects if there's a quota
        cleanup_projects()
        self.assertEqual(user.project_set.count(), 4)
        
        user.profile.quota = 0
        user.profile.save()

        # If user's quota is zero
        # Cleanup empty projects that are older than 1 hour
        for _ in range(2):
            cleanup_projects()
            self.assertEqual(user.project_set.count(), 3)
            
            self.assertFalse(('Empty 2 hours ago' in [p.name for p in user.project_set.all()]))
            self.assertTrue(('With tasks 2 hours ago' in [p.name for p in user.project_set.all()]))
            self.assertTrue(('Empty Now' in [p.name for p in user.project_set.all()]))

        # Recreate..
        p2 = Project.objects.create(owner=user, name='Empty 2 hours ago', created_at=timezone.now() - timedelta(hours=2))
        p2.save()

        # Disable
        settings.CLEANUP_EMPTY_PROJECTS = None
        self.assertEqual(user.project_set.count(), 4)

        # Dont'cleanup if disabled
        cleanup_projects()
        self.assertEqual(user.project_set.count(), 4)
        

