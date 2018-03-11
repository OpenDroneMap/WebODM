import datetime

from django import template

register = template.Library()


@register.simple_tag(takes_context=True)
def settings_image_url(context, image):
    return "/media/" + getattr(context['SETTINGS'], image).url


@register.simple_tag(takes_context=True)
def get_footer(context):
    settings = context['SETTINGS']
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
