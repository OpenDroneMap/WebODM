from worker.celery import app
# noinspection PyUnresolvedReferences
from worker.tasks import execute_grass_script

task = app.task
