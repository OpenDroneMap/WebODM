import os
import shutil
import time

import subprocess

import logging

from unittest import mock
from contextlib import contextmanager

import random

from webodm import settings

logger = logging.getLogger('app.logger')

@contextmanager
def start_processing_node(args = []):
    current_dir = os.path.dirname(os.path.realpath(__file__))
    node_odm = subprocess.Popen(['node', 'index.js', '--port', '11223', '--test'] + args, shell=False,
                                cwd=os.path.join(current_dir, "..", "..", "nodeodm", "external", "NodeODM"))
    time.sleep(3)  # Wait for the server to launch
    yield node_odm
    node_odm.terminate()
    time.sleep(1)  # Wait for the server to stop

# We need to clear previous media_root content
# This points to the test directory, but just in case
# we double check that the directory is indeed a test directory
def clear_test_media_root():
    if "_test" in settings.MEDIA_ROOT:
        if os.path.exists(settings.MEDIA_ROOT):
            logger.info("Cleaning up {}".format(settings.MEDIA_ROOT))
            shutil.rmtree(settings.MEDIA_ROOT)
    else:
        logger.warning("We did not remove MEDIA_ROOT because we couldn't find a _test suffix in its path.")


@contextmanager
def catch_signal(signal):
    """Catch django signal and return the mocked call."""
    handler = mock.Mock()
    signal.connect(handler, dispatch_uid=str(random.random()))
    yield handler
    signal.disconnect(handler)