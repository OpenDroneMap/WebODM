import os

import kombu
from django.contrib.auth.models import Permission
from django.contrib.auth.models import User, Group
from django.core.exceptions import ObjectDoesNotExist, MultipleObjectsReturned
from django.core.files import File
from django.db.utils import ProgrammingError
from guardian.shortcuts import assign_perm

from worker import tasks as worker_tasks
from app.models import Preset
from app.models import Theme
from app.plugins import register_plugins
from nodeodm.models import ProcessingNode
# noinspection PyUnresolvedReferences
from webodm.settings import MEDIA_ROOT
from . import signals
import logging
from .models import Task, Setting
from webodm import settings
from webodm.wsgi import booted


def boot():
    # booted is a shared memory variable to keep track of boot status
    # as multiple gunicorn workers could trigger the boot sequence twice
    if not settings.DEBUG and booted.value: return

    booted.value = True
    logger = logging.getLogger('app.logger')

    logger.info("Booting WebODM {}".format(settings.VERSION))

    if settings.DEBUG:
       logger.warning("Debug mode is ON (for development this is OK)")

    # Make sure our app/media/tmp folder exists
    if not os.path.exists(settings.MEDIA_TMP):
        os.mkdir(settings.MEDIA_TMP)

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

        add_default_presets()

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

        register_plugins()

        if not settings.TESTING:
            try:
                worker_tasks.update_nodes_info.delay()
            except kombu.exceptions.OperationalError as e:
                logger.error("Cannot connect to celery broker at {}. Make sure that your redis-server is running at that address: {}".format(settings.CELERY_BROKER_URL, str(e)))


    except ProgrammingError:
        logger.warning("Could not touch the database. If running a migration, this is expected.")


def add_default_presets():
    try:
        Preset.objects.update_or_create(name='DSM + DTM', system=True,
                                        defaults={
                                            'options': [{'name': 'dsm', 'value': True}, {'name': 'dtm', 'value': True},
                                                        {'name': 'mesh-octree-depth', 'value': 6}]})
        Preset.objects.update_or_create(name='Fast Orthophoto', system=True,
                                        defaults={'options': [{'name': 'fast-orthophoto', 'value': True}]})
        Preset.objects.update_or_create(name='High Quality', system=True,
                                        defaults={'options': [{'name': 'dsm', 'value': True},
                                                              {'name': 'mesh-octree-depth', 'value': "12"},
                                                              {'name': 'dem-resolution', 'value': "0.04"},
                                                              {'name': 'orthophoto-resolution', 'value': "40"},
                                                              ]})
        Preset.objects.update_or_create(name='Default', system=True,
                                        defaults={'options': [{'name': 'dsm', 'value': True},
                                                              {'name': 'mesh-octree-depth', 'value': 6}]})
    except MultipleObjectsReturned:
        # Mostly to handle a legacy code problem where
        # multiple system presets with the same name were
        # created if we changed the options
        Preset.objects.filter(system=True).delete()
        add_default_presets()
