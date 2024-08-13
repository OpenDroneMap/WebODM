from django.contrib.auth.decorators import login_required, permission_required
from django import forms
from django.contrib import messages
from django.shortcuts import render

from app.plugins import PluginBase, Menu, MountPoint
from django.utils.translation import gettext as _


class ConfigurationForm(forms.Form):
    service_url = forms.CharField(
        label='Url service',
        max_length=100,
        required=True,
    )
    coverage_id = forms.CharField(
        label='Coverage Id',
        max_length=100,
        required=True,
    )
    token = forms.CharField(
        label='Token ',
        max_length=100,
        required=True,
    )
    task_id = forms.CharField(
        label='Task Id ',
        max_length=100,
        required=True,
    )
    buffer_size = forms.IntegerField(
        label='Buffer size in meters',
        required=True,
        min_value=0,
        max_value=1000,
    )
    bot_task_resizing_images = forms.BooleanField(
        label='Activate align generator',
        required=False,
        help_text='This will generate a file from service to align the images',
    )

    def save_settings(self):
        save(self.cleaned_data)

    def test_signal(self, request):
        from app.plugins.signals import task_resizing_images
        config_data = config()
        task_token = config_data.get("task_id")
        task_resizing_images.send(sender=self, task_id=task_token)
        messages.success(request, "Test ok")


class Plugin(PluginBase):
    def main_menu(self):
        return [Menu(_("Align Generator"), self.public_url(""), "fa fa-ruler-vertical fa-fw")]

    def app_mount_points(self):
        @login_required
        @permission_required('is_superuser', login_url='/dashboard')
        def index(request):
            if request.method == "POST":

                form = ConfigurationForm(request.POST)
                apply_configuration = request.POST.get("apply_configuration")
                signal_test = request.POST.get("test_signal")
                if form.is_valid() and signal_test:
                    form.test_signal(request)
                elif form.is_valid() and apply_configuration:
                    form.save_settings()
                    messages.success(request, "Settings applied successfully!")
            else:
                config_data = config()
                form = ConfigurationForm(initial=config_data)

            return render(request, self.template_path('index.html'), {'form': form, 'title': 'Align generator'})

        return [
            MountPoint('$', index),
        ]


def save(data: dict):
    from app.plugins.functions import get_current_plugin
    plugin = get_current_plugin(only_active=True)
    data_store = plugin.get_global_data_store()

    data_store.set_string('service_url', data.get('service_url')),
    data_store.set_string('coverage_id', data.get('coverage_id')),
    data_store.set_string('token', data.get('token')),
    data_store.set_string('task_id', data.get('task_id')),
    data_store.set_int('buffer_size', data.get('buffer_size')),
    data_store.set_bool('bot_task_resizing_images', data.get('bot_task_resizing_images')),


def config():
    from app.plugins.functions import get_current_plugin
    plugin = get_current_plugin(only_active=True)
    data_store = plugin.get_global_data_store()

    return {
        'service_url': data_store.get_string('service_url'),
        'coverage_id': data_store.get_string('coverage_id'),
        'task_id': data_store.get_string('task_id'),
        'token': data_store.get_string('token'),
        'buffer_size': data_store.get_int('buffer_size'),
        'bot_task_resizing_images': data_store.get_bool('bot_task_resizing_images'),
    }
