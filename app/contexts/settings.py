import logging

from app.models import Setting

logger = logging.getLogger('app.logger')

# Make the SETTINGS object available to all templates
def load(request=None):
    return {'SETTINGS': Setting.objects.first()}
