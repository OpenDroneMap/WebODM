import logging

from django.dispatch import receiver

from app.models import Task
from app.plugins.functions import get_current_plugin
from app.plugins.signals import task_resizing_images

from . import config
from .process import generate_align_tif, get_coords_from_images

logger = logging.getLogger('app.logger')


@receiver(task_resizing_images)
def handle_task_resizing_images(sender, task_id, **kwargs):
    if get_current_plugin(only_active=True) is None:
        return

    config_data = config()
    if config_data.get("bot_task_resizing_images"):
        task = Task.objects.get(id=task_id)
        coords = get_coords_from_images(task.scan_images(), task)

        if coords:
            generate_align_tif(coords, task)
        else:
            logger.info("No GPS data found")
