def boot():
    from django.contrib.contenttypes.models import ContentType
    from django.contrib.auth.models import Permission
    from django.contrib.auth.models import User, Group
    from . import signals
    import logging

    logger = logging.getLogger('app.logger')

    # Check default group
    default_group, created = Group.objects.get_or_create(name='Default')
    if created:
        logger.info("Created default group")

    # Add default permissions (view_project, change_project, delete_task, etc.)
    for permission in ('_project', '_task'):
        default_group.permissions.add(
                *list(Permission.objects.filter(codename__endswith=permission))
            )
    
    # Check super user
    if User.objects.count() == 0:
        User.objects.create_superuser('admin', 'admin@example.com', 'admin')
        logger.info("Created superuser")
