import os
import logging
logger = logging.getLogger('app.logger')

class Console:
    def __init__(self, file):
        self.file = file
        self.base_dir = os.path.dirname(self.file)
        self.parent_dir = os.path.dirname(self.base_dir)

    def __repr__(self):
        return "<Console output: %s>" % self.file

    def __str__(self):
        if not os.path.isfile(self.file):
            return ""

        try:
            with open(self.file, 'r') as f:
                return f.read()
        except IOError:
            logger.warn("Cannot read console file: %s" % self.file)
            return ""

    def __add__(self, other):
        self.append(other)
        return self

    def output(self):
        return str(self)

    def append(self, text):
        if os.path.isdir(self.parent_dir):
            # Write
            if not os.path.isdir(self.base_dir):
                os.makedirs(self.base_dir, exist_ok=True)

            with open(self.file, "a") as f:
                f.write(text)
    
    def reset(self, text = ""):
        if os.path.isdir(self.parent_dir):
            if not os.path.isdir(self.base_dir):
                os.makedirs(self.base_dir, exist_ok=True)

            with open(self.file, "w") as f:
                f.write(text)

