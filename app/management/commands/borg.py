import os
from django.core.management.base import BaseCommand
from django.core.management import call_command
from app.models import Project
from webodm import settings

class Command(BaseCommand):
    requires_system_checks = []

    def add_arguments(self, parser):
        parser.add_argument("action", type=str, choices=['mediapattern'])
        parser.add_argument("--skip-images", action='store_true', required=False, help="Skip images")
        parser.add_argument("--skip-no-quotas", action='store_true', required=False, help="Skip directories owned by users with no quota (0)")
        parser.add_argument("--skip-tiles", action='store_true', required=False, help="Skip tiled assets which can be regenerated from other data")
        parser.add_argument("--skip-legacy-textured-models", action='store_true', required=False, help="Skip textured models in OBJ format")
        
        super(Command, self).add_arguments(parser)

    def handle(self, **options):
        if options.get('action') == 'mediapattern':
            print("# BorgBackup pattern file for media directory")
            print("# Generated with WebODM")
            print("")

            print("# Skip anything but project folder")
            for d in os.listdir(settings.MEDIA_ROOT):
                if d != "project":
                    print(f"! {d}")
            
            if options.get('skip_no_quotas'):
                skip_projects = Project.objects.filter(owner__profile__quota=0).order_by('id')
            else:
                skip_projects = []

            print("")
            print("# Skip projects")
            for sp in skip_projects:
                print("! " + os.path.join("project", str(sp.id)))

            if options.get('skip_images'):
                print("")
                print("# Skip images/other files")
                print("- project/*/task/*/*.*")
            
            if options.get('skip_tiles'):
                print("")
                print("# Skip entwine/potree folders")
                print("! project/*/task/*/assets/entwine_pointcloud")
                print("! project/*/task/*/assets/potree_pointcloud")
                print("")
                print("# Skip tiles folders")
                print("! project/*/task/*/assets/*_tiles")
            
            print("# Skip data")
            print("! project/*/task/*/data")

            if options.get('skip_legacy_textured_models'):
                print("")
                print("# Skip OBJ texture model files")
                print("+ project/*/task/*/assets/odm_texturing/*.glb")
                print("- project/*/task/*/assets/odm_texturing")
                

