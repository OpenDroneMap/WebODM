from django.shortcuts import render, redirect
from django.http import HttpResponse


def index(request):
    return redirect('dashboard' if request.user.is_authenticated() 
                    else 'login')

def dashboard(request):
    return render(request, 'app/dashboard.html')