import logging, os, sys
from abc import ABC, abstractmethod

logger = logging.getLogger('app.logger')

class PluginBase(ABC):
    def __init__(self):
        self.name = self.get_module_name().split(".")[-2]

    @abstractmethod
    def register(self):
        pass

    def get_path(self, *paths):
        """
        Gets the path of the directory of the plugin, optionally chained with paths
        :return: path
        """
        return os.path.join(os.path.dirname(sys.modules[self.get_module_name()].__file__), *paths)

    def get_name(self):
        return self.name

    def get_module_name(self):
        return self.__class__.__module__

    def get_include_js_urls(self):
        return ["/plugins/{}/{}".format(self.get_name(), js_file) for js_file in self.include_js_files()]

    def has_public_path(self):
        return os.path.isdir(self.get_path("public"))

    def include_js_files(self):
        """
        Should be overriden by plugins to communicate
        which JS files should be included in the WebODM interface
        All paths are relative to a plugin's /public folder.
        """
        return []

    def __str__(self):
        return "[{}]".format(self.get_module_name())