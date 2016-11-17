from django.contrib import admin
from guardian.admin import GuardedModelAdmin

from .models import ProcessingNode

class ProcessingNodeAdmin(GuardedModelAdmin):
    fields = ('hostname', 'port')

admin.site.register(ProcessingNode, ProcessingNodeAdmin)
