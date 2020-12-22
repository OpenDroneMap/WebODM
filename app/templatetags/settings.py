import datetime

import logging
from django import template
from webodm import settings

register = template.Library()
logger = logging.getLogger('app.logger')

@register.simple_tag
def is_single_user_mode():
    return settings.SINGLE_USER_MODE

@register.simple_tag
def is_dev_mode():
    return settings.DEV

@register.simple_tag(takes_context=True)
def settings_image_url(context, image):
    try:
        img_cache = getattr(context['SETTINGS'], image)
    except KeyError:
        logger.warning("Cannot get SETTINGS key from context. Something's wrong in settings_image_url.")
        return ''

    try:
        return "/media/" + img_cache.url
    except FileNotFoundError:
        logger.warning("Cannot get %s, this could mean the image was deleted." % image)
        return ''

@register.simple_tag(takes_context=True)
def get_footer(context):
    try:
        settings = context['SETTINGS']
    except KeyError:
        logger.warning("Cannot get SETTINGS key from context. The footer will not be displayed.")
        return ""

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
