from rest_framework import status
from rest_framework.test import APIClient
from webodm import settings
from .classes import BootTestCase

class TestAutoLogin(BootTestCase):
    def setUp(self):
        pass

    def tearDown(self):
        pass

    def test_auto_login(self):
        c = APIClient()

        # Unauthenticated by default redirects to login
        res = c.get('/', follow=True)
        self.assertFalse(res.context['user'].is_authenticated)
        self.assertRedirects(res, '/login/')

        # Enable auto login
        settings.AUTO_LOGIN_USER = "testuser"

        # Automatically logs in when visiting dashboard
        res = c.get('/', follow=True)
        self.assertRedirects(res, '/dashboard/')
        self.assertTrue(res.context['user'].is_authenticated)
        self.assertEqual(res.content.decode("utf-8").count('Hello, testuser!'), 1)

        settings.AUTO_LOGIN_USER = None