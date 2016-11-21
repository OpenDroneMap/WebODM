from django.core.exceptions import ObjectDoesNotExist
from rest_framework import exceptions

from app import models

def get_and_check_project(request, project_pk, perms=('view_project',)):
    """
    Django comes with a standard `model level` permission system. You can
    check whether users are logged-in and have privileges to act on things
    model wise (can a user add a project? can a user view projects?).
    Django-guardian adds a `row level` permission system. Now not only can you
    decide whether a user can add a project or view projects, you can specify exactly
    which projects a user has or has not access to.

    This brings up the reason the following function: tasks are part of a project,
    and it would add a tremendous headache (and redundancy) to specify row level permissions
    for each task. Instead, we check the row level permissions of the project
    to which a task belongs to.

    Perhaps this could be added as a django-rest filter?

    Retrieves a project and raises an exception if the current user
    has no access to it.
    """
    try:
        project = models.Project.objects.get(pk=project_pk, deleting=False)
        for perm in perms:
            if not request.user.has_perm(perm, project): raise ObjectDoesNotExist()
    except ObjectDoesNotExist:
        raise exceptions.NotFound()
    return project


def get_tile_json(name, tiles, bounds):
    return {
        'tilejson': '2.1.0',
        'name': name,
        'version': '1.0.0',
        'scheme': 'tms',
        'tiles': tiles,
        'minzoom': 0,
        'maxzoom': 22,
        'bounds': bounds
    }