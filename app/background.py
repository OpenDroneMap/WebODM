from threading import Thread
from django import db
from webodm import settings


# TODO: design class such that:
# 1. test cases can choose which functions to intercept (prevent from executing)
# 2. test cases can see how many times a function has been called (and with which parameters)
# 3. test cases can pause until a function has been called
class TestWatch:
    stats = {}

    def called(self, func, *args, **kwargs):
        list = TestWatch.stats[func] if func in TestWatch.stats else []
        list.append({'f': func, 'args': args, 'kwargs': kwargs})
        print(list)

    def clear(self):
        TestWatch.stats = {}

testWatch = TestWatch()

def background(func):
    """
    Adds background={True|False} param to any function
    so that we can call update_nodes_info(background=True) from the outside
    """
    def wrapper(*args,**kwargs):
        background = kwargs.get('background', False)
        if 'background' in kwargs: del kwargs['background']

        if background:
            if settings.TESTING:
                # During testing, intercept all background requests and execute them on the same thread
                testWatch.called(func.__name__, *args, **kwargs)

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
            t.daemon = True
            t.start()
            return t
        else:
            return func(*args, **kwargs)
    return wrapper