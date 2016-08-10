from django.shortcuts import render
from django.http import HttpResponse


def index(request):
    return render(request, "app/index.html", {'hello': "Hello World!"})

def dashboard(request):
    return render(request, "app/dashboard.html")