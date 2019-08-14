# -*- coding: utf-8 -*-
from __future__ import unicode_literals

from django.db import migrations
from nodeodm.models import ProcessingNode

def rename_default_node(apps, schema_editor):
    for default_node in ProcessingNode.objects.filter(hostname='node-odm-1'):
        default_node.hostname = 'webodm_node-odm_1'
        default_node.defaults = {'hostname': 'webodm_node-odm_1', 'port': 3000}
        default_node.save()
    
class Migration(migrations.Migration):

    dependencies = [
        ('app', '0028_task_partial'),
    ]

    operations = [
        migrations.RunPython(rename_default_node),
    ]
