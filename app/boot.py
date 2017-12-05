import os

from django.contrib.auth.models import Permission
from django.contrib.auth.models import User, Group
from django.core.exceptions import ObjectDoesNotExist
from django.core.files import File
from django.db.utils import ProgrammingError
from guardian.shortcuts import assign_perm

from app.models import Preset
from app.models import Theme
from nodeodm.models import ProcessingNode
# noinspection PyUnresolvedReferences
from webodm.settings import MEDIA_ROOT
from . import scheduler, signals
import logging
from .models import Task, Setting
from webodm import settings
from webodm.wsgi import booted


def boot():
    # booted is a shared memory variable to keep track of boot status
    # as multiple workers could trigger the boot sequence twice
    if not settings.DEBUG and booted.value: return

    booted.value = True
    logger = logging.getLogger('app.logger')

    if settings.DEBUG:
       logger.warning("Debug mode is ON (for development this is OK)")

    # Check default group
    try:
        default_group, created = Group.objects.get_or_create(name='Default')
        if created:
            logger.info("Created default group")

            # Assign viewprocessing node object permission to default processing node (if present)
            # Otherwise non-root users will not be able to process
            try:
                pnode = ProcessingNode.objects.get(hostname="node-odm-1")
                assign_perm('view_processingnode', default_group, pnode)
                logger.info("Added view_processingnode permissions to default group")
            except ObjectDoesNotExist:
                pass


        # Add default permissions (view_project, change_project, delete_project, etc.)
        for permission in ('_project', '_task', '_preset'):
            default_group.permissions.add(
                *list(Permission.objects.filter(codename__endswith=permission))
            )

        # Add permission to view processing nodes
        default_group.permissions.add(Permission.objects.get(codename="view_processingnode"))

        # Add default presets
        Preset.objects.get_or_create(name='DSM + DTM', system=True,
                                     options=[{'name': 'dsm', 'value': True}, {'name': 'dtm', 'value': True}])
        Preset.objects.get_or_create(name='High Quality', system=True,
                                                  options=[{'name': 'dsm', 'value': True},
                                                           {'name': 'skip-resize', 'value': True},
                                                           {'name': 'mesh-octree-depth', 'value': "12"},
                                                           {'name': 'use-25dmesh', 'value': True},
                                                           {'name': 'min-num-features', 'value': 8000},
                                                           {'name': 'dem-resolution', 'value': "0.04"},
                                                           {'name': 'orthophoto-resolution', 'value': "60"},
                                                        ])
        Preset.objects.get_or_create(name='Default', system=True, options=[{'name': 'dsm', 'value': True}])

        # Add settings
        default_theme, created = Theme.objects.get_or_create(name='Default')
        if created:
            logger.info("Created default theme")

        if Setting.objects.all().count() == 0:
            default_logo = os.path.join('app', 'static', 'app', 'img', 'logo512.png')

            s = Setting.objects.create(
                    app_name='WebODM',
                    theme=default_theme)
            s.app_logo.save(os.path.basename(default_logo), File(open(default_logo, 'rb')))

            logger.info("Created settings")

        # Unlock any Task that might have been locked
        Task.objects.filter(processing_lock=True).update(processing_lock=False)

        if not settings.TESTING:
            # Setup and start scheduler
            scheduler.setup()

            scheduler.update_nodes_info(background=True)

    except ProgrammingError:
        logger.warning("Could not touch the database. If running a migration, this is expected.")