from threading import Thread

import logging
from django import db
from app.testwatch import testWatch

logger = logging.getLogger('app.logger')

def background(func):
    """
    Adds background={True|False} param to any function
    so that we can call update_nodes_info(background=True) from the outside
    """
    def wrapper(*args,**kwargs):
        background = kwargs.get('background', False)
        if 'background' in kwargs: del kwargs['background']

        if background:
            if testWatch.hook_pre(func, *args, **kwargs): return

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
                    testWatch.hook_post(func, *args, **kwargs)
                return ret

            t = Thread(target=execute_and_close_db)
            t.daemon = True
            t.start()
            return t
        else:
            return func(*args, **kwargs)
    return wrapper