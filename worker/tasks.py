import os
import traceback

import re

import piexif
from django.core.exceptions import ObjectDoesNotExist
from django.db.models import Count
from django.db.models import Q

from app.models import Project
from app.models import Task
from webodm import settings
from nodeodm import status_codes
from nodeodm.models import ProcessingNode
from .celery import app
from celery.utils.log import get_task_logger
from django.db import transaction
from PIL import Image
from functools import partial
from multiprocessing import Pool, cpu_count

logger = get_task_logger(__name__)

@app.task
def update_nodes_info():
    processing_nodes = ProcessingNode.objects.all()
    for processing_node in processing_nodes:
        processing_node.update_node_info()


@app.task
def cleanup_projects():
    # Delete all projects that are marked for deletion
    # and that have no tasks left
    total, count_dict = Project.objects.filter(deleting=True).annotate(
        tasks_count=Count('task')
    ).filter(tasks_count=0).delete()
    if total > 0 and 'app.Project' in count_dict:
        logger.info("Deleted {} projects".format(count_dict['app.Project']))


@app.task
def process_task(taskId):
    # TODO: would a redis lock perform better here?
    with transaction.atomic():
        try:
            task = Task.objects.filter(pk=taskId).select_for_update().get()
        except ObjectDoesNotExist:
            logger.info("Task id {} has already been deleted.".format(taskId))
            return

        if not task.processing_lock:
            task.processing_lock = True
            task.save()
        else:
            return  # Another worker beat us to it

    try:
        task.process()
    except Exception as e:
        logger.error(
            "Uncaught error! This is potentially bad. Please report it to http://github.com/OpenDroneMap/WebODM/issues: {} {}".format(
                e, traceback.format_exc()))
        if settings.TESTING: raise e
    finally:
        # Might have been deleted
        if task.pk is not None:
            task.processing_lock = False
            task.save()


@app.task
def process_pending_tasks():
    # All tasks that have a processing node assigned
    # Or that need one assigned (via auto)
    # or tasks that need a status update
    # or tasks that have a pending action
    # and that are not locked (being processed by another thread)
    tasks = Task.objects.filter(Q(processing_node__isnull=True, auto_processing_node=True) |
                                Q(Q(status=None) | Q(status__in=[status_codes.QUEUED, status_codes.RUNNING]),
                                  processing_node__isnull=False) |
                                Q(pending_action__isnull=False)).exclude(Q(processing_lock=True))

    for task in tasks:
        process_task.delay(task.id)


@app.task
def resize_image(image_path, resize_to):
    try:
        exif_dict = piexif.load(image_path)
        im = Image.open(image_path)
        path, ext = os.path.splitext(image_path)
        resized_image_path = os.path.join(path + '.resized' + ext)

        width, height = im.size
        max_side = max(width, height)
        if max_side < resize_to:
            logger.warning('We are making {} bigger ({} --> {})'.format(image_path, max_side, resize_to))

        ratio = float(resize_to) / float(max_side)
        resized_width = int(width * ratio)
        resized_height = int(height * ratio)

        im.thumbnail((resized_width, resized_height), Image.LANCZOS)

        if len(exif_dict['Exif']) > 0:
            exif_dict['Exif'][piexif.ExifIFD.PixelXDimension] = resized_width
            exif_dict['Exif'][piexif.ExifIFD.PixelYDimension] = resized_height
            im.save(resized_image_path, "JPEG", exif=piexif.dump(exif_dict), quality=100)
        else:
            im.save(resized_image_path, "JPEG", quality=100)

        im.close()

        # Delete original image, rename resized image to original
        os.remove(image_path)
        os.rename(resized_image_path, image_path)

        logger.info("Resized {}".format(os.path.basename(resized_image_path)))
    except IOError as e:
        logger.warning("Cannot resize {}: {}.".format(image_path, str(e)))
        return None

    return image_path

@app.task
def resize_images(directory, resize_to):
    """
    Destructively resize a directory of JPG images while retaining EXIF tags.
    Resulting images are always converted to JPG.
    TODO: add support for tiff files
    :return list containing paths of resized images
    """
    images_path = [os.path.join(directory, f) for f in os.listdir(directory) if re.match(r'.*\.jpe?g$', f, re.IGNORECASE)]
    resized_images = list(filter(lambda i: i is not None, Pool(cpu_count()).map(
        partial(resize_image, resize_to=resize_to),
        images_path)))
    return resized_images