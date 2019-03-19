import datetime

import logging
from django import template

register = template.Library()
logger = logging.getLogger('app.logger')


@register.simple_tag(takes_context=True)
def settings_image_url(context, image):
    img_cache = getattr(context['SETTINGS'], image)
    try:
        return "/media/" + img_cache.url
    except FileNotFoundError:
        logger.warning("Cannot get %s, this could mean the image was deleted." % image)
        return ''

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
