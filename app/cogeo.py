import os
import logging
import tempfile
import shutil
import rasterio
from rio_cogeo.cogeo import cog_validate, cog_translate
from webodm import settings

logger = logging.getLogger('app.logger')

def valid_cogeo(src_path):
    """
    Validate a Cloud Optimized GeoTIFF
    :param src_path: path to GeoTIFF
    :return: true if the GeoTIFF is a cogeo, false otherwise
    """
    return cog_validate(src_path, strict=True)


def assure_cogeo(src_path):
    """
    Guarantee that the .tif passed as an argument is a Cloud Optimized GeoTIFF (cogeo)
    If the path is not a cogeo, it is destructively converted into a cogeo.
    If the file cannot be converted, the function does not change the file
    :param src_path: path to GeoTIFF (cogeo or not)
    :return: None
    """

    if not os.path.isfile(src_path):
        logger.warning("Cannot validate cogeo: %s (file does not exist)" % src_path)
        return

    if valid_cogeo(src_path):
        return

    # Not a cogeo
    logger.info("Optimizing %s as Cloud Optimized GeoTIFF" % src_path)
    tmpfile = tempfile.mktemp('_cogeo.tif', dir=settings.MEDIA_TMP)
    swapfile = tempfile.mktemp('_cogeo_swap.tif', dir=settings.MEDIA_TMP)

    with rasterio.open(src_path) as dst:
        output_profile = dict(
            blockxsize=256,
            blockysize=256,
            driver='GTiff',
            tiled=True,
            compress=dst.profile.get('compress', 'deflate'),
            interleave='pixel'
        )

        # Dataset Open option (see gdalwarp `-oo` option)
        config = dict(
            GDAL_NUM_THREADS="ALL_CPUS",
            GDAL_TIFF_INTERNAL_MASK=True,
            GDAL_TIFF_OVR_BLOCKSIZE="128",
        )

        cog_translate(dst, tmpfile, output_profile,
                      config=config, in_memory=False,
                      quiet=True, web_optimized=True)

    if os.path.isfile(tmpfile):
        shutil.move(src_path, swapfile) # Move to swap location

        try:
            shutil.move(tmpfile, src_path)
        except IOError as e:
            logger.warning("Cannot move %s to %s: %s" % (tmpfile, src_path, str(e)))
            shutil.move(swapfile, src_path) # Attempt to restore
            raise e

        if os.path.isfile(swapfile):
            os.remove(swapfile)