import os
import logging
#from rio_cogeo.cogeo import cog_validate
import tempfile
import shutil
import rasterio

from rio_cogeo.cogeo import cog_translate
from webodm import settings

# TODO REMOVE
from rasterio.env import GDALVersion

def cog_validate(src_path, strict=False):
    """
    Validate Cloud Optimized Geotiff.
    Parameters
    ----------
    src_path : str or PathLike object
        A dataset path or URL. Will be opened in "r" mode.
    This script is the rasterio equivalent of
    https://svn.osgeo.org/gdal/trunk/gdal/swig/python/samples/validate_cloud_optimized_geotiff.py
    """
    errors = []
    warnings = []
    details = {}

    if not GDALVersion.runtime().at_least("2.2"):
        raise Exception("GDAL 2.2 or above required")

    config = dict(GDAL_DISABLE_READDIR_ON_OPEN="FALSE")
    with rasterio.Env(**config):
        with rasterio.open(src_path) as src:
            if not src.driver == "GTiff":
                raise Exception("The file is not a GeoTIFF")

            filelist = [os.path.basename(f) for f in src.files]
            src_bname = os.path.basename(src_path)
            if len(filelist) > 1 and src_bname + ".ovr" in filelist:
                errors.append(
                    "Overviews found in external .ovr file. They should be internal"
                )

            overviews = src.overviews(1)
            if src.width > 512 or src.height > 512:
                if not src.is_tiled:
                    errors.append(
                        "The file is greater than 512xH or 512xW, but is not tiled"
                    )

                if not overviews:
                    warnings.append(
                        "The file is greater than 512xH or 512xW, it is recommended "
                        "to include internal overviews"
                    )

            ifd_offset = int(src.get_tag_item("IFD_OFFSET", "TIFF", bidx=1))
            ifd_offsets = [ifd_offset]
            if ifd_offset not in (8, 16):
                errors.append(
                    "The offset of the main IFD should be 8 for ClassicTIFF "
                    "or 16 for BigTIFF. It is {} instead".format(ifd_offset)
                )

            details["ifd_offsets"] = {}
            details["ifd_offsets"]["main"] = ifd_offset

            if overviews and overviews != sorted(overviews):
                errors.append("Overviews should be sorted")

            for ix, dec in enumerate(overviews):

                # NOTE: Size check is handled in rasterio `src.overviews` methods
                # https://github.com/mapbox/rasterio/blob/4ebdaa08cdcc65b141ed3fe95cf8bbdd9117bc0b/rasterio/_base.pyx
                # We just need to make sure the decimation level is > 1
                if not dec > 1:
                    errors.append(
                        "Invalid Decimation {} for overview level {}".format(dec, ix)
                    )

                # Check that the IFD of descending overviews are sorted by increasing
                # offsets
                ifd_offset = int(src.get_tag_item("IFD_OFFSET", "TIFF", bidx=1, ovr=ix))
                ifd_offsets.append(ifd_offset)

                details["ifd_offsets"]["overview_{}".format(ix)] = ifd_offset
                if ifd_offsets[-1] < ifd_offsets[-2]:
                    if ix == 0:
                        errors.append(
                            "The offset of the IFD for overview of index {} is {}, "
                            "whereas it should be greater than the one of the main "
                            "image, which is at byte {}".format(
                                ix, ifd_offsets[-1], ifd_offsets[-2]
                            )
                        )
                    else:
                        errors.append(
                            "The offset of the IFD for overview of index {} is {}, "
                            "whereas it should be greater than the one of index {}, "
                            "which is at byte {}".format(
                                ix, ifd_offsets[-1], ix - 1, ifd_offsets[-2]
                            )
                        )

            block_offset = int(src.get_tag_item("BLOCK_OFFSET_0_0", "TIFF", bidx=1))
            if not block_offset:
                errors.append("Missing BLOCK_OFFSET_0_0")

            data_offset = int(block_offset) if block_offset else None
            data_offsets = [data_offset]
            details["data_offsets"] = {}
            details["data_offsets"]["main"] = data_offset

            for ix, dec in enumerate(overviews):
                data_offset = int(
                    src.get_tag_item("BLOCK_OFFSET_0_0", "TIFF", bidx=1, ovr=ix)
                )
                data_offsets.append(data_offset)
                details["data_offsets"]["overview_{}".format(ix)] = data_offset

            if data_offsets[-1] < ifd_offsets[-1]:
                if len(overviews) > 0:
                    errors.append(
                        "The offset of the first block of the smallest overview "
                        "should be after its IFD"
                    )
                else:
                    errors.append(
                        "The offset of the first block of the image should "
                        "be after its IFD"
                    )

            for i in range(len(data_offsets) - 2, 0, -1):
                if data_offsets[i] < data_offsets[i + 1]:
                    errors.append(
                        "The offset of the first block of overview of index {} should "
                        "be after the one of the overview of index {}".format(i - 1, i)
                    )

            if len(data_offsets) >= 2 and data_offsets[0] < data_offsets[1]:
                errors.append(
                    "The offset of the first block of the main resolution image "
                    "should be after the one of the overview of index {}".format(
                        len(overviews) - 1
                    )
                )

        for ix, dec in enumerate(overviews):
            with rasterio.open(src_path, OVERVIEW_LEVEL=ix) as ovr_dst:
                if ovr_dst.width >= 512 or ovr_dst.height >= 512:
                    if not ovr_dst.is_tiled:
                        errors.append("Overview of index {} is not tiled".format(ix))

    if warnings:
        logger.warning("The following warnings were found:")
        for w in warnings:
            logger.warning(w)

    if errors:
        logger.warning("The following errors were found:")
        for e in errors:
            logger.warning("- " + e)

        return False

    if warnings and strict:
        return False

    return True

# TODO: REMOVE

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

    tmpfile = tempfile.mktemp('_cogeo.tif', dir=settings.MEDIA_TMP)
    swapfile = tempfile.mktemp('_cogeo_swap.tif', dir=settings.MEDIA_TMP)

    with rasterio.open(src_path) as dst:
        output_profile = dst.profile
        output_profile.update(dict(blockxsize="256"))
        output_profile.update(dict(blockysize="256"))

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