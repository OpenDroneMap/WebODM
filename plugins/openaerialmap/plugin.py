from django.contrib import messages
from django.shortcuts import render

from app.plugins import PluginBase, Menu, MountPoint
from django.contrib.auth.decorators import login_required
from django import forms

class TokenForm(forms.Form):
    token = forms.CharField(label='', required=False, max_length=1024, widget=forms.TextInput(attrs={'placeholder': 'Token'}))


class Plugin(PluginBase):

    def main_menu(self):
        return [Menu("OpenAerialMap", self.public_url(""), "oam-icon fa fa-fw")]

    def include_js_files(self):
        return ['main.js']

    def include_css_files(self):
        return ['style.css']

    def app_mount_points(self):
        return [
            MountPoint('$', self.home_view())
        ]

    def home_view(self):
        @login_required
        def home(request):
            ds = self.get_user_data_store(request.user)

            # if this is a POST request we need to process the form data
            if request.method == 'POST':
                form = TokenForm(request.POST)
                if form.is_valid():
                    ds.set_string('token', form.cleaned_data['token'])
                    messages.success(request, 'Token updated.')

            form = TokenForm(initial={'token': ds.get_string('token', default="")})

            return render(request, self.template_path("app.html"), {
                'title': 'OpenAerialMap',
                'form': form
            })

        return home

