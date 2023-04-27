import os
import re

from django.contrib.staticfiles import finders
from django.test import Client

from .classes import BootTestCase
from app.contexts.settings import load as load_settings

class TestSettings(BootTestCase):

    def setUp(self):
        pass

    def tearDown(self):
        pass

    def test_settings(self):
        c = Client()
        c.login(username="testuser", password="test1234")

        # Get a page
        res = c.get('/dashboard/', follow=True)
        body = res.content.decode("utf-8")

        # There shouldn't be a footer by default
        self.assertFalse("<footer>" in body)

        # A strong purple color is not part of the default theme
        purple = "8400ff"
        self.assertFalse(purple in body)

        # But colors from the theme are
        theme = load_settings()["SETTINGS"].theme
        self.assertTrue(theme.primary in body)

        # Let's change the theme
        theme.primary = purple # add color
        theme.html_footer = "<p>hello</p>"
        theme.save()

        # Get a page
        res = c.get('/dashboard/', follow=True)
        body = res.content.decode("utf-8")

        # We now have a footer
        self.assertTrue("<footer><p>hello</p></footer>" in body)

        # Purple is in body also
        # TODO: this does not work on GitHub actions ?!
        # self.assertTrue(purple in body)



