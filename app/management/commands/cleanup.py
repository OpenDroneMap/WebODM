import os
import shutil
from django.core.management.base import BaseCommand
from django.core.management import call_command
from app.models import Project
from webodm import settings

class Command(BaseCommand):
    requires_system_checks = []

    def add_arguments(self, parser):
        parser.add_argument("action", type=str, choices=['projects'])
        parser.add_argument("--dry-run", action='store_true', required=False, help="Don't actually delete folders")
        parser.add_argument("--only-empty", action='store_true', required=False, help="Only delete folders if there's no data")
        
        super(Command, self).add_arguments(parser)

    def handle(self, **options):
        if options.get('action') == 'projects':
            projects_root = os.path.join(settings.MEDIA_ROOT, "project")

            print("Enumerating orphaned project folders")
            db_project_ids = {p.id for p in Project.objects.all()}
            fs_project_ids = {int(i) for i in os.listdir(projects_root) if i.isnumeric()}

            print(f"Filesystem: {len(fs_project_ids)}")
            print(f"Database: {len(db_project_ids)}")

            orphaned_ids = fs_project_ids - db_project_ids

            def rm(folder):
                if not options.get('dry_run'):
                    try:
                        shutil.rmtree(folder)
                        print(f"R {folder}")
                    except Exception as e:
                        print(f"Error while removing {folder}: {str(e)}")
                else:
                    print(f"R {folder}")

            for orphaned_id in orphaned_ids:
                orphaned_folder = os.path.join(settings.MEDIA_ROOT, "project", str(orphaned_id))

                if options.get('only_empty'):
                    entries = os.listdir(orphaned_folder)
                    if len(entries) == 0:
                        rm(orphaned_folder)
                    elif len(entries) == 1 and entries[0] == "task":
                        task_entries = os.listdir(os.path.join(orphaned_folder, "task"))
                        if len(task_entries) == 0:
                            rm(orphaned_folder)
                        else:
                            print(f"WARNING: orphaned folder with data inside: {orphaned_folder}")
                    else:
                        print(f"WARNING: orphaned folder with data inside: {orphaned_folder}")
                else:
                    rm(orphaned_folder)
                
        else:
            print("Invalid action")
                

