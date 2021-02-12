from __future__ import unicode_literals

from django.apps import AppConfig
from django.utils.translation import gettext_lazy as _

class NodeodmConfig(AppConfig):
    name = 'nodeodm'
    verbose_name = _('Node Management')
