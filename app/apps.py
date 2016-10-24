from __future__ import unicode_literals

from django.apps import AppConfig
from .boot import boot
from webodm import settings

class MainConfig(AppConfig):
    name = 'app'
    verbose_name = 'Application'

    def ready(self):
        # Test cases call boot() independently
        if not settings.TESTING:
            boot()