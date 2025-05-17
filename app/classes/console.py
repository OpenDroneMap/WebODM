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
            with open(self.file, 'r', encoding="utf-8") as f:
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
            try:
                # Write
                if not os.path.isdir(self.base_dir):
                    os.makedirs(self.base_dir, exist_ok=True)
                
                with open(self.file, "a", encoding="utf-8") as f:
                    f.write(text)
            except IOError:
                logger.warn("Cannot append to console file: %s" % self.file)

    def reset(self, text = ""):
        if os.path.isdir(self.parent_dir):
            try:
                if not os.path.isdir(self.base_dir):
                    os.makedirs(self.base_dir, exist_ok=True)

                if os.path.isfile(self.file):
                    os.unlink(self.file)
                
                with open(self.file, "w", encoding="utf-8") as f:
                    f.write(text)
            except IOError:
                logger.warn("Cannot reset console file: %s" % self.file)

    def delink(self):
        try:
            if os.path.isfile(self.file) and os.stat(self.file).st_nlink > 1:
                with open(self.file, "r", encoding="utf-8") as f:
                    text = f.read()
                os.unlink(self.file)
                with open(self.file, "w", encoding="utf-8") as f:
                    f.write(text)
        except OSError:
            logger.warn("Cannot delink console file: %s" % self.file)
    
    def link(self, src_file):
        try:
            if not os.path.isfile(src_file):
                raise OSError("Source file does not exist")
            
            if os.path.isfile(self.file):
                os.unlink(self.file)
            
            os.link(src_file, self.file)
        except OSError:
            logger.warn("Cannot link console file: %s --> %s" % (src_file, self.file))