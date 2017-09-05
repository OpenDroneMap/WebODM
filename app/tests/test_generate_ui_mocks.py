"""
This is not a real test file

It generates mock models for use in UI testing (via Jest)
and places them in <root>/build/tests/mocks

It will only run when called explicitly via:
    python manage.py test app.tests.test_generate_ui_mocks
"""
import os
import sys

from .classes import BootTestCase
from app.models import Preset

class TestGenerateUiMocks(BootTestCase):
    def setUp(self):
        # TODO: delete old mocks
        pass

    def tearDown(self):
        pass

    def test_preset_mock(self):
        preset = Preset.objects.first()
        self.assertTrue(True)
        # TODO: save json to destination

# Do not generate mocks during normal testing
GENERATE_MOCKS = len(sys.argv) >= 4 and \
            sys.argv[1:2] == 'test' and\
            sys.argv[2:3] == ['app.tests.' + (os.path.splitext(__file__)[0])]

if not GENERATE_MOCKS:
    del TestGenerateUiMocks