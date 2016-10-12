from __future__ import unicode_literals

from django.apps import AppConfig
from .boot import boot

class MainConfig(AppConfig):
    name = 'app'
    verbose_name = 'Application'

    def ready(self):
        boot()