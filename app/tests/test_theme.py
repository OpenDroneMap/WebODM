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

        # Find the theme.scss file
        matches = re.search(r'/static/(CACHE/css/theme\.[\w\d]+\.css)', body)
        self.assertTrue(matches is not None, "Found theme.css")

        # We can find it in the file system
        css_file = finders.find(matches.group(1))
        self.assertTrue(os.path.exists(css_file), "theme.css exists in file system")

        css_content = ""
        with open(css_file, "r") as f:
            css_content = f.read()

        # A strong purple color is not part of the default theme
        purple = "8400ff"
        self.assertFalse(purple in css_content)

        # But colors from the theme are
        theme = load_settings()["SETTINGS"].theme
        self.assertTrue(theme.primary in css_content)

        # Let's change the theme
        theme.primary = purple # add color
        theme.html_footer = "<p>hello</p>"
        theme.save()

        # A new cache file should have been created for the CSS

        # Get a page
        res = c.get('/dashboard/', follow=True)
        body = res.content.decode("utf-8")

        # We now have a footer
        self.assertTrue("<footer><p>hello</p></footer>" in body)

        # Find the theme.scss file
        matches = re.search(r'/static/(CACHE/css/theme\.[\w\d]+\.css)', body)
        self.assertTrue(matches is not None, "Found theme.css")

        new_css_file = finders.find(matches.group(1))
        self.assertTrue(os.path.exists(new_css_file), "new theme.css exists in file system")

        # It's not the same file
        self.assertTrue(new_css_file != css_file, "It's a new file")

        # Purple color is in there
        css_content = ""
        with open(new_css_file, "r") as f:
            css_content = f.read()

        self.assertTrue(purple in css_content)



