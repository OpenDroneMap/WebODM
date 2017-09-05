"""
This is not a real test file

It generates mock models for use in UI testing (via Jest)
and places them in <root>/build/tests/mocks

It will only run when called explicitly via:
    python manage.py test app.tests.test_generate_ui_mocks
"""
import os
import sys

from shutil import rmtree

import logging

from django.contrib.auth.models import User
from rest_framework.renderers import JSONRenderer

from app.api.projects import ProjectSerializer
from app.api.tasks import TaskSerializer
from app.models import Project
from app.models import Task
from webodm import settings
from .classes import BootTestCase
from app.models import Preset
from app.api.presets import PresetSerializer


logger = logging.getLogger('app.logger')
BUILD_MOCKS_PATH = os.path.join(settings.BASE_DIR, "build", "mocks")


def write_mock(dst_path, serializer):
    with open(os.path.join(BUILD_MOCKS_PATH, dst_path), "w") as f:
        f.write(JSONRenderer().render(serializer.data).decode("utf-8"))
    logger.info("Written {}".format(dst_path))

class TestGenerateUiMocks(BootTestCase):
    def setUp(self):
        if os.path.exists(BUILD_MOCKS_PATH):
            logger.info("Existing mocks path exists, removing it...")
            rmtree(BUILD_MOCKS_PATH)

        os.mkdir(BUILD_MOCKS_PATH)
        logger.info("Created {}".format(BUILD_MOCKS_PATH))

    def tearDown(self):
        pass

    def test_mocks(self):
        write_mock("preset.json", PresetSerializer(Preset.objects.first()))

        project = Project.objects.create(
            owner=User.objects.get(username="testsuperuser"),
            name="mock project"
        )

        write_mock("project.json", ProjectSerializer(project))
        write_mock("task.json", TaskSerializer(Task.objects.create(name="mock task", project=project)))

# Do not generate mocks during normal testing
GENERATE_MOCKS = len(sys.argv) >= 3 and \
            sys.argv[1:2] == ['test'] and\
            sys.argv[2:3] == ['app.tests.' + (os.path.splitext(os.path.basename(__file__))[0])]

if not GENERATE_MOCKS:
    del TestGenerateUiMocks