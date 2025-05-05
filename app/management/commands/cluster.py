import os
import json
import math
from django.core.management.base import BaseCommand
from django.core.management import call_command
from app.models import Project
from webodm import settings
from django.db import connection


class Command(BaseCommand):
    requires_system_checks = []

    def add_arguments(self, parser):
        parser.add_argument("action", type=str, choices=['stagger', 'getref'])
        parser.add_argument("--refs", required=False, help="JSON array of reference dictionaries")
        parser.add_argument("--id-buffer", required=False, default=1000, help="ID increment buffer when assigning next seq IDs")
        parser.add_argument("--dry-run", required=False, action="store_true", help="Don't actually modify tables, just test")
        
        
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



            
            

