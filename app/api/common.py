from django.core.exceptions import ObjectDoesNotExist
from rest_framework import exceptions

from app import models


def get_and_check_project(request, project_pk, perms=('view_project',)):
    '''
    Retrieves a project and raises an exeption if the current user
    has no access to it.
    '''
    try:
        project = models.Project.objects.get(pk=project_pk, deleting=False)
        for perm in perms:
            if not request.user.has_perm(perm, project): raise ObjectDoesNotExist()
    except ObjectDoesNotExist:
        raise exceptions.NotFound()
    return project


def get_tiles_json(name, tiles, bounds):
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