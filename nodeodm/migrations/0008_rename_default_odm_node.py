# -*- coding: utf-8 -*-
from __future__ import unicode_literals

from django.db import migrations
from nodeodm.models import ProcessingNode

def rename_default_node(apps, schema_editor):
    for default_node in ProcessingNode.objects.filter(hostname='node-odm-1'):
        default_node.hostname = 'webodm_node-odm_1'
        default_node.label = 'node-odm-1'
        default_node.save()
    
class Migration(migrations.Migration):

    dependencies = [
        ('nodeodm', '0007_auto_20190520_1258'),
    ]

    operations = [
        migrations.RunPython(rename_default_node),
    ]
