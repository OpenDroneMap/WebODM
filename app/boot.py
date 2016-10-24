def boot():
    from django.contrib.contenttypes.models import ContentType
    from django.contrib.auth.models import Permission
    from django.contrib.auth.models import User, Group
    from django.db.utils import ProgrammingError
    from . import signals, scheduler
    import logging, os

    logger = logging.getLogger('app.logger')

    # Check default group
    try:
        default_group, created = Group.objects.get_or_create(name='Default')
        if created:
            logger.info("Created default group")

        # Add default permissions (view_project, change_project, delete_project, etc.)
        for permission in ('_project', '_task'):
            default_group.permissions.add(
                    *list(Permission.objects.filter(codename__endswith=permission))
                )
        
        # Check super user
        if User.objects.filter(is_superuser=True).count() == 0:
            User.objects.create_superuser('admin', 'admin@example.com', 'admin')
            logger.info("Created superuser")
    except ProgrammingError:
        logger.warn("Could not create default group/user. If running a migration, this is expected.")

    # Run only on the main runserver process 
    # (do not start again on the auto-reloader process)
    if os.environ.get('RUN_MAIN') != 'true':
        # Setup and start scheduler
        scheduler.setup()