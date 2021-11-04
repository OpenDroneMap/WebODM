import logging
import os
import subprocess
from app.security import double_quote

logger = logging.getLogger('app.logger')

def export_pointcloud(input, output, **opts):
    epsg = opts.get('epsg')
    export_format = opts.get('format')

    reprojection_args = []
    extra_args = []

    if epsg:
        reprojection_args = ["reprojection",
                            "--filters.reprojection.out_srs=%s" % double_quote("EPSG:" + str(epsg))]
    
    if export_format == "ply":
        extra_args = ['--writers.ply.sized_types', 'false',
                      '--writers.ply.storage_mode', 'little endian']

    subprocess.check_output(["pdal", "translate", input, output] + reprojection_args + extra_args)
