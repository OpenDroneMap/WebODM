import os
import shutil
import glob
from django.core.management.base import BaseCommand
from app.plugins import build_plugins

def cleanup():
    # Delete all node_modules and build directories within plugins' public/ folders
    root = os.path.abspath(os.path.join(os.path.dirname(os.path.abspath(__file__)), "..", "..", ".."))
    for d in glob.glob(os.path.join(root, "coreplugins", "**", "public", "node_modules")):
        shutil.rmtree(d)
        print("R\t" + d)
    for d in glob.glob(os.path.join(root, "coreplugins", "**", "public", "build")):
        shutil.rmtree(d)
        print("R\t" + d)

    print("Cleanup done!")

class Command(BaseCommand):
    requires_system_checks = []
    
    def add_arguments(self, parser):
        super(Command, self).add_arguments(parser)

    def handle(self, **options):
        cleanup()
        build_plugins()