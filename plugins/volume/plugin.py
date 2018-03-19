from app.plugins import MountPoint
from app.plugins import PluginBase
from .api import TaskVolume

class Plugin(PluginBase):
    def api_mount_points(self):
        return [
            MountPoint('task/(?P<pk>[^/.]+)/calculate$', TaskVolume.as_view())
        ]


    # def get_volume(self, geojson):
    #     try:
    #         raster_path= self.assets_path("odm_dem", "dsm.tif")
    #         raster=gdal.Open(raster_path)
    #         gt=raster.GetGeoTransform()
    #         rb=raster.GetRasterBand(1)
    #         gdal.UseExceptions()
    #         geosom = reprojson(geojson, raster)
    #         coords=[(entry[0],entry[1]) for entry in rings(raster_path, geosom)]
    #         GSD=gt[1]
    #         volume=0
    #         print(rings(raster_path, geosom))
    #         print(GSD)
    #         med=statistics.median(entry[2] for entry in rings(raster_path, geosom))
    #         clip=clip_raster(raster_path, geosom, gt=None, nodata=-9999)
    #         return ((clip-med)*GSD*GSD)[clip!=-9999.0].sum()
    #
    #     except FileNotFoundError as e:
    #         logger.warning(e)