import logging
import traceback

from apscheduler.schedulers.background import BackgroundScheduler
from apscheduler.schedulers import SchedulerAlreadyRunningError, SchedulerNotRunningError
from threading import Thread, Lock
from multiprocessing.dummy import Pool as ThreadPool 
from nodeodm.models import ProcessingNode
from app.models import Task, Project
from django.db.models import Q, Count
from django import db
from nodeodm import status_codes

logger = logging.getLogger('app.logger')
scheduler = BackgroundScheduler({
    'apscheduler.job_defaults.coalesce': 'false',
    'apscheduler.job_defaults.max_instances': '3',
})

def background(func):
    """
    Adds background={True|False} param to any function
    so that we can call update_nodes_info(background=True) from the outside
    """
    def wrapper(*args,**kwargs):
        background = kwargs.get('background', False)
        if 'background' in kwargs: del kwargs['background']

        if background:
            # Create a function that closes all 
            # db connections at the end of the thread
            # This is necessary to make sure we don't leave
            # open connections lying around. 
            def execute_and_close_db():
                ret = None
                try:
                    ret = func(*args, **kwargs)
                finally:
                    db.connections.close_all()
                return ret

            t = Thread(target=execute_and_close_db)
            t.start()
            return t
        else:
            return func(*args, **kwargs)
    return wrapper


@background
def update_nodes_info():
    processing_nodes = ProcessingNode.objects.all()
    for processing_node in processing_nodes:
        processing_node.update_node_info()

tasks_mutex = Lock()

@background
def process_pending_tasks():
    tasks = []
    try:
        tasks_mutex.acquire()

        # All tasks that have a processing node assigned
        # but don't have a UUID
        # or tasks that have a pending action
        # and that are not locked (being processed by another thread)
        tasks = Task.objects.filter(Q(uuid='', last_error__isnull=True, processing_node__isnull=False) |
                                    Q(status__in=[status_codes.QUEUED, status_codes.RUNNING], processing_node__isnull=False) |
                                    Q(status=None, processing_node__isnull=False) |
                                    Q(pending_action__isnull=False)).exclude(Q(processing_lock=True))
        for task in tasks:
            logger.info("Acquiring lock: {}".format(task))
            task.processing_lock = True
            task.save()
    finally:
        tasks_mutex.release()

    def process(task):
        try:
            task.process()

            # Might have been deleted
            if task.pk is not None:
                task.processing_lock = False
                task.save()
        except Exception as e:
            logger.error("Uncaught error: {} {}".format(e, traceback.format_exc()))

    if tasks.count() > 0:
        pool = ThreadPool(tasks.count())
        pool.map(process, tasks, chunksize=1)
        pool.close()
        pool.join()


def cleanup_projects():
    # Delete all projects that are marked for deletion
    # and that have no tasks left
    total, count_dict = Project.objects.filter(deleting=True).annotate(
                    tasks_count=Count('task')
                ).filter(tasks_count=0).delete()
    if total > 0 and 'app.Project' in count_dict:
        logger.info("Deleted {} projects".format(count_dict['app.Project']))

def setup():
    logger.info("Starting background scheduler...")
    try:
        scheduler.start()
        scheduler.add_job(update_nodes_info, 'interval', seconds=30)
        scheduler.add_job(process_pending_tasks, 'interval', seconds=5)
        scheduler.add_job(cleanup_projects, 'interval', seconds=15)
    except SchedulerAlreadyRunningError:
        logger.warning("Scheduler already running (this is OK while testing)")

def teardown():
    logger.info("Stopping scheduler...")
    try:
        scheduler.shutdown()
        logger.info("Scheduler stopped")
    except SchedulerNotRunningError:
        logger.warning("Scheduler not running")
