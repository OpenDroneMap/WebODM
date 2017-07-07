from django.contrib.gis.gdal import GDALRaster
from django.contrib.gis.geos import GEOSGeometry
from django.db import InternalError
from django.db import transaction

from .classes import BootTestCase
from app.models import Task, Project
import os

class TestApi(BootTestCase):
    def setUp(self):
        pass

    def tearDown(self):
        pass

    def test_db(self):
        # Make sure we can use PostGIS geometry type
        task = Task.objects.create(project=Project.objects.latest("created_at"),
                                   orthophoto_extent=GEOSGeometry("POINT(1 2)"))
        task.refresh_from_db()
        self.assertTrue(task.orthophoto_extent is not None)
