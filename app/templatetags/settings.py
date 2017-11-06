from django import template

from app.models import Setting
from webodm import settings

register = template.Library()


@register.assignment_tag()
def get_settings():
    return Setting.objects.first()


@register.assignment_tag()
def settings_image_url(image):
    return "/media/" + getattr(Setting.objects.first(), image).url
