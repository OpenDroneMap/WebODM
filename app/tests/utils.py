import os
import shutil
import time

import subprocess

import logging

from webodm import settings

logger = logging.getLogger('app.logger')

def start_processing_node(*args):
    current_dir = os.path.dirname(os.path.realpath(__file__))
    node_odm = subprocess.Popen(['node', 'index.js', '--port', '11223', '--test'] + list(args), shell=False,
                                cwd=os.path.join(current_dir, "..", "..", "nodeodm", "external", "node-OpenDroneMap"))
    time.sleep(2)  # Wait for the server to launch
    return node_odm

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