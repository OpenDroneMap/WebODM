import traceback

from celery.utils.log import get_task_logger
from django.core.exceptions import ObjectDoesNotExist
from django.db import transaction
from django.db.models import Count
from django.db.models import Q

from app.models import Project
from app.models import Task
from nodeodm import status_codes
from nodeodm.models import ProcessingNode
from webodm import settings
from .celery import app

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
