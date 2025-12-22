import threading
import time
import json
import requests
from http.server import HTTPServer, BaseHTTPRequestHandler
from django.contrib.auth.models import User, Group
from rest_framework import status
from rest_framework.test import APIClient
from app.models import Task, Project
from nodeodm.models import ProcessingNode
from worker.tasks import check_quotas
from webodm import settings
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
        t = Task.objects.create(project=p, name='Test', size=1005)
        t.save()
        t = Task.objects.create(project=p, name='Test2', size=1010)
        t.save()

        # Simulate call to task.update_size which calls clear_used_quota_cache
        user.profile.clear_used_quota_cache()

        self.assertTrue(user.profile.has_exceeded_quota())
        self.assertTrue(user.profile.has_exceeded_quota_cached())
        
        res = c.get('/dashboard/', follow=True)
        body = res.content.decode("utf-8")

        self.assertTrue("disk quota is being exceeded" in body)
        self.assertTrue("in 8 hours" in body)

        # Test that the quota exceeded notification callback works when set
        received = {}

        class WebhookHandler(BaseHTTPRequestHandler):
            def do_POST(self):
                if self.path == '/hook':
                    content_length = int(self.headers['Content-Length'])
                    post_data = self.rfile.read(content_length)
                    
                    if self.headers.get('Content-Type', '').startswith('application/json'):
                        received.update(json.loads(post_data.decode('utf-8')))
                    
                    self.send_response(200)
                    self.end_headers()
                    self.wfile.write(b'OK')

        # Start server in background thread
        server = HTTPServer(('localhost', 3050), WebhookHandler)
        server_thread = threading.Thread(target=server.serve_forever)
        server_thread.daemon = True
        server_thread.start()
        time.sleep(0.5)

        try:
            # Running the workers check_quota function will not remove tasks
            check_quotas()
            self.assertEqual(len(Task.objects.filter(project__owner=user)), 2)
            self.assertTrue(user.profile.get_quota_deadline() is not None)
            
            # No notification was called
            self.assertTrue('username' not in received)

            # Retry, but with notifications
            user.profile.clear_quota_deadline()
            settings.QUOTA_EXCEEDED_NOTIFY_URL = "http://localhost:3050/hook"
            check_quotas()
            self.assertEqual(len(Task.objects.filter(project__owner=user)), 2)
            self.assertEqual(received.get('username'), user.username)
            self.assertEqual(received.get('quota_used'), user.profile.used_quota())
            self.assertEqual(received.get('quota_total'), user.profile.quota)
            self.assertEqual(received.get('deadline'), user.profile.get_quota_deadline())
            settings.QUOTA_EXCEEDED_NOTIFY_URL = None
            
        finally:
            server.shutdown()

        # Update grace period
        def check_quota_warning(hours, text):
            user.profile.set_quota_deadline(hours)
            res = c.get('/dashboard/', follow=True)
            body = res.content.decode("utf-8")
            self.assertTrue(text in body)
        
        check_quota_warning(73, "in 3 days")
        check_quota_warning(71, "in 2 days")
        check_quota_warning(47.9, "in 47 hours")
        check_quota_warning(3.1, "in 3 hours")
        check_quota_warning(1.51, "in 90 minutes")
        check_quota_warning(0.99, "in 59 minutes")
        check_quota_warning(0, "very soon")

        # Running the check_quotas function should remove the last task only
        check_quotas()
        tasks = Task.objects.filter(project__owner=user)
        self.assertEqual(len(tasks), 1)
        self.assertEqual(tasks[0].name, "Test")