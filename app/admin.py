import os
import tempfile
import zipfile
import shutil

from django.conf.urls import url
from django.contrib import admin
from django.contrib import messages
from django.http import HttpResponseRedirect
from django.urls import reverse
from django.utils.html import format_html
from guardian.admin import GuardedModelAdmin

from app.models import PluginDatum
from app.models import Preset
from app.models import Plugin
from app.plugins import get_plugin_by_name, enable_plugin, disable_plugin, delete_plugin, valid_plugin, \
    get_plugins_persistent_path, clear_plugins_cache, init_plugins
from .models import Project, Task, ImageUpload, Setting, Theme
from django import forms
from codemirror2.widgets import CodeMirrorEditor
from webodm import settings
from django.core.files.uploadedfile import InMemoryUploadedFile
from django.utils.translation import gettext_lazy as _, gettext

admin.site.register(Project, GuardedModelAdmin)


class TaskAdmin(admin.ModelAdmin):
    def has_add_permission(self, request):
        return False

    list_display = ('id', 'project', 'processing_node', 'created_at', 'status', 'last_error')
    list_filter = ('status', 'project',)
    search_fields = ('id', 'project__name')


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
    css = forms.CharField(help_text=_("Enter custom CSS"),
                          label=_("CSS"),
                          required=False,
                          widget=CodeMirrorEditor(options={'mode': 'css', 'lineNumbers': True}))
    html_before_header = forms.CharField(help_text=_("HTML that will be displayed above site header"),
                                         label=_("HTML (before header)"),
                                         required=False,
                                         widget=CodeMirrorEditor(options={'mode': 'xml', 'lineNumbers': True}))
    html_after_header = forms.CharField(help_text=_("HTML that will be displayed after site header"),
                                        label=_("HTML (after header)"),
                                        required=False,
                                        widget=CodeMirrorEditor(options={'mode': 'xml', 'lineNumbers': True}))
    html_after_body = forms.CharField(help_text=_("HTML that will be displayed after the body tag"),
                                      label=_("HTML (after body)"),
                                      required=False,
                                      widget=CodeMirrorEditor(options={'mode': 'xml', 'lineNumbers': True}))
    html_footer = forms.CharField(help_text=_(
        "HTML that will be displayed in the footer. You can also use the special tags such as {ORGANIZATION} and {YEAR}."),
        label=_("HTML (footer)"),
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
    readonly_fields = ("name",)
    change_list_template = "admin/change_list_plugin.html"

    def has_add_permission(self, request):
        return False

    def has_delete_permission(self, request, obj=None):
        return False

    def description(self, obj):
        manifest = get_plugin_by_name(obj.name, only_active=False, refresh_cache_if_none=True).get_manifest()
        return _(manifest.get('description', ''))

    description.short_description = _("Description")

    def version(self, obj):
        manifest = get_plugin_by_name(obj.name, only_active=False, refresh_cache_if_none=True).get_manifest()
        return manifest.get('version', '')

    version.short_description = _("Version")

    def author(self, obj):
        manifest = get_plugin_by_name(obj.name, only_active=False, refresh_cache_if_none=True).get_manifest()
        return manifest.get('author', '')

    author.short_description = _("Author")

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
            url(
                r'^(?P<plugin_name>.+)/delete/$',
                self.admin_site.admin_view(self.plugin_delete),
                name='plugin-delete',
            ),
            url(
                r'^actions/upload/$',
                self.admin_site.admin_view(self.plugin_upload),
                name='plugin-upload',
            ),
        ]
        return custom_urls + urls

    def plugin_enable(self, request, plugin_name, *args, **kwargs):
        try:
            p = enable_plugin(plugin_name)
            if p.requires_restart():
                messages.warning(request, _("Restart required. Please restart WebODM to enable %(plugin)s") % {
                    'plugin': plugin_name})
        except Exception as e:
            messages.warning(request, _("Cannot enable plugin %(plugin)s: %(message)s") % {'plugin': plugin_name,
                                                                                           'message': str(e)})

        return HttpResponseRedirect(reverse('admin:app_plugin_changelist'))

    def plugin_disable(self, request, plugin_name, *args, **kwargs):
        try:
            p = disable_plugin(plugin_name)
            if p.requires_restart():
                messages.warning(request, _("Restart required. Please restart WebODM to fully disable %(plugin)s") % {
                    'plugin': plugin_name})
        except Exception as e:
            messages.warning(request, _("Cannot disable plugin %(plugin)s: %(message)s") % {'plugin': plugin_name,
                                                                                            'message': str(e)})

        return HttpResponseRedirect(reverse('admin:app_plugin_changelist'))

    def plugin_delete(self, request, plugin_name, *args, **kwargs):
        try:
            delete_plugin(plugin_name)
        except Exception as e:
            messages.warning(request, _("Cannot delete plugin %(plugin)s: %(message)s") % {'plugin': plugin_name,
                                                                                           'message': str(e)})

        return HttpResponseRedirect(reverse('admin:app_plugin_changelist'))

    def plugin_upload(self, request, *args, **kwargs):
        file = request.FILES.get('file')
        if file is not None:
            # Save to tmp dir
            tmp_zip_path = tempfile.mktemp('plugin.zip', dir=settings.MEDIA_TMP)
            tmp_extract_path = tempfile.mkdtemp('plugin', dir=settings.MEDIA_TMP)

            try:
                with open(tmp_zip_path, 'wb+') as fd:
                    if isinstance(file, InMemoryUploadedFile):
                        for chunk in file.chunks():
                            fd.write(chunk)
                    else:
                        with open(file.temporary_file_path(), 'rb') as f:
                            shutil.copyfileobj(f, fd)

                # Extract
                with zipfile.ZipFile(tmp_zip_path, "r") as zip_h:
                    zip_h.extractall(tmp_extract_path)

                # Validate
                folders = os.listdir(tmp_extract_path)
                if len(folders) != 1:
                    raise ValueError("The plugin has more than 1 root directory (it should have only one)")

                plugin_name = folders[0]
                plugin_path = os.path.join(tmp_extract_path, plugin_name)
                if not valid_plugin(plugin_path):
                    raise ValueError(
                        "This doesn't look like a plugin. Are plugin.py and manifest.json in the proper place?")

                if os.path.exists(get_plugins_persistent_path(plugin_name)):
                    raise ValueError(
                        "A plugin with the name {} already exist. Please remove it before uploading one with the same name.".format(
                            plugin_name))

                # Move
                shutil.move(plugin_path, get_plugins_persistent_path())

                # Initialize
                clear_plugins_cache()
                init_plugins()

                messages.info(request, _("Plugin added successfully"))
            except Exception as e:
                messages.warning(request, _("Cannot load plugin: %(message)s") % {'message': str(e)})
                if os.path.exists(tmp_zip_path):
                    os.remove(tmp_zip_path)
                if os.path.exists(tmp_extract_path):
                    shutil.rmtree(tmp_extract_path)
        else:
            messages.error(request, _("You need to upload a zip file"))

        return HttpResponseRedirect(reverse('admin:app_plugin_changelist'))

    def plugin_actions(self, obj):
        plugin = get_plugin_by_name(obj.name, only_active=False)
        return format_html(
            '<a class="button" href="{}" {}>{}</a>&nbsp;'
            '<a class="button" href="{}" {}>{}</a>'
            + (
                '&nbsp;<a class="button" href="{}" onclick="return confirm(\'Are you sure you want to delete {}?\')"><i class="fa fa-trash"></i></a>' if not plugin.is_persistent() else '&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;')
            ,
            reverse('admin:plugin-disable', args=[obj.pk]) if obj.enabled else '#',
            'disabled' if not obj.enabled else '',
            _('Disable'),
            reverse('admin:plugin-enable', args=[obj.pk]) if not obj.enabled else '#',
            'disabled' if obj.enabled else '',
            _('Enable'),
            reverse('admin:plugin-delete', args=[obj.pk]),
            obj.name
        )

    plugin_actions.short_description = _('Actions')
    plugin_actions.allow_tags = True


admin.site.register(Plugin, PluginAdmin)
