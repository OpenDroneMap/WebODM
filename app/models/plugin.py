from django.db import models
from django.utils.translation import gettext_lazy as _

class Plugin(models.Model):
    name = models.CharField(max_length=255, primary_key=True, blank=False, null=False, help_text=_("Plugin name"), verbose_name=_("Name"))
    enabled = models.BooleanField(db_index=True, default=True, help_text=_("Whether this plugin is turned on."), verbose_name=_("Enabled"))

    def __str__(self):
        return self.name

    def enable(self):
        self.enabled = True
        self.save()

    def disable(self):
        self.enabled = False
        self.save()
    
    class Meta:
        verbose_name = _("Plugin")
        verbose_name_plural = _("Plugins")
