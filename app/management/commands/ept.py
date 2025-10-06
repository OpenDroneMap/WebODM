import os
from django.core.management.base import BaseCommand
from app.models import Task

class Command(BaseCommand):
    requires_system_checks = []

    def add_arguments(self, parser):
        parser.add_argument("--check-all", action="store_true", required=False, default=False, help="Confirm that you want to check all tasks")
        parser.add_argument("--check-user", required=False, default=None, help="Check tasks belonging to this username")
        parser.add_argument("--threads", required=False, default=1, help="Number of threads to use for generating EPT data")

        super(Command, self).add_arguments(parser)

    def handle(self, **options):
        if options.get('check_user'):
            tasks = Task.objects.filter(project__owner__username=options.get('check_user'))
        elif options.get('check_all'):
            tasks = Task.objects.all()
        else:
            print("Specify either --check-user <username> or --check-all")
            exit(1)
        
        print("Checking %s tasks" % tasks.count())
        for t in tasks:
            if t.check_ept():
                print(str(t))
            