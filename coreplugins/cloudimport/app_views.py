import requests

from django import forms
from django.contrib import messages
from django.http import HttpResponse
from django.shortcuts import render
from django.contrib.auth.decorators import login_required

from app.plugins import logger

from .platform_helper import get_all_extended_platforms

class DynamicForm(forms.Form):
    """This dynamic form will go through all the extended platforms, and retrieve their fields"""
    def __init__(self, *args, **kwargs):
        ds = kwargs.pop('data_store')
        super(DynamicForm, self).__init__(*args, **kwargs)
        extended_platforms = get_all_extended_platforms()
        
        for platform in extended_platforms:
            for form_field in platform.get_form_fields():
                django_field = form_field.get_django_field(ds)
                django_field.group = platform.name
                self.fields[form_field.field_id] = django_field
                
def HomeView(plugin):
    @login_required
    def view(request):
        ds = plugin.get_user_data_store(request.user)

        # if this is a POST request we need to process the form data
        if request.method == "POST":
            form = DynamicForm(request.POST, data_store = ds)
            if form.is_valid():
                extended_platforms = get_all_extended_platforms()
                for platform in extended_platforms:
                    for form_field in platform.get_form_fields():
                        form_field.save_value(ds, form)
                    
                messages.success(request, "Configuration updated successfuly!")
        else:
            form = DynamicForm(data_store = ds)

        return render(
            request,
            plugin.template_path("app.html"),
            {"title": "Cloud Import", "form": form},
        )

    return view


def LoadButtonsView(plugin):
    def view(request):

        return render(
            request,
            plugin.template_path("load_buttons.js"),
            {
                "api_url": "/api" + plugin.public_url("").rstrip("/"),
            },
            content_type="text/javascript",
        )

    return view
