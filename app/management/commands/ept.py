import os
from django.core.management.base import BaseCommand
from app.models import Task

class Command(BaseCommand):
    requires_system_checks = []

    def add_arguments(self, parser):
        parser.add_argument("--all", action="store_true", required=False, default=False, help="Confirm that you want to check all tasks")
        parser.add_argument("--user", required=False, default=None, help="Check tasks belonging to this username")
        parser.add_argument("--threads", type=int, required=False, default=1, help="Number of threads to use for generating EPT data")

        super(Command, self).add_arguments(parser)

    def handle(self, **options):
        if options.get('user'):
            tasks = Task.objects.filter(project__owner__username=options.get('user'))
        elif options.get('all'):
            tasks = Task.objects.all()
        else:
            print("Specify either --user <username> or --all")
            exit(1)
        
        print("Checking %s tasks" % tasks.count())

        count = 0
        for t in tasks:
            if t.check_ept(threads=options.get('threads')):
                print(str(t))
                count += 1
        
        print("Built %s EPT" % count)
            