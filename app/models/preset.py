from django.conf import settings
from django.db import models
from django.utils import timezone
from .task import validate_task_options
from django.utils.translation import gettext_lazy as _

class Preset(models.Model):
    owner = models.ForeignKey(settings.AUTH_USER_MODEL, blank=True, null=True, on_delete=models.CASCADE, help_text=_("A pessoa que possui esta predefinição"), verbose_name=_("Owner"))
    name = models.CharField(max_length=255, blank=False, null=False, help_text=_("Um rótulo usado para descrever a predefinição"), verbose_name=_("Name"))
    options = models.JSONField(default=list, blank=True, help_text=_("Opções que definem esta predefinição (mesmo formato das opções de uma tarefa)."), verbose_name=_("Options"),
                               validators=[validate_task_options])
    created_at = models.DateTimeField(default=timezone.now, help_text=_("Data de criação"), verbose_name=_("Created at"))
    system = models.BooleanField(db_index=True, default=False, help_text=_("Se esta predefinição está disponível para todos os usuários do sistema ou apenas para seu proprietário."), verbose_name=_("System"))

    def __str__(self):
        return self.name

    class Meta:
        verbose_name = _("Preset")
        verbose_name_plural = _("Presets")
