import logging
import shutil
import tempfile
import subprocess
import os
import geojson

from string import Template

from webodm import settings

logger = logging.getLogger('app.logger')

class GrassEngine:
    def __init__(self):
        self.grass_binary = shutil.which('grass7') or \
                            shutil.which('grass72') or \
                            shutil.which('grass74') or \
                            shutil.which('grass76')

        if self.grass_binary is None:
            logger.warning("Could not find a GRASS 7 executable. GRASS scripts will not work.")
        else:
            logger.info("Initializing GRASS engine using {}".format(self.grass_binary))

    def create_context(self, serialized_context = {}):
        if self.grass_binary is None: raise GrassEngineException("GRASS engine is unavailable")
        return GrassContext(self.grass_binary, **serialized_context)


class GrassContext:
    def __init__(self, grass_binary, tmpdir = None, template_args = {}, location = None):
        self.grass_binary = grass_binary
        if tmpdir is None:
            tmpdir = os.path.basename(tempfile.mkdtemp('_grass_engine', dir=settings.MEDIA_TMP))
        self.tmpdir = tmpdir
        self.template_args = template_args
        self.location = location

    def get_cwd(self):
        return os.path.join(settings.MEDIA_TMP, self.tmpdir)

    def add_file(self, filename, source, use_as_location=False):
        param = os.path.splitext(filename)[0] # filename without extension

        dst_path = os.path.abspath(os.path.join(self.get_cwd(), filename))
        with open(dst_path, 'w') as f:
            f.write(source)
        self.template_args[param] = dst_path

        if use_as_location:
            self.set_location(self.template_args[param])

        return dst_path

    def add_param(self, param, value):
        self.template_args[param] = value

    def set_location(self, location):
        """
        :param location: either a "epsg:XXXXX" string or a path to a geospatial file defining the location
        """
        if not location.startswith('epsg:'):
            location = os.path.abspath(location)
        self.location = location

    def execute(self, script):
        """
        :param script: path to .grass script
        :return: script output
        """
        if self.location is None: raise GrassEngineException("Location is not set")

        script = os.path.abspath(script)

        # Create grass script via template substitution
        try:
            with open(script) as f:
                script_content = f.read()
        except FileNotFoundError:
            raise GrassEngineException("Script does not exist: {}".format(script))

        tmpl = Template(script_content)

        # Write script to disk
        with open(os.path.join(self.get_cwd(), 'script.sh'), 'w') as f:
            f.write(tmpl.substitute(self.template_args))

        # Execute it
        p = subprocess.Popen([self.grass_binary, '-c', self.location, 'location', '--exec', 'sh', 'script.sh'],
                             cwd=self.get_cwd(), stdout=subprocess.PIPE, stderr=subprocess.PIPE)
        out, err = p.communicate()

        out = out.decode('utf-8').strip()
        err = err.decode('utf-8').strip()

        if p.returncode == 0:
            return out
        else:
            raise GrassEngineException("Could not execute GRASS script {} from {}: {}".format(script, self.get_cwd(), err))

    def serialize(self):
        return {
            'tmpdir': self.tmpdir,
            'template_args': self.template_args,
            'location': self.location
        }

    def __del__(self):
        # Cleanup
        if os.path.exists(self.get_cwd()):
            shutil.rmtree(self.get_cwd())

class GrassEngineException(Exception):
    pass

grass = GrassEngine()