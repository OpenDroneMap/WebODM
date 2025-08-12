import os
import json
import math
import shutil
from django.core.management.base import BaseCommand
from django.core.management import call_command
from app.models import Project, Task, Preset, PluginDatum
from webodm import settings
from django.db import connection
from django.contrib.auth.models import User
from django.core import serializers
from guardian.shortcuts import get_users_with_perms

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
    
    return data

def export_user(user_id, dry_run=False, cluster_export_dir=None):
    try:
        user = User.objects.get(pk=user_id)
    except User.DoesNotExist:
        die("User ID does not exist")

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
                
    print("Exporting user: %s" % user.username)

    if cluster_export_dir is None:
        cluster_export_dir = os.path.join(settings.MEDIA_ROOT, "cluster_migrations")
    user_export_dir = os.path.join(cluster_export_dir, str(user.username))
    projects_export_dir = os.path.join(user_export_dir, "projects")

    print("Cluster export directory: %s" % cluster_export_dir)
    
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



class Command(BaseCommand):
    requires_system_checks = []

    def add_arguments(self, parser):
        parser.add_argument("action", type=str, choices=['stagger', 'getref', 'export', 'import'])
        parser.add_argument("--refs", required=False, help="JSON array of reference dictionaries")
        parser.add_argument("--id-buffer", required=False, default=1000, help="ID increment buffer when assigning next seq IDs")
        parser.add_argument("--dry-run", required=False, action="store_true", help="Don't actually modify tables, just test")
        parser.add_argument("--user", required=False, default=None, help="User ID to migrate")
        parser.add_argument("--cluster-export-dir", required=False, default=None, help="Override default export cluster dir")
        
        
        super(Command, self).add_arguments(parser)

    def handle(self, **options):
        if settings.CLUSTER_ID is None:
            print("CLUSTER_ID is not set")
            exit(1)

        dry_run = options.get('dry_run', False)

        if options.get('action') == 'stagger':
            refs = json.loads(options.get('refs'))
            id_buffer = int(options.get('id_buffer'))

            if not isinstance(refs, list):
                print("Invalid refs, must be an array")
                exit(1)
            if len(refs) <= 1:
                print("Invalid refs, must have 2 or more items")
                exit(1)
            
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


        elif options.get('action') == 'getref':
            with connection.cursor() as c:
                c.execute("SELECT last_value FROM app_project_id_seq")
                next_project_id = c.fetchone()[0]

                ref = {
                    'cluster_id': settings.CLUSTER_ID,
                    'next_project_id': next_project_id,
                }

                print(json.dumps(ref))


        elif options.get('action') == 'export':
            user_id = options.get('user')
            if user_id is None:
                print("--user <USER_ID> is required")
                exit(1)
            print(options.get('cluster_export_dir'))
            export_user(user_id, dry_run=dry_run, cluster_export_dir=options.get('cluster_export_dir'))
        else:
            print("Invalid action %s" % options.get('action'))
            
            

