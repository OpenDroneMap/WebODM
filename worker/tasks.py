import os
import shutil
import tempfile
import traceback

import time
from threading import Event, Thread
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
import worker
from .celery import app
from app.raster_utils import export_raster_index as export_raster_index_sync
import redis

logger = get_task_logger("app.logger")
redis_client = redis.Redis.from_url(settings.CELERY_BROKER_URL)

# What class to use for async results, since during testing we need to mock it
TestSafeAsyncResult = worker.celery.MockAsyncResult if settings.TESTING else app.AsyncResult

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


# Based on https://stackoverflow.com/questions/22498038/improve-current-implementation-of-a-setinterval-python/22498708#22498708
def setInterval(interval, func, *args):
    stopped = Event()
    def loop():
        while not stopped.wait(interval):
            func(*args)
    t = Thread(target=loop)
    t.daemon = True
    t.start()
    return stopped.set

@app.task
def process_task(taskId):
    lock_id = 'task_lock_{}'.format(taskId)
    cancel_monitor = None
    delete_lock = True

    try:
        task_lock_last_update = redis_client.getset(lock_id, time.time())
        if task_lock_last_update is not None:
            # Check if lock has expired
            if time.time() - float(task_lock_last_update) <= 30:
                # Locked
                delete_lock = False
                return
            else:
                # Expired
                logger.warning("Task {} has an expired lock! This could mean that WebODM is running out of memory. Check your server configuration.".format(taskId))

        # Set lock
        def update_lock():
            redis_client.set(lock_id, time.time())
        cancel_monitor = setInterval(5, update_lock)

        try:
            task = Task.objects.get(pk=taskId)
        except ObjectDoesNotExist:
            logger.info("Task {} has already been deleted.".format(taskId))
            return

        try:
            task.process()
        except Exception as e:
            logger.error(
                "Uncaught error! This is potentially bad. Please report it to http://github.com/OpenDroneMap/WebODM/issues: {} {}".format(
                    e, traceback.format_exc()))
            if settings.TESTING: raise e
    finally:
        if cancel_monitor is not None:
            cancel_monitor()

        if delete_lock:
            try:
                redis_client.delete(lock_id)
            except redis.exceptions.RedisError:
                # Ignore errors, the lock will expire at some point
                pass



def get_pending_tasks():
    # All tasks that have a processing node assigned
    # Or that need one assigned (via auto)
    # or tasks that need a status update
    # or tasks that have a pending action
    # no partial tasks allowed
    return Task.objects.filter(Q(processing_node__isnull=True, auto_processing_node=True, partial=False) |
                                Q(Q(status=None) | Q(status__in=[status_codes.QUEUED, status_codes.RUNNING]),
                                  processing_node__isnull=False, partial=False) |
                                Q(pending_action__isnull=False, partial=False))

@app.task
def process_pending_tasks():
    tasks = get_pending_tasks()
    for task in tasks:
        process_task.delay(task.id)


@app.task
def execute_grass_script(script, serialized_context = {}, out_key='output'):
    try:
        ctx = grass.create_context(serialized_context)
        return {out_key: ctx.execute(script), 'context': ctx.serialize()}
    except GrassEngineException as e:
        logger.error(str(e))
        return {'error': str(e), 'context': ctx.serialize()}


@app.task(bind=True)
def export_raster_index(self, input, expression):
    try:
        logger.info("Exporting raster index {} with expression: {}".format(input, expression))
        tmpfile = tempfile.mktemp('_raster_index.tif', dir=settings.MEDIA_TMP)
        export_raster_index_sync(input, expression, tmpfile)
        result = {'file': tmpfile}

        if settings.TESTING:
            TestSafeAsyncResult.set(self.request.id, result)

        return result
    except Exception as e:
        logger.error(str(e))
        return {'error': str(e)}