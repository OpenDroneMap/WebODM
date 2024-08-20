# -*- coding: utf-8 -*-
from __future__ import unicode_literals

from app.cogeo import assure_cogeo
from django.db import migrations
import glob
import os
from webodm import settings

def find_and_assure_cogeo(apps, schema_editor):
    for asset_filename in ["odm_orthophoto.tif", "dsm.tif", "dtm.tif"]:
        for asset in glob.glob(os.path.join(settings.MEDIA_ROOT, "project", "**", asset_filename), recursive=True):
            try:
                print("Optimizing %s" % asset)
                assure_cogeo(asset)
            except Exception as e:
                print("WARNING: cannot check/optimize %s (%s), skipping..." % (asset, str(e)))


class Migration(migrations.Migration):

    dependencies = [
        ('app', '0029_auto_20190907_1348'),
    ]

    operations = [
        migrations.RunPython(find_and_assure_cogeo),
    ]
