from app.plugins import PluginBase, Menu, MountPoint
from app.models import Setting
from django.utils.translation import gettext as _
from django.shortcuts import render
from django.contrib import messages
from django.contrib.auth.decorators import login_required
from django import forms
from smtplib import SMTPAuthenticationError, SMTPConnectError, SMTPDataError
from . import email
from . import config

class ConfigurationForm(forms.Form):
    notification_app_name = forms.CharField(
        label='App name',
        max_length=100,
        required=True,
    )
    smtp_to_address = forms.EmailField(
        label='Send Notification to Address',
        max_length=100,
        required=True
    )
    smtp_from_address = forms.EmailField(
        label='From Address',
        max_length=100,
        required=True
    )
    smtp_server = forms.CharField(
        label='SMTP Server',
        max_length=100,
        required=True
    )
    smtp_port = forms.IntegerField(
        label='Port',
        required=True
    )
    smtp_username = forms.CharField(
        label='Username',
        max_length=100,
        required=True
    )
    smtp_password = forms.CharField(
        label='Password',
        max_length=100,
        required=True
    )
    smtp_use_tls = forms.BooleanField(
        label='Use Transport Layer Security (TLS)',
        required=False,
    )
    
    notify_task_completed = forms.BooleanField(
        label='Notify Task Completed',
        required=False,
    )
    notify_task_failed = forms.BooleanField(
        label='Notify Task Failed',
        required=False,
    )
    notify_task_removed = forms.BooleanField(
        label='Notify Task Removed',
        required=False,
    )

    def test_settings(self, request):
        try:
            settings = Setting.objects.first()
            email.send(f'{self.cleaned_data["notification_app_name"]} - Testing Notification', 'Hi, just testing if notification is working', self.cleaned_data)
            messages.success(request, f"Email sent successfully, check your inbox at {self.cleaned_data.get('smtp_to_address')}")
        except SMTPAuthenticationError as e:
            messages.error(request, 'Invalid SMTP username or password')
        except SMTPConnectError as e:
            messages.error(request, 'Could not connect to the SMTP server')
        except SMTPDataError as e:
            messages.error(request, 'Error sending email. Please try again later')
        except Exception as e:
            messages.error(request, f'An error occured: {e}')
    
    def save_settings(self):
        config.save(self.cleaned_data)
                    
class Plugin(PluginBase):
    def main_menu(self):
        return [Menu(_("Task Notification"), self.public_url(""), "fa fa-envelope fa-fw")]
    
    def include_css_files(self):
        return ['style.css']

    def app_mount_points(self):

        @login_required
        def index(request):
            if request.method == "POST":

                form = ConfigurationForm(request.POST)
                test_configuration = request.POST.get("test_configuration")
                if form.is_valid() and test_configuration:
                    form.test_settings(request)
                elif form.is_valid() and not test_configuration:
                    form.save_settings()
                    messages.success(request, "Notification settings applied successfully!")
            else:
                config_data = config.load()
                
                # notification_app_name initial value should be whatever is defined in the settings
                settings = Setting.objects.first()
                config_data['notification_app_name'] = config_data['notification_app_name'] or settings.app_name
                form = ConfigurationForm(initial=config_data)
            
            return render(request, self.template_path('index.html'), {'form' : form, 'title' : 'Task Notification'})
        
        return [
            MountPoint('$', index),
        ]