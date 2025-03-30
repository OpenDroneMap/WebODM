import json

from django.contrib.gis.gdal import GDALException
from django.contrib.gis.geos import GEOSException, GEOSGeometry
from django.core.exceptions import ValidationError
from rest_framework.fields import Field

class PolygonGeometryField(Field):
    """
    Handle GeoDjango Polygon Geometry fields
    """

    type_name = 'PolygonGeometryField'

    def to_representation(self, value):
        if isinstance(value, dict) or value is None:
            return value

        if value.geojson:
            try:
                geojson = json.loads(value.geojson)
            except ValueError:
                geojson = {'type': 'Polygon', 'coordinates': []}
        else:
            geojson = {'type': 'Polygon', 'coordinates': []}
        
        return geojson

    def to_internal_value(self, value):
        if value == '' or value is None:
            return value
        
        if isinstance(value, GEOSGeometry):
            return value
        if isinstance(value, dict):
            if value.get('geometry'):
                value = value['geometry']
            value = json.dumps(value)
        
        try:
            return GEOSGeometry(value)
        except GEOSException:
            raise ValidationError('Invalid format: not GeoJSON')
        except (ValueError, TypeError, GDALException) as e:
            raise ValidationError('Unable to create GEOSGeometry')

