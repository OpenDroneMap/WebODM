from django.conf.urls import url
from django.contrib import admin
from django.http import HttpResponseRedirect
from django.urls import reverse
from django.utils.html import format_html
from guardian.admin import GuardedModelAdmin

from app.models import PluginDatum
from app.models import Preset
from app.models import Plugin
from app.plugins import get_plugin_by_name
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
admin.site.register(PluginDatum, admin.ModelAdmin)


class PluginAdmin(admin.ModelAdmin):
    list_display = ("name", "description", "version", "author", "enabled", "plugin_actions")
    readonly_fields = ("name", )

    def has_add_permission(self, request):
        return False
    def has_delete_permission(self, request, obj=None):
        return False

    def description(self, obj):
        manifest = get_plugin_by_name(obj.name, only_active=False, refresh_cache_if_none=True).get_manifest()
        return manifest.get('description', '')

    def version(self, obj):
        manifest = get_plugin_by_name(obj.name, only_active=False, refresh_cache_if_none=True).get_manifest()
        return manifest.get('version', '')

    def author(self, obj):
        manifest = get_plugin_by_name(obj.name, only_active=False, refresh_cache_if_none=True).get_manifest()
        return manifest.get('author', '')

    def get_urls(self):
        urls = super().get_urls()
        custom_urls = [
            url(
                r'^(?P<plugin_name>.+)/enable/$',
                self.admin_site.admin_view(self.plugin_enable),
                name='plugin-enable',
            ),
            url(
                r'^(?P<plugin_name>.+)/disable/$',
                self.admin_site.admin_view(self.plugin_disable),
                name='plugin-disable',
            ),
        ]
        return custom_urls + urls

    def plugin_enable(self, request, plugin_name, *args, **kwargs):
        p = Plugin.objects.get(pk=plugin_name)
        p.enabled = True
        p.save()
        return HttpResponseRedirect(reverse('admin:app_plugin_changelist'))

    def plugin_disable(self, request, plugin_name, *args, **kwargs):
        p = Plugin.objects.get(pk=plugin_name)
        p.enabled = False
        p.save()
        return HttpResponseRedirect(reverse('admin:app_plugin_changelist'))

    def plugin_actions(self, obj):
        return format_html(
            '<a class="button" href="{}" {}>Disable</a>&nbsp;'
            '<a class="button" href="{}" {}>Enable</a>',
            reverse('admin:plugin-disable', args=[obj.pk]) if obj.enabled else '#',
            'disabled' if not obj.enabled else '',
            reverse('admin:plugin-enable', args=[obj.pk]) if not obj.enabled else '#',
            'disabled' if obj.enabled else '',
        )

    plugin_actions.short_description = 'Actions'
    plugin_actions.allow_tags = True


admin.site.register(Plugin, PluginAdmin)
