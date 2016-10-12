from django.db.models import signals
from django.dispatch import receiver
from django.contrib.auth.models import User, Group
import logging

logger = logging.getLogger('app.logger')

@receiver(signals.post_save, sender=User, dispatch_uid="user_check_default_group")
def check_default_group(sender, instance, created, **kwargs):
    if created:
        try:
            default_group = Group.objects.get(name="Default")
            instance.groups.add(default_group)
            instance.save()
            logger.info("Added {} to default group".format(instance.username))
        except:
            pass # Group "Default" is not available, probably loading fixtures at this moment...