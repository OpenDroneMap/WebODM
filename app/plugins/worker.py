import inspect
from worker.celery import app
# noinspection PyUnresolvedReferences
from worker.tasks import execute_grass_script

task = app.task

def run_function_async(func, *args, **kwargs):
    """
    Run a function asynchronously using Celery.
    Plugins should use this function so that they don't
    have to register new Celery tasks at startup. Functions
    should import any required library at the top of the function body.
    :param {Function} a function to execute
    """
    source = inspect.getsource(func)
    return eval_async.delay(source, func.__name__, *args, **kwargs)


@app.task
def eval_async(source, funcname, *args, **kwargs):
    """
    Run Python code asynchronously using Celery.
    It's recommended to use run_function_async instead.
    """
    ns = {}
    code = compile(source, 'file', 'exec')
    eval(code, ns, ns)
    return ns[funcname](*args, **kwargs)