import logging

from django.db import models
from imagekit.models import ImageSpecField
from imagekit.processors import ResizeToFit

from .theme import Theme

logger = logging.getLogger('app.logger')


class Setting(models.Model):
    app_name = models.CharField(max_length=255, blank=False, null=False, help_text="The name of your application")
    app_logo = models.ImageField(upload_to="settings/", blank=False, null=False, help_text="A 512x512 logo of your application (.png or .jpeg)")
    app_logo_36 = ImageSpecField(source='app_logo',
                                      processors=[ResizeToFit(36, 36)],
                                      format='PNG',
                                      options={'quality': 90})
    app_logo_favicon = ImageSpecField(source='app_logo',
                                      processors=[ResizeToFit(48, 48)],
                                      format='PNG',
                                      options={'quality': 90})

    organization_name = models.CharField(default='WebODM', max_length=255, blank=True, null=True, help_text="The name of your organization")
    organization_website = models.URLField(default='https://github.com/OpenDroneMap/WebODM/', max_length=255, blank=True, null=True, help_text="The website URL of your organization")
    theme = models.ForeignKey(Theme, blank=False, null=False, on_delete=models.DO_NOTHING,
                              help_text="Active theme")

    def __str__(self):
        return "Application"