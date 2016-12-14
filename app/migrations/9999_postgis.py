from django.db import migrations

class Migration(migrations.Migration):
    dependencies = [("app", "0001_initial")]

    operations = [
        migrations.RunSQL("ALTER SYSTEM SET postgis.enable_outdb_rasters TO True;"),
        migrations.RunSQL("ALTER SYSTEM SET postgis.gdal_enabled_drivers TO 'GTiff';")
    ]