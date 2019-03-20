from django.db import models


class Plugin(models.Model):
    name = models.CharField(max_length=255, primary_key=True, blank=False, null=False, help_text="Plugin name")
    enabled = models.BooleanField(db_index=True, default=True, help_text="Whether this plugin is enabled.")

    def __str__(self):
        return self.name