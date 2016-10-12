from django.contrib import admin
from guardian.admin import GuardedModelAdmin
from .models import Project, Task

admin.site.register(Project, GuardedModelAdmin)
admin.site.register(Task, GuardedModelAdmin)
