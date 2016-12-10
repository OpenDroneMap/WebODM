from django.contrib.gis.gdal import GDALRaster

from .classes import BootTestCase
from app.fields import from_pgraster, to_pgraster
import os

class TestApi(BootTestCase):
    def setUp(self):
        pass

    def tearDown(self):
        pass

    def test_pgraster_functions(self):
        # Make sure conversion from PostGIS <---> GDALRaster works
        # for out-of-db
        raster = GDALRaster(os.path.join("app", "fixtures", "orthophoto.tif"))

        self.assertTrue(raster.srid == 32615)
        self.assertTrue(raster.width == 212)

        #hexwkb =