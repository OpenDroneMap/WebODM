from django.contrib import admin
from guardian.admin import GuardedModelAdmin
from .models import Project, Task, ImageUpload

admin.site.register(Project, GuardedModelAdmin)
admin.site.register(Task, admin.ModelAdmin)

class ImageUploadAdmin(admin.ModelAdmin):
    readonly_fields = ('image',)
admin.site.register(ImageUpload, ImageUploadAdmin)
