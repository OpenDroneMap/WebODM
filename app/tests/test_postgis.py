from django.contrib.gis.gdal import GDALRaster

from .classes import BootTestCase
from app.postgis import from_pgraster, to_pgraster
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

        # Classic
        hexwkb = to_pgraster(raster)
        deserialized_raster = GDALRaster(from_pgraster(hexwkb))
        self.assertTrue(len(deserialized_raster.bands) == 4)
        self.assertTrue(deserialized_raster.srid == raster.srid)
        self.assertTrue(deserialized_raster.width == raster.width)
        self.assertTrue(deserialized_raster.height == raster.height)

        # Off-db
        hexwkb = to_pgraster(raster, True)
        deserialized_raster = GDALRaster(from_pgraster(hexwkb, True))

        self.assertTrue(deserialized_raster.name == raster.name)
        self.assertTrue(deserialized_raster.srid == raster.srid)
        self.assertTrue(deserialized_raster.width == raster.width)
        self.assertTrue(deserialized_raster.height == raster.height)

