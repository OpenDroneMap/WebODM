from django.contrib import admin
from guardian.admin import GuardedModelAdmin

from app.models import Preset
from .models import Project, Task, ImageUpload, Setting, Theme

admin.site.register(Project, GuardedModelAdmin)

class TaskAdmin(admin.ModelAdmin):
    def has_add_permission(self, request):
        return False
admin.site.register(Task, TaskAdmin)

class ImageUploadAdmin(admin.ModelAdmin):
    readonly_fields = ('image',)
admin.site.register(ImageUpload, ImageUploadAdmin)

admin.site.register(Preset, admin.ModelAdmin)


class SettingAdmin(admin.ModelAdmin):
    def has_add_permission(self, request):
        # if there's already an entry, do not allow adding
        count = Setting.objects.all().count()
        return count == 0

admin.site.register(Setting, SettingAdmin)
admin.site.register(Theme, admin.ModelAdmin)