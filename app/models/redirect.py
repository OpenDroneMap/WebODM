from django.conf import settings
from django.db import models
from django.utils.translation import gettext_lazy as _

class Redirect(models.Model):
    project_id = models.IntegerField(db_index=True, default=None, unique=True, blank=True, null=True, help_text=_("Project Id"), verbose_name=_("Project Id"))
    project_public_id = models.UUIDField(db_index=True, default=None, unique=True, blank=True, null=True, help_text=_("Public identifier of the project"), verbose_name=_("Public Id"))
    task_id = models.UUIDField(db_index=True, default=None, unique=True, blank=True, null=True, help_text=_("Task Id"), verbose_name=_("Task Id"))
    
    cluster_id = models.IntegerField(blank=False, null=False, help_text=_("Cluster Id to redirect to"), verbose_name=_("Cluster Id"))

    def __str__(self):
        parts = []
        if self.project_id is not None:
            parts.append("P:%s" % self.project_id)
        if self.project_public_id is not None:
            parts.append("PP:%s" % self.project_public_id)
        if self.task_id is not None:
            parts.append("T:%s" % self.task_id)

        return "|".join(parts) + " --> %s" % self.cluster_id

    class Meta:
        verbose_name = _("Redirect")
        verbose_name_plural = _("Redirects")
