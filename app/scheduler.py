import logging
from apscheduler.schedulers.background import BackgroundScheduler
from apscheduler.schedulers import SchedulerAlreadyRunningError, SchedulerNotRunningError
import threading
from nodeodm.models import ProcessingNode
from app.models import Task
import random

logger = logging.getLogger('app.logger')
scheduler = None

# Adds background={True|False} param to any function
# So that we can call update_nodes_info(background=True) from the outside
def job(func):
    def wrapper(*args,**kwargs):
        if (kwargs.get('background', False)):
            thread = (threading.Thread(target=func))
            thread.start()
            return thread
        else:
            return func(*args, **kwargs)
    return wrapper

@job
def update_nodes_info():
    processing_nodes = ProcessingNode.objects.all()
    for processing_node in processing_nodes:
        processing_node.update_node_info()

@job
def process_pending_tasks():
    tasks = Task.objects.filter(uuid=None).exclude(processing_node=None)
    for task in tasks:
        print("Need to process: {}".format(task))

def setup():
    global scheduler

    logger.info("Starting background scheduler...")
    try:
        scheduler = BackgroundScheduler()
        scheduler.start()
        scheduler.add_job(update_nodes_info, 'interval', seconds=30)
        scheduler.add_job(process_pending_tasks, 'interval', seconds=15)
    except SchedulerAlreadyRunningError:
        logger.warn("Scheduler already running (this is OK while testing)")

def teardown():
    if scheduler != None:
        logger.info("Stopping scheduler...")
        try:
            scheduler.shutdown(wait=False)
        except SchedulerNotRunningError:
            logger.warn("Scheduler not running")
