from django import forms
from django.shortcuts import render, redirect
from django.contrib.auth import login, authenticate
from django.contrib.auth.forms import UserCreationForm
from django.contrib.auth.models import User


class RegisterForm(UserCreationForm):
    email = forms.EmailField()
    first_name = forms.CharField(max_length=30,
                                 required=False,
                                 help_text='Optional')
    last_name = forms.CharField(max_length=30,
                                required=False,
                                help_text='Optional')

    class Meta:
        model = User
        fields = [
            "username", "first_name", "last_name", "email", "password1",
            "password2"
        ]


def register(request):
    if request.method == "POST":
        form = RegisterForm(request.POST)
        if form.is_valid():
            form.save()
            new_user = authenticate(
                username=form.cleaned_data['username'],
                password=form.cleaned_data['password1'],
            )
            login(request, new_user)
            return redirect("/dashboard")
    else:
        if request.user.is_authenticated:
            return redirect("/dashboard")
        form = RegisterForm()

    return render(request, "app/registration/register.html", {"form": form})
