import os
import time

from django.core.exceptions import ValidationError
from django.core.files import File

from app.contexts.settings import load as load_settings
from app.models import Setting
from app.models import Theme
from webodm import settings as webodm_settings
from .classes import BootTestCase

class TestSettings(BootTestCase):

    def setUp(self):
        pass

    def tearDown(self):
        pass

    def test_settings(self):
        # There should always be a Setting object
        self.assertTrue(Setting.objects.count() == 1, "There's a settings object")

        # There should be "default" Theme object
        self.assertTrue(Theme.objects.filter(name="Default").count() == 1, "Default theme found")

        # The default settings use the default theme
        self.assertTrue(Setting.objects.first().theme.id == Theme.objects.get(name="Default").id, "Default theme is associated to settings")

        # We can create a new theme object
        second_theme = Theme.objects.create(name="Second")

        # We cannot add another setting objects
        with self.assertRaises(ValidationError):
            Setting.objects.create(app_name="Test", theme=second_theme)

        # We can retrieve the settings
        settings = load_settings()['SETTINGS']
        self.assertTrue(settings is not None, "Can retrieve settings")

        # The default logo has been created in the proper destination
        default_logo_path = os.path.join(webodm_settings.MEDIA_ROOT, settings.app_logo.name)
        self.assertTrue(os.path.exists(default_logo_path), "Default logo exists in MEDIA_ROOT/settings")

        # Access smaller logo (should generate a cached copy),
        # and check that's been created
        self.assertTrue(settings.app_logo_favicon.url is not None)
        favicon_path = os.path.join(webodm_settings.MEDIA_ROOT, settings.app_logo_favicon.name)
        time.sleep(1)
        self.assertTrue(os.path.exists(favicon_path), "Favicon logo exists")

        # We can update the logo
        logo = os.path.join('app', 'static', 'app', 'img', 'favicon.png')
        settings.app_logo.save(os.path.basename(logo), File(open(logo, 'rb')))
        settings.save()

        # The main logo has been uploaded
        self.assertTrue("favicon" in settings.app_logo.name, "Logo has been updated")
        self.assertTrue(os.path.exists(os.path.join(webodm_settings.MEDIA_ROOT, settings.app_logo.name)),
                        "New logo exists in MEDIA_ROOT/settings")

        # The old logo does not exist anymore
        self.assertFalse(os.path.exists(default_logo_path),
                        "Old logo has been deleted")

        # The old logo caches are gone also
        self.assertFalse(os.path.exists(favicon_path), "Favicon logo has been removed")

        # Resized images have not been created yet
        logo_36_path = os.path.join(webodm_settings.MEDIA_ROOT, settings.app_logo_36.name)
        time.sleep(1)
        self.assertFalse(os.path.exists(logo_36_path), "Resized logo does not exist")

        # When we access its URL, it gets created (lazy)
        self.assertTrue(settings.app_logo_36.url is not None)
        self.assertTrue(os.path.exists(logo_36_path), "Resized logo exists")




