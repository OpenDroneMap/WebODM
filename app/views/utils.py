from django.shortcuts import get_object_or_404
from django.http import Http404, HttpResponseRedirect
from app.models import Project, Task, Redirect
from webodm import settings
from functools import wraps

def get_permissions(user, project):
    perms = []
    for p in ["view", "change"]:
        if user.has_perm('app.%s_project' % p, project):
            perms.append(p)
    return perms


class HttpRedirect302(Exception):
    def __init__(self, to_cluster):
        self.to_cluster = to_cluster

def ResponseClusterRedirect(request, to_cluster):
    return HttpResponseRedirect((settings.CLUSTER_URL % to_cluster) + request.get_full_path())

def cluster_mode():
    return settings.CLUSTER_ID is not None

def handle_302(func):
    @wraps(func)
    def wrap(request, *args, **kwargs):
        try:
            return func(request, *args, **kwargs)
        except HttpRedirect302 as r:
            return ResponseClusterRedirect(request, r.to_cluster)
    return wrap

def get_project_or_raise(pk=None, public_id=None):
    kwargs = {}
    if pk is not None:
        kwargs['pk'] = pk
    if public_id is not None:
        kwargs['public_id'] = public_id
    
    try:
        p = get_object_or_404(Project, **kwargs)
        if cluster_mode():
            # Make sure the owner hasn't been moved
            if p.owner.profile.cluster_id is not None and p.owner.profile.cluster_id != settings.CLUSTER_ID:
                raise HttpRedirect302(p.owner.profile.cluster_id)
        return p
    except Http404 as err404:
        # Check for redirects
        if cluster_mode():
            p = {}
            if pk is not None:
                p['project_id'] = pk
            if public_id is not None:
                p['project_public_id'] = public_id

            try:
                r = Redirect.objects.get(**p)
                raise HttpRedirect302(r.owner.profile.cluster_id)
            except Redirect.DoesNotExist:
                raise err404
        else:
            raise err404

def get_task_or_raise(pk=None, project=None):
    kwargs = {}
    if pk is not None:
        kwargs['pk'] = pk
    if project is not None:
        kwargs['project'] = project
    try:
        t = get_object_or_404(Task, **kwargs)
        if cluster_mode():
            # Make sure the owner hasn't been moved
            if t.project.owner.profile.cluster_id is not None and t.project.owner.profile.cluster_id != settings.CLUSTER_ID:
                raise HttpRedirect302(t.project.owner.profile.cluster_id)
        return t
    except Http404 as err404:
        # Check for redirects
        if cluster_mode():
            try:
                r = Redirect.objects.get(task_id=pk)
                raise HttpRedirect302(r.owner.profile.cluster_id)
            except Redirect.DoesNotExist:
                raise err404
        else:
            raise err404
