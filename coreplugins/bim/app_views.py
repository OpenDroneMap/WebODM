import json
import requests

from django import forms
from django.contrib import messages
from django.http import HttpResponse
from django.shortcuts import render
from django.contrib.auth.decorators import login_required

def HomeView(plugin):
    @login_required
    def view(request):
        # Определяем базовый URL в зависимости от того, как зашли
        base_url = "/bim/" if request.path.startswith("/bim/") else plugin.public_url("")
        
        return render(
            request,
            plugin.template_path("app.html"),
            {
                "title": "Test", 
                "plugin": plugin,
                "test_url": base_url + "test" if base_url.endswith("/") else base_url + "/test"
            },
        )

    return view

def TestView(plugin):
    @login_required
    def view(request):
        # Определяем базовый URL в зависимости от того, как зашли
        base_url = "/bim/" if request.path.startswith("/bim/") else plugin.public_url("")
        
        return render(
            request,
            plugin.template_path("test.html"),
            {
                "title": "Test", 
                "plugin": plugin,
                "home_url": base_url
            },
        )

    return view