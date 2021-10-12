import os
from django.core.management.base import BaseCommand
import socket

class Command(BaseCommand):
    requires_system_checks = []

    def add_arguments(self, parser):
        parser.add_argument("host", type=str)
        
        super(Command, self).add_arguments(parser)

    def handle(self, **options):
        host = options.get('host')
        try:
            socket.gethostbyname(host)
            print(host)
        except:
            # Try replacing _ with "-"
            host = host.replace("_", "-")
            print(host)