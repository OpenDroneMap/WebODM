import os
import shutil
import traceback

import time
from celery.utils.log import get_task_logger
from django.core.exceptions import ObjectDoesNotExist
from django.db.models import Count
from django.db.models import Q

from app.models import Project
from app.models import Task
from app.plugins.grass_engine import grass, GrassEngineException
from nodeodm import status_codes
from nodeodm.models import ProcessingNode
from webodm import settings
from .celery import app
import redis

logger = get_task_logger(__name__)
redis_client = redis.Redis.from_url(settings.CELERY_BROKER_URL)

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
def cleanup_tmp_directory():
    # Delete files and folder in the tmp directory that are
    # older than 24 hours
    tmpdir = settings.MEDIA_TMP
    time_limit = 60 * 60 * 24

    for f in os.listdir(tmpdir):
        now = time.time()
        filepath = os.path.join(tmpdir, f)
        modified = os.stat(filepath).st_mtime
        if modified < now - time_limit:
            if os.path.isfile(filepath):
                os.remove(filepath)
            else:
                shutil.rmtree(filepath, ignore_errors=True)

            logger.info('Cleaned up: %s (%s)' % (f, modified))


@app.task
def process_task(taskId):
    try:
        lock = redis_client.lock('task_lock_{}'.format(taskId))
        have_lock = lock.acquire(blocking=False)

        if not have_lock:
            return

        try:
            task = Task.objects.get(pk=taskId)
        except ObjectDoesNotExist:
            logger.info("Task id {} has already been deleted.".format(taskId))
            return

        try:
            task.process()
        except Exception as e:
            logger.error(
                "Uncaught error! This is potentially bad. Please report it to http://github.com/OpenDroneMap/WebODM/issues: {} {}".format(
                    e, traceback.format_exc()))
            if settings.TESTING: raise e
    finally:
        try:
            if have_lock:
                lock.release()
        except redis.exceptions.LockError:
            # A lock could have expired
            pass

def get_pending_tasks():
    # All tasks that have a processing node assigned
    # Or that need one assigned (via auto)
    # or tasks that need a status update
    # or tasks that have a pending action
    return Task.objects.filter(Q(processing_node__isnull=True, auto_processing_node=True) |
                                Q(Q(status=None) | Q(status__in=[status_codes.QUEUED, status_codes.RUNNING]),
                                  processing_node__isnull=False) |
                                Q(pending_action__isnull=False))

@app.task
def process_pending_tasks():
    tasks = get_pending_tasks()
    for task in tasks:
        process_task.delay(task.id)


@app.task
def execute_grass_script(script, serialized_context = {}):
    try:
        ctx = grass.create_context(serialized_context)
        return {'output': ctx.execute(script), 'context': ctx.serialize()}
    except GrassEngineException as e:
        return {'error': str(e)}