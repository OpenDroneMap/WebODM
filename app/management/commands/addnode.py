import os
from django.core.management.base import BaseCommand
from nodeodm.models import ProcessingNode

class Command(BaseCommand):
    requires_system_checks = []

    def add_arguments(self, parser):
        parser.add_argument("host", type=str)
        parser.add_argument("port", type=int)
        parser.add_argument("--label", type=str, required=False, default="", help="Node label")
        parser.add_argument("--token", type=str, required=False, default="", help="Node token")
        
        super(Command, self).add_arguments(parser)

    def handle(self, **options):
        ProcessingNode.objects.update_or_create(hostname=options.get('host'), 
                defaults={
                    'hostname': options.get('host'), 
                    'port': options.get('port'), 
                    'label': options.get('label', ''),
                    'token': options.get('token', '')
                })