from .rasterize import rasterize_cloud
from .cloud_compare import run_icp

def rasterize(point_cloud_path, dem_type, raster_path):
    rasterize_cloud(point_cloud_path, dem_type, raster_path)

def align(reference_pcl_path, pcl_to_modify_path, output_path):
    run_icp(reference_pcl_path, pcl_to_modify_path, output_path)
