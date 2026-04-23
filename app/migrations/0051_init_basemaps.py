from django.db import migrations


def initialize_basemaps(apps, schema_editor):
    Basemap = apps.get_model('app', 'Basemap')

    if Basemap.objects.exists():
        return

    for bm in [{
            'default': True,
            'type': 'tms',
            'url': '//{s}.google.com/vt/lyrs=s,h&x={x}&y={y}&z={z}',
            'attribution': 'Map data: &copy; Google Maps',
            'label': 'Google Maps Hybrid',
            'maxZoom': 21,
            'minZoom': 0,
            'subdomains': 'mt0,mt1,mt2,mt3',
        },
        {
            'type': 'tms',
            'url': '//server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}',
            'attribution': 'Tiles &copy; Esri &mdash; Source: Esri, i-cubed, USDA, USGS, AEX, GeoEye, Getmapping, Aerogrid, IGN, IGP, UPR-EGP, and the GIS User Community',
            'label': 'ESRI Satellite',
            'maxZoom': 21,
            'minZoom': 0,
        },
        {
            'type': 'tms',
            'url': '//tile.openstreetmap.org/{z}/{x}/{y}.png',
            'attribution': '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
            'label': 'OpenStreetMap',
            'maxZoom': 19,
            'minZoom': 0,
        }]:
        Basemap.objects.create(**bm)


class Migration(migrations.Migration):

    dependencies = [
        ('app', '0050_basemap'),
    ]

    operations = [
        migrations.RunPython(initialize_basemaps, migrations.RunPython.noop),
    ]
