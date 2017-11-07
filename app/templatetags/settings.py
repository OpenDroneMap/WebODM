import datetime

from django import template

from app.models import Setting

register = template.Library()


@register.assignment_tag()
def get_settings():
    return Setting.objects.first()


@register.assignment_tag()
def settings_image_url(image):
    return "/media/" + getattr(get_settings(), image).url


@register.simple_tag()
def get_footer():
    settings = get_settings()
    if settings.theme.html_footer == "": return ""

    organization = ""
    if settings.organization_name != "" and settings.organization_website != "":
        organization = "<a href='{}'>{}</a>".format(settings.organization_website, settings.organization_name)
    elif settings.organization_name != "":
        organization = settings.organization_name

    footer = settings.theme.html_footer
    footer = footer.replace("{ORGANIZATION}", organization)
    footer = footer.replace("{YEAR}", str(datetime.datetime.now().year))

    return "<footer>" + \
           footer + \
            "</footer>"
