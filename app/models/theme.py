import logging

from codemirror2.widgets import CodeMirrorEditor
from django.db import models
from colorfield.fields import ColorField


logger = logging.getLogger('app.logger')

class Theme(models.Model):
    name = models.CharField(max_length=255, blank=False, null=False, help_text="Name of theme")

    # Similar to how discourse.org does it
    primary = ColorField(default='#2c3e50', help_text="Most text, icons, and borders.")
    secondary = ColorField(default='#ffffff', help_text="The main background color, and text color of some buttons.")
    tertiary = ColorField(default='#18bc9c', help_text="Navigation links.")

    button_primary = ColorField(default='#2c3e50', help_text="Primary button color.")
    button_default = ColorField(default='#95a5a6', help_text="Default button color.")
    button_danger = ColorField(default='#95a5a6', help_text="Delete button color.")

    header_background = ColorField(default='#18bc9c', help_text="Background color of the site's header.")
    header_primary = ColorField(default='#ffffff', help_text="Text and icons in the site's header.")
    highlight = ColorField(default='#f7f7f7', help_text="The background color of panels.")

    dialog_warning = ColorField(default='#f39c12', help_text="The border color of warning dialogs.")

    failed = ColorField(default='#ffcbcb', help_text="The background color of failed notifications.")
    success = ColorField(default='#cbffcd', help_text="The background color of success notifications.")

    css = models.TextField(default='', blank=True)
    html_before_header = models.TextField(default='', blank=True)
    html_after_header = models.TextField(default='', blank=True)
    html_after_body = models.TextField(default='', blank=True)
    html_footer = models.TextField(default='', blank=True)

    def __str__(self):
        return self.name

