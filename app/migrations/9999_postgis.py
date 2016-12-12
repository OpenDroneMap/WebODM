from django.db import migrations

class Migration(migrations.Migration):
    dependencies = [("app", "0001_initial")]

    operations = [
        migrations.RunSQL("SET postgis.enable_outdb_rasters TO True;"),
        migrations.RunSQL("SET postgis.gdal_enabled_drivers TO 'GTiff';")
    ]