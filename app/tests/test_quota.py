from django.contrib.auth.models import User, Group
from rest_framework import status
from rest_framework.test import APIClient
from app.models import Task, Project
from .classes import BootTestCase

class TestQuota(BootTestCase):
    def setUp(self):
        pass

    def tearDown(self):
        pass

    def test_quota(self):
        c = APIClient()
        c.login(username="testuser", password="test1234")

        user = User.objects.get(username="testuser")
        self.assertEqual(user.profile.quota, -1)

        # There should be no quota panel
        res = c.get('/dashboard/', follow=True)
        body = res.content.decode("utf-8")

        # There should be no quota panel
        self.assertFalse('<div class="info-item quotas">' in body)

        user.profile.quota = 2000
        user.save()

        res = c.get('/dashboard/', follow=True)
        body = res.content.decode("utf-8")

        # There should be a quota panel
        self.assertTrue('<div class="info-item quotas">' in body)

        # There should be no warning
        self.assertFalse("disk quota is being exceeded" in body)

        self.assertEqual(user.profile.used_quota(), 0)
        self.assertEqual(user.profile.used_quota_cached(), 0)
        
        # Create a task with size
        p = Project.objects.create(owner=user, name='Test')
        p.save()
        t = Task.objects.create(project=p, name='Test', size=2005)
        t.save()

        # Simulate call to task.update_size which calls clear_used_quota_cache
        user.profile.clear_used_quota_cache()

        self.assertTrue(user.profile.has_exceeded_quota())
        self.assertTrue(user.profile.has_exceeded_quota_cached())
        
        res = c.get('/dashboard/', follow=True)
        body = res.content.decode("utf-8")

        # self.assertTrue("disk quota is being exceeded" in body)
