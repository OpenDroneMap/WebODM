# -*- coding: utf-8 -*-
from __future__ import unicode_literals

from django.db import migrations
from nodeodm.models import ProcessingNode
from django.db.models import Q

def rename_default_node(apps, schema_editor):
    for default_node in ProcessingNode.objects.filter(Q(hostname='node-odm-1') | Q(label='node-odm-1')):
        default_node.hostname = 'node-odx-1'
        default_node.label = 'node-odx-1'
        default_node.save()
    
class Migration(migrations.Migration):

    dependencies = [
        ('nodeodm', '0009_auto_20210610_1850'),
    ]

    operations = [
        migrations.RunPython(rename_default_node),
    ]