import logging
import shutil
import tempfile
import subprocess
import os
import platform

from webodm import settings

logger = logging.getLogger('app.logger')

class GrassEngine:
    def __init__(self):
        self.grass_binary = shutil.which('grass7') or \
                            shutil.which('grass7.bat') or \
                            shutil.which('grass72') or \
                            shutil.which('grass72.bat') or \
                            shutil.which('grass74') or \
                            shutil.which('grass74.bat') or \
                            shutil.which('grass76') or \
                            shutil.which('grass76.bat') or \
                            shutil.which('grass78') or \
                            shutil.which('grass78.bat') or \
                            shutil.which('grass80') or \
                            shutil.which('grass80.bat')

        if self.grass_binary is None:
            logger.warning("Could not find a GRASS 7 executable. GRASS scripts will not work.")
        else:
            logger.info("Initializing GRASS engine using {}".format(self.grass_binary))

    def create_context(self, serialized_context = {}):
        if self.grass_binary is None: raise GrassEngineException("GRASS engine is unavailable")
        return GrassContext(self.grass_binary, **serialized_context)


class GrassContext:
    def __init__(self, grass_binary, tmpdir = None, script_opts = {}, location = None, auto_cleanup=True, python_path=None):
        self.grass_binary = grass_binary
        if tmpdir is None:
            tmpdir = os.path.basename(tempfile.mkdtemp('_grass_engine', dir=settings.MEDIA_TMP))
        self.tmpdir = tmpdir
        self.script_opts = script_opts.copy()
        self.location = location
        self.auto_cleanup = auto_cleanup
        self.python_path = python_path

    def get_cwd(self):
        return os.path.join(settings.MEDIA_TMP, self.tmpdir)

    def add_file(self, filename, source, use_as_location=False):
        param = os.path.splitext(filename)[0] # filename without extension

        dst_path = os.path.abspath(os.path.join(self.get_cwd(), filename))
        with open(dst_path, 'w') as f:
            f.write(source)
        self.script_opts[param] = dst_path

        if use_as_location:
            self.set_location(self.script_opts[param])

        return dst_path

    def add_param(self, param, value):
        self.script_opts[param] = value

    def set_location(self, location):
        """
        :param location: either a "epsg:XXXXX" string or a path to a geospatial file defining the location
        """
        if not location.lower().startswith('epsg:'):
            location = os.path.abspath(location)
        self.location = location

    def execute(self, script):
        """
        :param script: path to .grass script
        :return: script output
        """
        if self.location is None: raise GrassEngineException("Location is not set")

        script = os.path.abspath(script)

        # Make sure working directory exists
        if not os.path.exists(self.get_cwd()):
            os.mkdir(self.get_cwd())

        # Create param list
        params = ["{}={}".format(opt,value) for opt,value in self.script_opts.items()]

        # Track success, output
        success = False
        out = ""
        err = ""

        # Setup env
        env = os.environ.copy()
        env["LC_ALL"] = "C.UTF-8"
        
        if self.python_path:
            sep = ";" if platform.system() == "Windows" else ":"
            env["PYTHONPATH"] = "%s%s%s" % (self.python_path, sep, env.get("PYTHONPATH", ""))

        # Execute it
        logger.info("Executing grass script from {}: {} -c {} location --exec python3 {} {}".format(self.get_cwd(), self.grass_binary, self.location, script, " ".join(params)))
        
        command = [self.grass_binary, '-c', self.location, 'location', '--exec', 'python3', script] + params
        if platform.system() == "Windows":
            # communicate() hangs on Windows so we use check_output instead
            try:
                out = subprocess.check_output(command, cwd=self.get_cwd(), env=env).decode('utf-8').strip()
                success = True
            except:
                success = False
                err = out
        else:
            p = subprocess.Popen(command, cwd=self.get_cwd(), env=env, stdout=subprocess.PIPE, stderr=subprocess.PIPE)
            
            out, err = p.communicate()

            out = out.decode('utf-8').strip()
            err = err.decode('utf-8').strip()
            success = p.returncode == 0

        if success:
            return out
        else:
            raise GrassEngineException("Could not execute GRASS script {} from {}: {}".format(script, self.get_cwd(), err))

    def serialize(self):
        return {
            'tmpdir': self.tmpdir,
            'script_opts': self.script_opts,
            'location': self.location,
            'auto_cleanup': self.auto_cleanup,
            'python_path': self.python_path,
        }

    def cleanup(self):
        if os.path.exists(self.get_cwd()):
            shutil.rmtree(self.get_cwd())

    def __del__(self):
        if self.auto_cleanup:
            self.cleanup()

class GrassEngineException(Exception):
    pass

def cleanup_grass_context(serialized_context):
    ctx = grass.create_context(serialized_context)
    ctx.cleanup()

grass = GrassEngine()
