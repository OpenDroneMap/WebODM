import time

import logging
from webodm import settings

logger = logging.getLogger('app.logger')

class TestWatch:
    def __init__(self):
        self.clear()

    def func_to_name(f):
        return "{}.{}".format(f.__module__, f.__name__)

    def clear(self):
        self._calls = {}
        self._intercept_list = {}

    def intercept(self, fname, f = None):
        self._intercept_list[fname] = f if f is not None else True

    def intercept_list_has(self, fname):
        return fname in self._intercept_list

    def execute_intercept_function_replacement(self, fname, *args, **kwargs):
        if self.intercept_list_has(fname) and callable(self._intercept_list[fname]):
            (self._intercept_list[fname])(*args, **kwargs)

    def get_calls(self, fname):
        return self._calls[fname] if fname in self._calls else []

    def set_calls(self, fname, value):
        self._calls[fname] = value

    def should_prevent_execution(self, func):
        return self.intercept_list_has(TestWatch.func_to_name(func))

    def get_calls_count(self, fname):
        return len(self.get_calls(fname))

    def wait_until_call(self, fname, count = 1, timeout = 30):
        SLEEP_INTERVAL = 0.125
        TIMEOUT_LIMIT = timeout / SLEEP_INTERVAL
        c = 0
        while self.get_calls_count(fname) < count and c < TIMEOUT_LIMIT:
            time.sleep(SLEEP_INTERVAL)
            c += 1

        if c >= TIMEOUT_LIMIT:
            raise TimeoutError("wait_until_call has timed out waiting for {}".format(fname))

        return self.get_calls(fname)

    def log_call(self, func, *args, **kwargs):
        fname = TestWatch.func_to_name(func)
        self.manual_log_call(fname, *args, **kwargs)

    def manual_log_call(self, fname, *args, **kwargs):
        if settings.TESTING:
            list = self.get_calls(fname)
            list.append({'f': fname, 'args': args, 'kwargs': kwargs})
            self.set_calls(fname, list)

    def hook_pre(self, func, *args, **kwargs):
        if settings.TESTING and self.should_prevent_execution(func):
            fname = TestWatch.func_to_name(func)
            logger.info(fname + " intercepted")
            self.execute_intercept_function_replacement(fname, *args, **kwargs)
            self.log_call(func, *args, **kwargs)
            return True # Intercept
        return False # Do not intercept

    def hook_post(self, func, *args, **kwargs):
        if settings.TESTING:
            self.log_call(func, *args, **kwargs)

    def watch(**kwargs):
        """
        Decorator that adds pre/post hook calls
        """
        tw = kwargs.get('testWatch', testWatch)
        def outer(func):
            def wrapper(*args, **kwargs):
                if tw.hook_pre(func, *args, **kwargs): return
                ret = func(*args, **kwargs)
                tw.hook_post(func, *args, **kwargs)
                return ret
            return wrapper
        return outer

testWatch = TestWatch()
