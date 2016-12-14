import binascii
import struct

from django.contrib.gis.db.backends.postgis.const import GDAL_TO_POSTGIS
from django.contrib.gis.db.backends.postgis.pgraster import (
    GDAL_TO_STRUCT, POSTGIS_HEADER_STRUCTURE, POSTGIS_TO_GDAL,
    STRUCT_SIZE,
    pack)
from django.contrib.gis.db.backends.postgis.pgraster import chunk, unpack
from django.contrib.gis.db.models.fields import RasterField, BaseSpatialField
from django.contrib.gis.gdal import GDALException
from django.contrib.gis.gdal import GDALRaster
from django.forms import ValidationError
from django.utils.translation import ugettext_lazy as _


class OffDbRasterField(RasterField):
    """
    Out-of-db Raster field for GeoDjango -- evaluates into GDALRaster objects.
    """

    description = _("Out-of-db Raster Field")

    def from_db_value(self, value, expression, connection, context):
        return from_pgraster(value, True)

    def get_db_prep_save(self, value, connection):
        """
        Prepare the value for saving in the database.
        """
        if not value:
            return None
        else:
            return to_pgraster(value, True)

    def get_db_prep_value(self, value, connection, prepared=False):
        self._check_connection(connection)
        # Prepare raster for writing to database.
        if not prepared:
            value = to_pgraster(value, True)

        # Call RasterField's base class get_db_prep_value
        return BaseSpatialField.get_db_prep_value(self, value, connection, prepared)

    def get_raster_prep_value(self, value, is_candidate):
        """
        Return a GDALRaster if conversion is successful, otherwise return None.
        """
        if isinstance(value, GDALRaster):
            return value
        elif is_candidate:
            try:
                return GDALRaster(value)
            except GDALException:
                pass
        elif isinstance(value, (dict, str)):
            try:
                return GDALRaster(value)
            except GDALException:
                raise ValueError("Couldn't create spatial object from lookup value '%s'." % value)


class POSTGIS_BANDTYPES(object):
    BANDTYPE_FLAG_OFFDB = 1 << 7
    BANDTYPE_FLAG_HASNODATA = 1 << 6
    BANDTYPE_FLAG_ISNODATA = 1 << 5


def from_pgraster(data, offdb = False):
    """
    Convert a PostGIS HEX String into a dictionary.
    """
    if data is None:
        return

    # Split raster header from data
    header, data = chunk(data, 122)
    header = unpack(POSTGIS_HEADER_STRUCTURE, header)

    # Parse band data
    bands = []
    pixeltypes = []

    while data:
        # Get pixel type for this band
        pixeltype, data = chunk(data, 2)
        pixeltype = unpack('B', pixeltype)[0]

        # Check flags
        offdb = has_nodata = False

        if POSTGIS_BANDTYPES.BANDTYPE_FLAG_OFFDB & pixeltype == POSTGIS_BANDTYPES.BANDTYPE_FLAG_OFFDB:
            offdb = True
            pixeltype ^= POSTGIS_BANDTYPES.BANDTYPE_FLAG_OFFDB
        if POSTGIS_BANDTYPES.BANDTYPE_FLAG_HASNODATA & pixeltype == POSTGIS_BANDTYPES.BANDTYPE_FLAG_HASNODATA:
            has_nodata = True
            pixeltype ^= POSTGIS_BANDTYPES.BANDTYPE_FLAG_HASNODATA
        if POSTGIS_BANDTYPES.BANDTYPE_FLAG_ISNODATA & pixeltype == POSTGIS_BANDTYPES.BANDTYPE_FLAG_ISNODATA:
            raise ValidationError("Band has pixeltype BANDTYPE_FLAG_ISNODATA flag set, but we don't know how to handle it.")

        # Convert datatype from PostGIS to GDAL & get pack type and size
        pixeltype = POSTGIS_TO_GDAL[pixeltype]
        pack_type = GDAL_TO_STRUCT[pixeltype]
        pack_size = 2 * STRUCT_SIZE[pack_type]

        # Parse band nodata value. The nodata value is part of the
        # PGRaster string even if the nodata flag is True, so it always
        # has to be chunked off the data string.
        nodata, data = chunk(data, pack_size)
        nodata = unpack(pack_type, nodata)[0]

        if offdb:
            # Extract band number
            band_num, data = chunk(data, 2)

            # Find NULL byte for end of file path
            file_path_length = (binascii.unhexlify(data).find(b'\x00') + 1) * 2

            # Extract path
            file_path, data = chunk(data, file_path_length)
            band_result = {'path' : binascii.unhexlify(file_path).decode()[:-1]} # Remove last NULL byte
        else:
            # Chunk and unpack band data (pack size times nr of pixels)
            band, data = chunk(data, pack_size * header[10] * header[11])
            band_result = {'data': binascii.unhexlify(band)}

        # If the nodata flag is True, set the nodata value.
        if has_nodata:
            band_result['nodata_value'] = nodata
        if offdb:
            band_result['offdb'] = True

        # Append band data to band list
        bands.append(band_result)

        # Store pixeltype of this band in pixeltypes array
        pixeltypes.append(pixeltype)

    # Check that all bands have the same pixeltype.
    # This is required by GDAL. PostGIS rasters could have different pixeltypes
    # for bands of the same raster.
    if len(set(pixeltypes)) != 1:
        raise ValidationError("Band pixeltypes are not all equal.")

    if offdb and len(bands) > 0:
        return bands[0]['path']
    else:
        return {
            'srid': int(header[9]),
            'width': header[10], 'height': header[11],
            'datatype': pixeltypes[0],
            'origin': (header[5], header[6]),
            'scale': (header[3], header[4]),
            'skew': (header[7], header[8]),
            'bands': bands,
        }


def to_pgraster(rast, offdb = False):
    """
    Convert a GDALRaster into PostGIS Raster format.
    """
    # Return if the raster is null
    if rast is None or rast == '':
        return

    # Prepare the raster header data as a tuple. The first two numbers are
    # the endianness and the PostGIS Raster Version, both are fixed by
    # PostGIS at the moment.
    rasterheader = (
        1, 0, len(rast.bands), rast.scale.x, rast.scale.y,
        rast.origin.x, rast.origin.y, rast.skew.x, rast.skew.y,
        rast.srs.srid, rast.width, rast.height,
    )

    # Hexlify raster header
    result = pack(POSTGIS_HEADER_STRUCTURE, rasterheader)
    i = 0

    for band in rast.bands:
        # The PostGIS raster band header has exactly two elements, a 8BUI byte
        # and the nodata value.
        #
        # The 8BUI stores both the PostGIS pixel data type and a nodata flag.
        # It is composed as the datatype integer plus optional flags for existing
        # nodata values, offdb or isnodata:
        # 8BUI_VALUE = PG_PIXEL_TYPE (0-11) + FLAGS
        #
        # For example, if the byte value is 71, then the datatype is
        # 71-64 = 7 (32BSI) and the nodata value is True.
        structure = 'B' + GDAL_TO_STRUCT[band.datatype()]

        # Get band pixel type in PostGIS notation
        pixeltype = GDAL_TO_POSTGIS[band.datatype()]

        # Set the nodata flag
        if band.nodata_value is not None:
            pixeltype |= POSTGIS_BANDTYPES.BANDTYPE_FLAG_HASNODATA
        if offdb:
            pixeltype |= POSTGIS_BANDTYPES.BANDTYPE_FLAG_OFFDB

        # Pack band header
        bandheader = pack(structure, (pixeltype, band.nodata_value or 0))

        # Hexlify band data
        if offdb:
            # Band num | Path | NULL terminator
            band_data_hex = binascii.hexlify(struct.Struct('b').pack(i) + rast.name.encode('utf-8') + b'\x00').upper()
        else:
            band_data_hex = binascii.hexlify(band.data(as_memoryview=True)).upper()

        # Add packed header and band data to result
        result += bandheader + band_data_hex

        i += 1

    # Cast raster to string before passing it to the DB
    return result.decode()