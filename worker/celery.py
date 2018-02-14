from celery import Celery
import os

app = Celery('tasks')
app.config_from_object('worker.celeryconfig');

if __name__ == '__main__':
    app.start()