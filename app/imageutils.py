from PIL import Image
from PIL.ExifTags import Base as ExifBase, GPS as GPSTags
import shutil
import subprocess

def is_panorama(filepath):
    try:
        exiftool = shutil.which('exiftool')
        if exiftool:
            result = subprocess.run(
                [exiftool, '-ProjectionType', '-s3', filepath],
                capture_output=True, text=True, timeout=10
            )
            proj = result.stdout.strip().lower()
            if proj in ('equirectangular', 'cylindrical'):
                return True
    except Exception:
        pass
    try:
        with Image.open(filepath) as im:
            w, h = im.size
            if h > 0 and w / h >= 2.0:
                return True
    except Exception:
        pass
    return False

def extract_gps_from_image(filepath):
    try:
        with Image.open(filepath) as im:
            exif = im._getexif()
            if exif is None:
                return None
            gps_info = exif.get(ExifBase.GPSInfo)
            if gps_info is None:
                return None

            def to_decimal(values, ref):
                d = float(values[0])
                m = float(values[1])
                s = float(values[2])
                dec = d + m / 60.0 + s / 3600.0
                if ref in ('S', 'W'):
                    dec = -dec
                return dec

            lat = to_decimal(
                gps_info.get(GPSTags.GPSLatitude, (0, 0, 0)),
                gps_info.get(GPSTags.GPSLatitudeRef, 'N')
            )
            lon = to_decimal(
                gps_info.get(GPSTags.GPSLongitude, (0, 0, 0)),
                gps_info.get(GPSTags.GPSLongitudeRef, 'E')
            )

            alt = None
            if GPSTags.GPSAltitude in gps_info:
                alt = float(gps_info[GPSTags.GPSAltitude])
                if gps_info.get(GPSTags.GPSAltitudeRef, 0) == 1:
                    alt = -alt

            if lat == 0.0 and lon == 0.0:
                return None

            result = [lon, lat]
            if alt is not None:
                result.append(alt)
            return result
    except Exception:
        return None
