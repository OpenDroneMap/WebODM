from django.contrib.gis.gdal import GDALRaster

from .classes import BootTestCase
import os

class TestApi(BootTestCase):
    def setUp(self):
        pass

    def tearDown(self):
        pass

    def test_gdal_functions(self):
        raster = GDALRaster(os.path.join("app", "fixtures", "orthophoto.tif"))

        self.assertTrue(raster.srid == 32615)
        self.assertTrue(raster.width == 212)



