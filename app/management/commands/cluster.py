import os
import json
import math
import shutil
from django.core.management.base import BaseCommand
from django.core.management import call_command
from app.models import Project, Task, Preset, PluginDatum, Redirect
from webodm import settings
from django.db import connection
from django.contrib.auth.models import User
from django.core import serializers
from guardian.shortcuts import get_users_with_perms
from django.db import transaction

class DryRunException(Exception):
    pass

def die(msg):
    print(msg)
    exit(1)

def serialize(obj):
    data = json.loads(serializers.serialize("json", [obj]))[0]
    f = data['fields']

    model = data['model']
    if model == "app.project":
        f['owner'] = "_"
        data['permissions'] = []
        perms = get_users_with_perms(obj, attach_perms=True, with_group_users=False)
        for user in perms:
            if user.id == obj.owner.id:
                data['permissions'] = perms[user]
                assert len(data['permissions']) == 4, "Default permissions, other combinations should never happen"
            else:
                print(f"Warning! Permissions for [{obj.name}] ({obj.id}) are related to \"{user.username}\" which is not going to be exported.")
    elif model == "app.task":
        f['processing_node'] = None
    elif model == "app.profile":
        data['pk'] = None
        f['user'] = '_'
    elif model == "auth.user":
        data['pk'] = None
    elif model == "app.preset":
        data['pk'] = None
        f['owner'] = '_'
    elif model == "app.plugindatum":
        data['pk'] = None
        f['user'] = '_'
    else:
        raise Exception("Unknown model: %s" % model)
    
    return data

def deserialize(data, username=None, user=None):
    model = data['model']
    f = data['fields']

    if model != 'auth.user':
        if user is None:
            raise Exception("user expected")

    if model == 'auth.user':
        if username is None:
            raise Exception("username expected")
        if f['username'] != username:
            print("Importing exported user %s as %s" % (f['username'], username))
            f['username'] = username
    elif model == 'app.profile':
        data['pk'] = user.profile.id
        f['user'] = int(user.id)
    elif model == 'app.preset':
        f['owner'] = int(user.id)
    elif model == 'app.plugindatum':
        f['user'] = int(user.id)
    elif model == 'app.project':
        f['owner'] = int(user.id)
    elif model == 'app.task':
        pass
    else:
        raise Exception("Unknown model: %s" % model)

    obj = next(serializers.deserialize("json", json.dumps([data])))

    return obj


def importexport_user(action, username, dry_run=False, cluster_export_dir=None, merge=False):
    if action != "import" and action != "export":
        die("Invalid action")

    if dry_run:
        print("!!! Dry run !!!")

    def make_dir(d):
        if not os.path.isdir(d):
            print("Creating %s" % d)
            if not dry_run:
                os.makedirs(d)
        else:
            print("Dir exists: %s" % d)
    
    def remove_dir(d):
        if os.path.isdir(d):
            print("Removing %s" % d)
            if not dry_run:
                shutil.rmtree(d)
    
    def list_safe(d):
        if os.path.isdir(d):
            return os.listdir(d)
        else:
            return []
    
    def copy_dir(src, dst):
        if os.path.isdir(src):
            print("Copying %s --> %s" % (src, dst))
            if not dry_run:
                shutil.copytree(src, dst)
        else:
            print("Skipping %s (does not exist)" % src)

    def move_dir(src, dst, check_dst=True):
        if os.path.isdir(src):
            print("Moving %s --> %s" % (src, dst))
            if not dry_run:
                shutil.move(src, dst)
        else:
            print("Skipping %s (does not exist)" % src)
    

    if cluster_export_dir is None:
        cluster_export_dir = os.path.join(settings.MEDIA_ROOT, "cluster_migrations")

    media_project_dir = os.path.join(settings.MEDIA_ROOT, "project")
    print("Cluster export directory: %s" % cluster_export_dir)
    print("Media project directory: %s" % media_project_dir)

    if action == "export":
        print("Exporting")
        try:
            user = User.objects.get(username=username)
        except User.DoesNotExist:
            die("User does not exist")
        
        print("User: %s" % user.username)
        user_export_dir = os.path.join(cluster_export_dir, str(user.username))
        projects_export_dir = os.path.join(user_export_dir, "projects")
        
        make_dir(cluster_export_dir)
        make_dir(user_export_dir)
        make_dir(projects_export_dir)
        
        print("User export directory: %s" % user_export_dir)
        print("Projects export directory: %s" % projects_export_dir)

        # Get list of projects for this user
        user_projects = Project.objects.filter(owner=user).order_by('created_at')
        user_tasks = Task.objects.filter(project__owner=user).order_by('created_at')
        user_presets = Preset.objects.filter(owner=user, system=False).order_by('created_at')
        user_plugindatum = PluginDatum.objects.filter(user=user).order_by('id')

        print("Total projects: %s" % len(user_projects))
        print([p.id for p in user_projects])

        print("Total tasks: %s" % len(user_tasks))
        print("Total presets: %s" % len(user_presets))
        print("Total plugin data: %s" % len(user_plugindatum))
        

        if len(list_safe(projects_export_dir)) > 0:
            print("Export directory not empty, removing/recreating")
            remove_dir(projects_export_dir)
            make_dir(projects_export_dir)
        
        db = {
            'version': settings.VERSION,
            'projects': [serialize(p) for p in user_projects],
            'tasks': [serialize(t) for t in user_tasks],
            'profile': serialize(user.profile),
            'user': serialize(user),
            'presets': [serialize(p) for p in user_presets],
            'plugin_datum': [serialize(pd) for pd in user_plugindatum]
        }

        db_dump_file = os.path.join(user_export_dir, "db.json")
        db_dump = json.dumps(db)
        
        print("Writing %s" % db_dump_file)
        if not dry_run:
            with open(db_dump_file, "w", encoding="utf-8") as f:
                f.write(db_dump)
        
        # Copy all project folders (note some do not exist)
        for p in user_projects:
            copy_dir(p.get_project_dir(), os.path.join(projects_export_dir, str(p.id)))

    elif action == "import":
        print("Importing")
        username = username.replace("..", "").replace("/", "")
        try:
            user = User.objects.get(username=username)
        except User.DoesNotExist:
            user = None
        
        print("User: %s%s" % (username, " [EXISTS]" if user is not None else " [NEW]"))
        if user is not None and not merge:
            die("Pass --merge to attempt to merge imported results with an existing user")

        user_import_dir = os.path.join(cluster_export_dir, username)
        projects_import_dir = os.path.join(user_import_dir, "projects")

        for d in [cluster_export_dir, user_import_dir]:
            if not os.path.isdir(d):
                die("%s does not exist" % d)
        
        db_dump_file = os.path.join(user_import_dir, "db.json")
        with open(db_dump_file, "r", encoding="utf-8") as f:
            db = json.loads(f.read())
        
        print("Version: %s" % db['version'])
        print("Projects: %s" % len(db['projects']))
        print("Tasks: %s" % len(db['tasks']))
        print("Presets: %s" % len(db['presets']))
        print("Plugin Datum: %s" % len(db['plugin_datum']))
        for k in ['profile', 'user']:
            if k in db:
                print("%s: yes" % k.capitalize())
            else:
                die("Missing key '%s'" % k)
        
        if db['version'] != settings.VERSION:
            die("Version mismatch: %s vs %s" % (db['version'], settings.VERSION))

        # Validate project directories
        project_ids = list_safe(projects_import_dir)
        print("Project folders: %s" % len(project_ids))

        for pid in project_ids:
            if os.path.isdir(os.path.join(media_project_dir, pid)):
                print("Cannot import project %s because it conflicts with an existing project directory in %s" % (pid, media_project_dir))
                if not dry_run:
                    exit(1)
        
        # User

        imp_user = deserialize(db['user'], username=username)
        
        if user is not None:
            assert user.pk == imp_user.object.pk
            assert user.username == imp_user.object.username
        else:
            assert User.objects.filter(pk=imp_user.object.pk).count() == 0
        
        try:
            with transaction.atomic():
                print("Importing user")
                imp_user.save()
                if user is None:
                    user = User.objects.get(pk=imp_user.object.pk)

                print("Importing profile")
                profile = deserialize(db['profile'], user=user)
                profile.save()

                existing_presets = Preset.objects.filter(owner=user, system=False)
                if existing_presets.count() > 0:
                    print("Deleting %s existing presets" % existing_presets.count())
                    existing_presets.delete()

                print("Importing presets")
                for preset in db['presets']:
                    p = deserialize(preset, user=user)
                    p.save()


                existing_pd = PluginDatum.objects.filter(user=user)
                if existing_pd.count() > 0:
                    print("Deleting %s existing plugin datum" % existing_pd.count())
                    existing_pd.delete()

                print("Importing plugin datum")
                for pd in db['plugin_datum']:
                    pd = deserialize(pd, user=user)
                    pd.save()

                print("Importing projects")
                for project in db['projects']:
                    try:
                        existing_project = Project.objects.get(pk=project['pk'])
                        if existing_project.owner.username == user.username:
                            print("Overriding existing project")
                        else:
                            print("Cannot import project %s because a project with the same ID already exists and is owned by a different user (%s)" % (project['pk'], existing_project.owner.username))
                            raise Exception("Project import failed")
                    except Project.DoesNotExist:
                        pass
                    
                    permissions = project['permissions']
                    del project['permissions']
                    
                    p = deserialize(project, user=user)
                    p.save()
                    p = Project.objects.get(pk=p.object.pk)

                    # Quick check, the owner should have default permissions
                    # to the project
                    for perm in permissions:
                        assert user.has_perm(perm, p)

                    # Remove redirects
                    Redirect.objects.filter(project_id=p.id).delete()
                
                    print("[%s] (%s)" % (str(p), p.id))
                
                print("Importing tasks")
                for task in db['tasks']:
                    t = deserialize(task, user=user)
                    t.save()

                    # Remove redirects
                    Redirect.objects.filter(task_id=t.object.pk).delete()
                
                    print("%s (%s)" % (str(t.object), t.object.project.id))

                if dry_run:
                    raise DryRunException()
        except DryRunException:
            print("Dry run, rolling back")

        # Move projects from import folder
        for pid in project_ids:
            src = os.path.join(projects_import_dir, pid)
            dst = os.path.join(media_project_dir, pid)
            move_dir(src, dst)
        
        # Cleanup
        remove_dir(user_import_dir)

def redirect(username, to_cluster, dry_run=False, delete_projects_tasks=False):
    if settings.CLUSTER_ID == to_cluster:
        die("Cannot redirect to itself (this server's cluster ID is %s)" % to_cluster)

    try:
        user = User.objects.get(username=username)
    except User.DoesNotExist:
        die("User does not exist")

    try:
        with transaction.atomic():
            user.profile.cluster_id = to_cluster
            user.profile.save()

            print ("Saved user profile cluster ID (%s)" % to_cluster)

            if dry_run:
                raise DryRunException()
    except DryRunException:
        print("Dry run, rolling back")

    if delete_projects_tasks:
        print("Setting up redirects for: %s" % user.username)
        user_projects = Project.objects.filter(owner=user).order_by('created_at')
        user_tasks = Task.objects.filter(project__owner=user).order_by('created_at')
        
        print("Target cluster: %s" % to_cluster)
        print("Projects: %s" % len(user_projects))
        print("Tasks: %s" % len(user_tasks))

        try:
            count = 0
            with transaction.atomic():
                for p in user_projects:
                    Redirect.objects.create(project_id=p.id, project_public_id=p.public_id, owner=p.owner)
                    count += 1
                for t in user_tasks:
                    Redirect.objects.create(task_id=t.id, owner=t.project.owner)
                    count += 1

                print("Setup %s redirects" % count)

                for p in user_projects:
                    if not dry_run:
                        try:
                            p.delete()
                        except Exception as e:
                            print("Cannot delete project %s: %s" % (p.id, str(e)))
                    else:
                        print("Deleting project %s (dry run)" % (p.id))

                if dry_run:
                    raise DryRunException()
        except DryRunException:
            print("Dry run, rolling back")



class Command(BaseCommand):
    requires_system_checks = []

    def add_arguments(self, parser):
        parser.add_argument("action", type=str, choices=['stagger', 'getref', 'export', 'import', 'redirect', 'delete'])
        parser.add_argument("--refs", required=False, help="JSON array of reference dictionaries")
        parser.add_argument("--id-buffer", required=False, default=1000, help="ID increment buffer when assigning next seq IDs")
        parser.add_argument("--dry-run", required=False, action="store_true", help="Don't actually modify tables, just test")
        parser.add_argument("--user", required=False, default=None, help="User ID to migrate")
        parser.add_argument("--cluster-export-dir", required=False, default=None, help="Override default export cluster dir")
        parser.add_argument("--merge", required=False, action="store_true", help="Try to merge imported results for a user if the user already exist")
        parser.add_argument("--delete", required=False, action="store_true", help="Permanently delete user projects and tasks after setting up redirect")
        parser.add_argument("--to-cluster", required=False, default=-1, help="Cluster ID to redirect to")
                
        super(Command, self).add_arguments(parser)

    def handle(self, **options):
        dry_run = options.get('dry_run', False)
        action = options.get('action')

        if action == 'stagger':
            if settings.CLUSTER_ID is None:
                die("CLUSTER_ID is not set")

            refs = json.loads(options.get('refs'))
            id_buffer = int(options.get('id_buffer'))

            if not isinstance(refs, list):
                die("Invalid refs, must be an array")
            if len(refs) <= 1:
                die("Invalid refs, must have 2 or more items")
            
            max_project_id = max([r['next_project_id'] for r in refs])
            start_project_id = max_project_id + id_buffer
            start_project_id = math.ceil(start_project_id / id_buffer) * id_buffer
            start_project_id += (settings.CLUSTER_ID - 1)
            increment_by = len(refs)

            print("Number of clusters/increment: %s" % increment_by)
            print("Max project ID: %s" % max_project_id)
            print("New start project ID: %s" % start_project_id)

            project_sql = "ALTER SEQUENCE app_project_id_seq RESTART WITH %s INCREMENT BY %s;" % (start_project_id, increment_by)
            print(project_sql)

            if not dry_run:
                with connection.cursor() as c:
                    c.execute(project_sql)
                print("Done!")
            else:
                print("Dry run, not executing")


        elif action == 'getref':
            if settings.CLUSTER_ID is None:
                die("CLUSTER_ID is not set")

            with connection.cursor() as c:
                c.execute("SELECT last_value FROM app_project_id_seq")
                next_project_id = c.fetchone()[0]

                ref = {
                    'cluster_id': settings.CLUSTER_ID,
                    'next_project_id': next_project_id,
                }

                print(json.dumps(ref))


        elif action == 'export' or action == 'import':
            user = options.get('user')
            if user is None:
                die("--user <username> is required")
            importexport_user(action, user, dry_run=dry_run, cluster_export_dir=options.get('cluster_export_dir'), merge=options.get('merge'))
        
        elif action == 'redirect':
            user = options.get('user')
            if user is None:
                die("--user <username> is required")
            to_cluster = options.get('to_cluster')
            if to_cluster is None or to_cluster == -1:
                die("--to-cluster <id> is required")
            to_cluster = int(to_cluster)
            redirect(user, to_cluster, dry_run=dry_run, delete_projects_tasks=options.get('delete', False))
        else:
            print("Invalid action %s" % options.get('action'))
            
            

