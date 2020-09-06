import datetime

import logging
from django import template
from webodm import settings

register = template.Library()
logger = logging.getLogger('app.logger')

@register.simple_tag
def is_single_user_mode():
    return settings.SINGLE_USER_MODE


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
