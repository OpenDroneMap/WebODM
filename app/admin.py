from django.contrib import admin
from guardian.admin import GuardedModelAdmin

from app.models import Preset
from .models import Project, Task, ImageUpload, Setting, Theme
from django import forms
from codemirror2.widgets import CodeMirrorEditor

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


class ThemeModelForm(forms.ModelForm):
    css = forms.CharField(help_text="Enter custom CSS",
                          required=False,
                          widget=CodeMirrorEditor(options={'mode': 'css', 'lineNumbers': True}))
    html_before_header = forms.CharField(help_text="HTML that will be displayed above site header",
                                         required=False,
                                         widget=CodeMirrorEditor(options={'mode': 'xml', 'lineNumbers': True}))
    html_after_header = forms.CharField(help_text="HTML that will be displayed after site header",
                                        required=False,
                                        widget=CodeMirrorEditor(options={'mode': 'xml', 'lineNumbers': True}))
    html_after_body = forms.CharField(help_text="HTML that will be displayed after the &lt;/body&gt; tag",
                                      required=False,
                                    widget=CodeMirrorEditor(options={'mode': 'xml', 'lineNumbers': True}))
    html_footer = forms.CharField(help_text="HTML that will be displayed in the footer. You can also use the special tags:"
                                            "<p class='help'>{ORGANIZATION}: show a link to your organization.</p>"
                                            "<p class='help'>{YEAR}: show current year</p>",
                                  required=False,
                                  widget=CodeMirrorEditor(options={'mode': 'xml', 'lineNumbers': True}))

    class Meta:
        model = Theme
        fields = '__all__'


class ThemeAdmin(admin.ModelAdmin):
    form = ThemeModelForm


admin.site.register(Theme, ThemeAdmin)