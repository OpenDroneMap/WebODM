from django.core.exceptions import ObjectDoesNotExist, SuspiciousFileOperation
from rest_framework import exceptions
import os

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


def path_traversal_check(unsafe_path, known_safe_path):
    known_safe_path = os.path.abspath(known_safe_path)
    unsafe_path = os.path.abspath(unsafe_path)

    if (os.path.commonprefix([known_safe_path, unsafe_path]) != known_safe_path):
        raise SuspiciousFileOperation("{} is not safe".format(unsafe_path))

    # Passes the check
    return unsafe_path

def hex2rgb(hex_color, with_alpha=False):
    """
    Adapted from https://stackoverflow.com/questions/29643352/converting-hex-to-rgb-value-in-python/29643643
    """
    hex_color = hex_color.lstrip('#')
    if len(hex_color) != 6:
        if with_alpha:
            return tuple((255, 255, 255, 255))
        else:
            return tuple((255, 255, 255))
    try:
        v = tuple(int(hex_color[i:i+2], 16) for i in (0, 2, 4))
        if with_alpha:
            v += (255, )
        return v
    except ValueError:
        if with_alpha:
            return tuple((255, 255, 255, 255))
        else:
            return tuple((255, 255, 255))