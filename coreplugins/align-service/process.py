import requests
import logging
import piexif

from osgeo import ogr, osr
from PIL import Image
from .plugin import config


point_ref = osr.SpatialReference()
point_ref.ImportFromEPSG(4326)

out_ref = osr.SpatialReference()
out_ref.ImportFromEPSG(32718)

logger = logging.getLogger('app.logger')

def get_decimal_from_dms(dms, ref):
    degrees = dms[0][0] / dms[0][1]
    minutes = dms[1][0] / dms[1][1]
    seconds = dms[2][0] / dms[2][1]
    decimal = degrees + minutes / 60 + seconds / 3600
    if ref in [b'S', b'W']:
        decimal = -decimal
    return decimal


def generate_align_tif(coords, task):
    config_data = config()
    ring = ogr.Geometry(ogr.wkbLinearRing)
    ring.AssignSpatialReference(point_ref)

    for point in coords:
        ring.AddPoint(point[1], point[0])

    ring.CloseRings()
    polygon = ogr.Geometry(ogr.wkbPolygon)
    polygon.AssignSpatialReference(point_ref)
    polygon.AddGeometry(ring)

    buffer_size = config_data.get("buffer_size")
    if buffer_size > 0:
        meter_ref = osr.SpatialReference()
        meter_ref.ImportFromEPSG(32718)

        polygon.TransformTo(meter_ref)
        polygon = polygon.Buffer(buffer_size)
        # polygon.TransformTo(out_ref)

    min_long, max_long, min_lat, max_lat = polygon.GetEnvelope()

    subset_e = "E({0}, {1})".format(min_long, max_long)
    subset_n = "N({0}, {1})".format(min_lat, max_lat)

    url_server = config_data.get("service_url")
    coverage_id = config_data.get("coverage_id")
    token = config_data.get("token")
    service_type = "WCS"
    request_type = "GetCoverage"
    version_number = "2.0.0"
    format_type = "geotiff"

    url_geoserver = (f"{url_server}service={service_type}&request={request_type}&version={version_number}"
                     f"&coverageId={coverage_id}&format={format_type}&subset={subset_e}&subset={subset_n}" 
                     f"&authkey={token}")
    result = requests.get(url_geoserver)

    # save align file
    align_file = task.task_path() + "align.tif"
    if result.status_code == 200:
        with open(align_file, 'wb') as f:
            f.write(result.content)
    else:
        logger.error(f"Error requesting align file: {result.status_code}")


def get_coords_from_images(images, task):
    coords = []
    for image in images:
        if image.endswith(".tif"):
            pass
        else:
            img = Image.open(task.get_image_path(image))
            try:
                exif_dict = piexif.load(img.info['exif'])
                gps_data = exif_dict.get('GPS', {})

                if gps_data:
                    latitude = get_decimal_from_dms(gps_data.get(piexif.GPSIFD.GPSLatitude),
                                                    gps_data.get(piexif.GPSIFD.GPSLatitudeRef))

                    longitude = get_decimal_from_dms(gps_data.get(piexif.GPSIFD.GPSLongitude),
                                                     gps_data.get(piexif.GPSIFD.GPSLongitudeRef))
                    coords.append([longitude, latitude])
            except Exception as e:
                logger.error(f"Error getting GPS data from image {image}: {e}")
    return coords
