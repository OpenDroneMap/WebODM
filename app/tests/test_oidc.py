from urllib.parse import urlparse, parse_qs
from unittest.mock import Mock, patch

from django.contrib import messages
from django.contrib.auth.models import User
from django.contrib.messages.storage.fallback import FallbackStorage
from django.contrib.sessions.middleware import SessionMiddleware
from django.test import RequestFactory
from rest_framework import status
from rest_framework.test import APIClient

from webodm import settings
from .classes import BootTestCase


class TestOIDC(BootTestCase):
    def test_oidc(self):
        # Login page does not show OIDC buttons by default
        settings.OIDC_AUTH_PROVIDERS = []
        c = APIClient()

        res = c.get('/login/')
        self.assertEqual(res.status_code, status.HTTP_200_OK)
        self.assertNotIn('oidcLoginButton', res.content.decode('utf-8'))

        # Endpoints are not available
        res = c.get('/oidc/login/0/')
        self.assertEqual(res.status_code, status.HTTP_404_NOT_FOUND)
        res = c.get('/oidc/callback/')
        self.assertEqual(res.status_code, status.HTTP_404_NOT_FOUND)

        settings.OIDC_AUTH_PROVIDERS = [{
            'client_id': 'client-1',
            'client_secret': 'secret-1',
            'auth_endpoint': 'https://idp.example.com/authorize',
            'token_endpoint': 'https://idp.example.com/token',
            'userinfo_endpoint': 'https://idp.example.com/userinfo',
            'icon': '',
            'name': 'Provider A',
        }]

        # Now button displays
        res = c.get('/login/')
        self.assertEqual(res.status_code, status.HTTP_200_OK)
        self.assertIn('oidcLoginButton', res.content.decode('utf-8'))
        self.assertIn('Provider A', res.content.decode('utf-8'))
        

        # Test redirect
        res = c.get('/oidc/login/0/?next=/dashboard/')
        self.assertEqual(res.status_code, status.HTTP_302_FOUND)
        self.assertTrue(res.url.startswith('https://idp.example.com/authorize?'))

        qs = parse_qs(urlparse(res.url).query)
        self.assertEqual(qs.get('response_type', [''])[0], 'code')
        self.assertEqual(qs.get('client_id', [''])[0], 'client-1')
        self.assertTrue(qs.get('redirect_uri', [''])[0].endswith('/oidc/callback/'))
        self.assertEqual(qs.get('scope', [''])[0], 'openid email')

        # Basic test that the callback endpoint exists
        res = c.get('/oidc/callback/')
        self.assertEqual(res.status_code, status.HTTP_302_FOUND)

        # We could mock a session and test the callback logic
        # but honestly, this requires some manual testing for 
        # effectively testing if the callback works in the real world.