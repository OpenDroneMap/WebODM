def boot():
    from django.contrib.contenttypes.models import ContentType
    from django.contrib.auth.models import Permission
    from django.contrib.auth.models import User, Group
    from django.db.utils import ProgrammingError
    from . import signals
    import logging

    logger = logging.getLogger('app.logger')

    # Check default group
    try:
        default_group, created = Group.objects.get_or_create(name='Default')
        if created:
            logger.info("Created default group")

        # Add default permissions (view_project, change_project, delete_project, etc.)
        for permission in ('_project'):
            default_group.permissions.add(
                    *list(Permission.objects.filter(codename__endswith=permission))
                )
        
        # Check super user
        if User.objects.filter(is_superuser=True).count() == 0:
            User.objects.create_superuser('admin', 'admin@example.com', 'admin')
            logger.info("Created superuser")
    except ProgrammingError:
        logger.warn("Could not create default group/user. If running a migration, this is expected.")
