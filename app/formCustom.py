# forms.py
from django import forms
from django.contrib.auth.forms import UserCreationForm
from django.contrib.auth.models import User

class CustomUserCreationForm(UserCreationForm):
    email = forms.EmailField(required=True)
    full_name = forms.CharField(max_length=150, required=True, label="Nome Completo")

    class Meta:
        model = User
        fields = ('username', 'password1', 'password2', 'email', 'full_name')

    def save(self, commit=True):
        user = super().save(commit=False)
        user.email = self.cleaned_data['email']
        user.first_name = self.cleaned_data['full_name'].split()[0]
        user.last_name = ' '.join(self.cleaned_data['full_name'].split()[1:])
        if commit:
            user.save()
        return user
