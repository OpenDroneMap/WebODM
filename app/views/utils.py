def get_permissions(user, project):
    perms = []
    for p in ["view", "change"]:
        if user.has_perm('app.%s_project' % p, project):
            perms.append(p)
    return perms