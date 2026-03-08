import importlib
from worker.celery import app
from webodm import settings

task = app.task

def run_function_async(func, *args, **kwargs):
    """
    Run a function asynchronously using Celery.
    Plugins should use this function so that they don't
    have to register new Celery tasks at startup.
    :param {Function} a module-level function to execute
    """
    return call_async.delay(func.__module__, func.__qualname__, *args, **kwargs)


@app.task(bind=True, time_limit=settings.WORKERS_MAX_TIME_LIMIT)
def call_async(self, module_path, funcname, *args, **kwargs):
    """
    Run a Python function asynchronously using Celery.
    It's recommended to use run_function_async instead.
    """
    module = importlib.import_module(module_path)
    func = getattr(module, funcname)

    if kwargs.get("with_progress"):
        def progress_callback(status, perc):
            self.update_state(state="PROGRESS", meta={"status": status, "progress": perc})
        kwargs['progress_callback'] = progress_callback
        del kwargs['with_progress']

    return func(*args, **kwargs)