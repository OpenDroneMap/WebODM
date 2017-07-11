from django.contrib import admin
from guardian.admin import GuardedModelAdmin
from .models import Project, Task, ImageUpload

admin.site.register(Project, GuardedModelAdmin)

class TaskAdmin(admin.ModelAdmin):
    def has_add_permission(self, request):
        return False
admin.site.register(Task, TaskAdmin)

class ImageUploadAdmin(admin.ModelAdmin):
    readonly_fields = ('image',)
admin.site.register(ImageUpload, ImageUploadAdmin)
