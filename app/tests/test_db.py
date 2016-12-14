from django.contrib.gis.gdal import GDALRaster
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
        # Make sure we can use PostGIS raster type
        raster = GDALRaster(os.path.realpath(os.path.join("app", "fixtures", "orthophoto.tif")), write=True)

        self.assertTrue(raster.srid == 32615)
        with transaction.atomic():
            # We cannot store offdb references with SRID different than the one declared (4326)
            self.assertRaises(InternalError, Task.objects.create, project=Project.objects.latest("created_at"),
                                       orthophoto=raster)

        # All OK when we transform to 4326
        task = Task.objects.create(project=Project.objects.latest("created_at"),
                                   orthophoto=raster.transform(4326))
        task.refresh_from_db()
        self.assertTrue(task.orthophoto.srid == 4326)
        self.assertTrue(task.orthophoto.width == 252) # not original size, warp happened
