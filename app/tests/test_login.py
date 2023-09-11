import os
from django.test import Client
from webodm import settings
from .classes import BootTestCase

class TestLogin(BootTestCase):

    def setUp(self):
        pass

    def tearDown(self):
        pass

    def test_reset_password_render(self):
        c = Client()
        c.login(username="testuser", password="test1234")

        settings.RESET_PASSWORD_LINK = ''

        res = c.get('/login/', follow=True)
        body = res.content.decode("utf-8")

        # The reset password link should show instructions
        self.assertTrue("You can reset the administrator password" in body)

        settings.RESET_PASSWORD_LINK = 'http://0.0.0.0/reset_test'

        res = c.get('/login/', follow=True)
        body = res.content.decode("utf-8")

        # The reset password link is a link
        self.assertTrue('<a href="http://0.0.0.0/reset_test' in body)


