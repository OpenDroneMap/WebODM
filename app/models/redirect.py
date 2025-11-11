from django.conf import settings
from django.db import models
from django.utils.translation import gettext_lazy as _

class Redirect(models.Model):
    project_id = models.IntegerField(db_index=True, default=None, unique=True, blank=True, null=True, help_text=_("Project Id"), verbose_name=_("Project Id"))
    project_public_id = models.UUIDField(db_index=True, default=None, unique=True, blank=True, null=True, help_text=_("Public identifier of the project"), verbose_name=_("Public Id"))
    task_id = models.UUIDField(db_index=True, default=None, unique=True, blank=True, null=True, help_text=_("Task Id"), verbose_name=_("Task Id"))
    owner = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.PROTECT, help_text=_("The person associated with this redirect"), verbose_name=_("Owner"))
        
    def __str__(self):
        parts = []
        if self.project_id is not None:
            parts.append("P:%s" % self.project_id)
        if self.project_public_id is not None:
            parts.append("PP:%s" % self.project_public_id)
        if self.task_id is not None:
            parts.append("T:%s" % self.task_id)

        return "|".join(parts) + " --> %s" % self.owner.profile.cluster_id

    class Meta:
        verbose_name = _("Redirect")
        verbose_name_plural = _("Redirects")
