from django.contrib import admin
from .models import ProcessingNode

class ProcessingNodeAdmin(admin.ModelAdmin):
    fields = ('hostname', 'port')

admin.site.register(ProcessingNode, ProcessingNodeAdmin)