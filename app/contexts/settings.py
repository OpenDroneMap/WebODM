import logging

from app.models import Setting

logger = logging.getLogger('app.logger')

# Make the SETTINGS object available to all templates
def load(request=None):
    return {'SETTINGS': Setting.objects.first()}

# Helper function for libsass
# Return a theme color from the currently selected theme
def theme(color):
    try:
        return getattr(load()['SETTINGS'].theme, color)
    except Exception as e:
        logger.warning("Cannot load configuration from theme(): " + e.message)
        return "blue" # dah buh dih ah buh daa..