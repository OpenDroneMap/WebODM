from django.contrib.gis.gdal import GDALRaster

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
        task = Task.objects.create(project=Project.objects.latest("created_at"),
                                   orthophoto=GDALRaster(os.path.join("app", "fixtures", "orthophoto.tif"), write=True))
        task.refresh_from_db()
        self.assertTrue(task.orthophoto.srid == 4326)
        self.assertTrue(task.orthophoto.width == 252) # not original size, warp happened
